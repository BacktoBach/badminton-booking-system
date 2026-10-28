import { pool } from "../database/pool.js";
import type { PoolClient } from "pg";
import { env } from "../config/env.js";
import {
  isPostgresError,
  isPostgresErrorCode,
} from "../database/postgres-error.js";
import { withTransaction } from "../database/transaction.js";
import { AppError } from "../errors/app-error.js";
import {
  countClassEnrollments,
  deleteEnrollment,
  enrollmentExists,
  findClassForUpdate,
  findClassWithCount,
  insertEnrollment,
  listUserEnrollments,
} from "../models/enrollment.model.js";
import type { ClassWithCountRow } from "../types/class.js";
import type {
  EnrollmentClass,
  EnrollmentListQuery,
} from "../types/enrollment.js";
import { toPublicClass } from "../utils/class-serializer.js";
import { createPaginationMeta } from "../utils/pagination.js";
import { newPaymentCode, PAYMENT_TTL_MINUTES } from "./payment.service.js";
import { enqueueEnrollmentConfirmation } from "./email-outbox.service.js";

const mapEnrollmentDatabaseError = (error: unknown): never => {
  if (isPostgresErrorCode(error, "23505")) {
    throw new AppError(
      409,
      "DUPLICATE_ENROLLMENT",
      "You are already enrolled in this class",
    );
  }
  if (isPostgresError(error) && error.code === "P0001") {
    if (error.message === "CLASS_FULL") {
      throw new AppError(
        409,
        "CLASS_FULL",
        "This class has reached its maximum capacity",
      );
    }
    if (error.message === "CLASS_ALREADY_STARTED") {
      throw new AppError(
        409,
        "CLASS_ALREADY_STARTED",
        "This class has already started",
      );
    }
    if (error.message === "CLASS_CANCELLED") {
      throw new AppError(
        409,
        "CLASS_CANCELLED",
        "This class has been cancelled",
      );
    }
  }
  throw error;
};

const requireLockedClass = async (
  classId: string,
  client: Parameters<typeof findClassForUpdate>[0],
) => {
  const classRecord = await findClassForUpdate(client, classId);
  if (!classRecord)
    throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
  return classRecord;
};

export const enrollInClassInTransaction = async (
  classId: string,
  userId: string,
  client: PoolClient,
) => {
  try {
    const classRecord = await requireLockedClass(classId, client);
    const cancellation = await client.query(
      "SELECT cancelled_at FROM classes WHERE id = $1",
      [classId],
    );
    if (cancellation.rows[0]?.cancelled_at) {
      throw new AppError(
        409,
        "CLASS_CANCELLED",
        "This class has been cancelled",
      );
    }
    if (classRecord.start_date.getTime() <= Date.now()) {
      throw new AppError(
        409,
        "CLASS_ALREADY_STARTED",
        "This class has already started",
      );
    }
    if (await enrollmentExists(client, classId, userId)) {
      throw new AppError(
        409,
        "DUPLICATE_ENROLLMENT",
        "You are already enrolled in this class",
      );
    }
    const currentStudents = await countClassEnrollments(client, classId);
    if (currentStudents >= classRecord.max_students) {
      throw new AppError(
        409,
        "CLASS_FULL",
        "This class has reached its maximum capacity",
      );
    }
    if (classRecord.tuition_vnd > 0) {
      if (!env.SEPAY_ENABLED) {
        throw new AppError(503, "PAYMENT_DISABLED", "Payment is unavailable");
      }
      const code = newPaymentCode();
      await client.query(
        `INSERT INTO enrollments
             (class_id, user_id, payment_status, amount_vnd, payment_code, payment_expires_at)
           VALUES ($1, $2, 'pending', $3, $4, NOW() + INTERVAL '15 minutes')
           ON CONFLICT (class_id, user_id) DO UPDATE
           SET payment_status = 'pending', amount_vnd = EXCLUDED.amount_vnd,
               payment_code = EXCLUDED.payment_code, payment_expires_at = EXCLUDED.payment_expires_at,
               paid_at = NULL, provider_reference = NULL
           WHERE enrollments.payment_status <> 'paid'
             AND NOT (enrollments.payment_status = 'pending' AND enrollments.payment_expires_at > NOW())`,
        [classId, userId, classRecord.tuition_vnd, code],
      );
    } else {
      await insertEnrollment(client, classId, userId);
      await enqueueEnrollmentConfirmation(client, classId, userId);
    }
    const updatedClass = await findClassWithCount(client, classId);
    if (!updatedClass)
      throw new Error("Enrolled class disappeared inside transaction");
    return {
      ...toPublicClass(updatedClass),
      ...(classRecord.tuition_vnd > 0
        ? {
            payment: {
              classId,
              status: "pending" as const,
              expiresInMinutes: PAYMENT_TTL_MINUTES,
            },
          }
        : {}),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    return mapEnrollmentDatabaseError(error);
  }
};

export const enrollInClass = async (classId: string, userId: string) =>
  withTransaction((client) =>
    enrollInClassInTransaction(classId, userId, client),
  );

export const cancelClassEnrollment = async (
  classId: string,
  userId: string,
) => {
  const result = await withTransaction(async (client) => {
    const classRecord = await requireLockedClass(classId, client);
    const cancellation = await client.query(
      "SELECT cancelled_at FROM classes WHERE id = $1",
      [classId],
    );
    if (cancellation.rows[0]?.cancelled_at)
      throw new AppError(
        409,
        "CLASS_CANCELLED",
        "This class has been cancelled",
      );
    if (classRecord.start_date.getTime() <= Date.now()) {
      throw new AppError(
        409,
        "CLASS_ALREADY_STARTED",
        "Cannot cancel enrollment for a class that has already started",
      );
    }
    if (classRecord.start_date.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      throw new AppError(
        409,
        "CANCELLATION_DEADLINE_PASSED",
        "Enrollment can only be cancelled at least 24 hours before the class starts",
      );
    }
    const payment = await client.query<{
      amount_vnd: number;
      payment_status: string;
    }>(
      "SELECT amount_vnd, payment_status FROM enrollments WHERE class_id = $1 AND user_id = $2 FOR UPDATE",
      [classId, userId],
    );
    if (
      payment.rows[0]?.amount_vnd &&
      payment.rows[0].payment_status === "paid"
    ) {
      throw new AppError(
        409,
        "MANUAL_REFUND_REQUIRED",
        "Contact an administrator to cancel a paid enrollment",
      );
    }
    if (!(await deleteEnrollment(client, classId, userId))) {
      throw new AppError(
        404,
        "ENROLLMENT_NOT_FOUND",
        "Enrollment was not found",
      );
    }
    const updatedClass = await findClassWithCount(client, classId);
    if (!updatedClass) throw new Error("Class disappeared inside transaction");
    return toPublicClass(updatedClass);
  });
  const { promoteAvailableWaitlists } = await import("./waitlist.service.js");
  try {
    await promoteAvailableWaitlists();
  } catch (error) {
    console.error(
      "Enrollment was cancelled but waitlist promotion failed",
      error,
    );
  }
  return result;
};

export const getMyEnrollments = async (
  userId: string,
  query: EnrollmentListQuery,
) => {
  const result = await listUserEnrollments(pool, userId, query);
  const classes: EnrollmentClass[] = result.rows.map((record) => ({
    ...toPublicClass(record as ClassWithCountRow),
    enrolledAt: record.enrolled_at.toISOString(),
  }));
  return {
    classes,
    meta: createPaginationMeta(query.page, query.limit, result.total),
  };
};
