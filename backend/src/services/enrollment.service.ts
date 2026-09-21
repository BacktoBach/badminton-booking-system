import { pool } from "../database/pool.js";
import { isPostgresError, isPostgresErrorCode } from "../database/postgres-error.js";
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
import type { EnrollmentClass, EnrollmentListQuery } from "../types/enrollment.js";
import { toPublicClass } from "../utils/class-serializer.js";
import { createPaginationMeta } from "../utils/pagination.js";

const mapEnrollmentDatabaseError = (error: unknown): never => {
  if (isPostgresErrorCode(error, "23505")) {
    throw new AppError(409, "DUPLICATE_ENROLLMENT", "You are already enrolled in this class");
  }
  if (isPostgresError(error) && error.code === "P0001") {
    if (error.message === "CLASS_FULL") {
      throw new AppError(409, "CLASS_FULL", "This class has reached its maximum capacity");
    }
    if (error.message === "CLASS_ALREADY_STARTED") {
      throw new AppError(409, "CLASS_ALREADY_STARTED", "This class has already started");
    }
  }
  throw error;
};

const requireLockedClass = async (classId: string, client: Parameters<typeof findClassForUpdate>[0]) => {
  const classRecord = await findClassForUpdate(client, classId);
  if (!classRecord) throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
  return classRecord;
};

export const enrollInClass = async (classId: string, userId: string) => {
  try {
    return await withTransaction(async (client) => {
      const classRecord = await requireLockedClass(classId, client);
      if (classRecord.start_date.getTime() <= Date.now()) {
        throw new AppError(409, "CLASS_ALREADY_STARTED", "This class has already started");
      }
      if (await enrollmentExists(client, classId, userId)) {
        throw new AppError(409, "DUPLICATE_ENROLLMENT", "You are already enrolled in this class");
      }
      const currentStudents = await countClassEnrollments(client, classId);
      if (currentStudents >= classRecord.max_students) {
        throw new AppError(409, "CLASS_FULL", "This class has reached its maximum capacity");
      }
      await insertEnrollment(client, classId, userId);
      const updatedClass = await findClassWithCount(client, classId);
      if (!updatedClass) throw new Error("Enrolled class disappeared inside transaction");
      return toPublicClass(updatedClass);
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    return mapEnrollmentDatabaseError(error);
  }
};

export const cancelClassEnrollment = async (classId: string, userId: string) =>
  withTransaction(async (client) => {
    const classRecord = await requireLockedClass(classId, client);
    if (classRecord.start_date.getTime() <= Date.now()) {
      throw new AppError(
        409,
        "CLASS_ALREADY_STARTED",
        "Cannot cancel enrollment for a class that has already started",
      );
    }
    if (!(await deleteEnrollment(client, classId, userId))) {
      throw new AppError(404, "ENROLLMENT_NOT_FOUND", "Enrollment was not found");
    }
    const updatedClass = await findClassWithCount(client, classId);
    if (!updatedClass) throw new Error("Class disappeared inside transaction");
    return toPublicClass(updatedClass);
  });

export const getMyEnrollments = async (userId: string, query: EnrollmentListQuery) => {
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
