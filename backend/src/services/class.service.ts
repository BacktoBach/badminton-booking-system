import { randomUUID } from "node:crypto";
import { pool } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";
import { hasPostgresConstraint } from "../database/postgres-error.js";
import { withTransaction } from "../database/transaction.js";
import {
  createClass,
  findPublicClassById,
  listAdminClasses,
  listClassStudents,
  listUpcomingClasses,
  updateClass,
} from "../models/class.model.js";
import type {
  ClassListQuery,
  CreateClassInput,
  EnrolledStudent,
  PublicClass,
  StudentListQuery,
  UpdateClassInput,
} from "../types/class.js";
import { createPaginationMeta } from "../utils/pagination.js";
import { toPublicClass } from "../utils/class-serializer.js";
import {
  discardPendingReminders,
  enqueueClassChangeNotice,
} from "./email-outbox.service.js";

type ClassNoticeRow = {
  id: string;
  title: string;
  start_date: Date;
  schedule: string;
  location: string;
};

export const getUpcomingClasses = async (query: ClassListQuery) => {
  const result = await listUpcomingClasses(pool, query);
  return {
    classes: result.rows.map((record) => toPublicClass(record)),
    meta: createPaginationMeta(query.page, query.limit, result.total),
  };
};

export const getPublicClass = async (
  classId: string,
  userId?: string,
): Promise<PublicClass> => {
  const record = await findPublicClassById(pool, classId, userId);
  if (!record)
    throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
  return toPublicClass(record, record.is_enrolled ?? false);
};

export const getAdminClasses = async (query: ClassListQuery) => {
  const result = await listAdminClasses(pool, query);
  return {
    classes: result.rows.map((record) => toPublicClass(record)),
    meta: createPaginationMeta(query.page, query.limit, result.total),
  };
};

export const createAdminClass = async (
  input: CreateClassInput,
  adminId: string,
): Promise<PublicClass> =>
  toPublicClass(await createClass(pool, { ...input, createdById: adminId }));

export const updateAdminClass = async (
  classId: string,
  input: UpdateClassInput,
): Promise<PublicClass> => {
  try {
    return await withTransaction(async (client) => {
      const previous = await client.query<ClassNoticeRow>(
        "SELECT id, title, start_date, schedule, location FROM classes WHERE id = $1 FOR UPDATE",
        [classId],
      );
      const before = previous.rows[0];
      if (!before)
        throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
      const cancellation = await client.query(
        "SELECT cancelled_at FROM classes WHERE id = $1",
        [classId],
      );
      if (cancellation.rows[0]?.cancelled_at)
        throw new AppError(
          409,
          "CLASS_ALREADY_CANCELLED",
          "Class was already cancelled",
        );
      if (input.startDate !== undefined) {
        if (before.start_date.getTime() <= Date.now()) {
          throw new AppError(
            409,
            "CLASS_ALREADY_STARTED",
            "The start date of a class that has already started cannot be changed",
          );
        }
      }

      const record = await updateClass(client, classId, input);
      if (!record)
        throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
      if (
        before.start_date.getTime() !== record.start_date.getTime() ||
        before.schedule !== record.schedule ||
        before.location !== record.location
      ) {
        await discardPendingReminders(client, classId);
        await enqueueClassChangeNotice(
          client,
          {
            id: classId,
            title: record.title,
            startDate: record.start_date,
            schedule: record.schedule,
            location: record.location,
          },
          randomUUID(),
          false,
        );
      }
      return toPublicClass(record);
    });
  } catch (error) {
    if (
      hasPostgresConstraint(error, "classes_capacity_not_below_enrollments")
    ) {
      throw new AppError(
        409,
        "CAPACITY_BELOW_CURRENT_ENROLLMENTS",
        "Maximum students cannot be lower than the current enrollment count",
      );
    }
    throw error;
  }
};

export const deleteAdminClass = async (classId: string): Promise<void> => {
  await withTransaction(async (client) => {
    const classRecord = await client.query<ClassNoticeRow>(
      "SELECT id, title, start_date, schedule, location FROM classes WHERE id = $1 FOR UPDATE",
      [classId],
    );
    const details = classRecord.rows[0];
    if (!details)
      throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
    const cancelled = await client.query(
      "SELECT cancelled_at FROM classes WHERE id = $1",
      [classId],
    );
    if (cancelled.rows[0]?.cancelled_at)
      throw new AppError(
        409,
        "CLASS_ALREADY_CANCELLED",
        "Class was already cancelled",
      );
    await discardPendingReminders(client, classId);
    await enqueueClassChangeNotice(
      client,
      {
        id: details.id,
        title: details.title,
        startDate: details.start_date,
        schedule: details.schedule,
        location: details.location,
      },
      randomUUID(),
      true,
    );
    await client.query(
      "UPDATE classes SET cancelled_at = NOW() WHERE id = $1",
      [classId],
    );
    await client.query(
      `UPDATE class_waitlist SET status = 'cancelled', responded_at = NOW()
       WHERE class_id = $1 AND status IN ('waiting', 'offered')`,
      [classId],
    );
    await client.query(
      "UPDATE enrollments SET payment_status = 'cancelled' WHERE class_id = $1 AND payment_status = 'pending'",
      [classId],
    );
    await client.query(
      `UPDATE enrollments SET refund_status = 'pending'
       WHERE class_id = $1 AND payment_status = 'paid' AND amount_vnd > 0`,
      [classId],
    );
  });
};

export const getClassStudents = async (
  classId: string,
  query: StudentListQuery,
) => {
  if (!(await findPublicClassById(pool, classId))) {
    throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
  }
  const result = await listClassStudents(pool, classId, query);
  const students: EnrolledStudent[] = result.rows.map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    enrolledAt: student.enrolled_at.toISOString(),
  }));
  return {
    students,
    meta: createPaginationMeta(query.page, query.limit, result.total),
  };
};
