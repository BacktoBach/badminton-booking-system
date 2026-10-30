import { randomUUID } from "node:crypto";
import { pool, type DatabaseClient } from "../database/pool.js";
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

const updateClassInTransaction = async (
  client: DatabaseClient,
  classId: string,
  input: UpdateClassInput,
): Promise<PublicClass> => {
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
};

export const updateAdminClass = async (
  classId: string,
  input: UpdateClassInput,
): Promise<PublicClass> => {
  try {
    return await withTransaction((client) =>
      updateClassInTransaction(client, classId, input),
    );
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

const cancelClassInTransaction = async (
  client: DatabaseClient,
  classId: string,
): Promise<void> => {
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
  await client.query("UPDATE classes SET cancelled_at = NOW() WHERE id = $1", [
    classId,
  ]);
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
};

export const deleteAdminClass = async (classId: string): Promise<void> => {
  await withTransaction((client) => cancelClassInTransaction(client, classId));
};

export const createClassSeries = async (
  input: CreateClassInput,
  recurrence: { endDate: string; endTime: string; weekdays: number[] },
  adminId: string,
) => {
  const start = new Date(input.startDate);
  const local = new Date(start.getTime() + 7 * 60 * 60 * 1000);
  const firstDay = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  const endDay = Date.parse(`${recurrence.endDate}T00:00:00Z`);
  if (
    !Number.isFinite(endDay) ||
    new Date(endDay).toISOString().slice(0, 10) !== recurrence.endDate ||
    endDay < firstDay ||
    endDay - firstDay > 366 * 86400000
  )
    throw new AppError(
      400,
      "INVALID_SERIES_RANGE",
      "Series end date must be within one year of the start date",
    );
  const time =
    local.getUTCHours() * 3600000 +
    local.getUTCMinutes() * 60000 +
    local.getUTCSeconds() * 1000;
  const [endHour, endMinute] = recurrence.endTime.split(":").map(Number);
  if (
    endHour! * 60 + endMinute! <=
    local.getUTCHours() * 60 + local.getUTCMinutes()
  )
    throw new AppError(
      400,
      "INVALID_SERIES_TIME",
      "End time must be after the start time on the same day",
    );
  const dates: string[] = [];
  for (let day = firstDay; day <= endDay; day += 86400000) {
    const date = new Date(day);
    const instant = day + time - 7 * 3600000;
    if (
      recurrence.weekdays.includes(date.getUTCDay()) &&
      instant >= start.getTime()
    )
      dates.push(new Date(instant).toISOString());
  }
  if (
    !dates.length ||
    dates.some((date) => new Date(date).getTime() <= Date.now())
  )
    throw new AppError(
      400,
      "INVALID_SERIES_DATES",
      "Series must contain future sessions",
    );
  const weekdays = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  const startTime = `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  const schedule = `${[...recurrence.weekdays]
    .sort((a, b) => a - b)
    .map((day) => weekdays[day])
    .join(", ")} - ${startTime}–${recurrence.endTime}`;
  return withTransaction(async (client) => {
    const seriesId = randomUUID();
    for (const startDate of dates) {
      const record = await createClass(client, {
        ...input,
        schedule,
        startDate,
        createdById: adminId,
      });
      await client.query("UPDATE classes SET series_id = $1 WHERE id = $2", [
        seriesId,
        record.id,
      ]);
    }
    return { seriesId, count: dates.length };
  });
};

const getFutureSeriesIds = async (
  client: DatabaseClient,
  classId: string,
): Promise<string[]> => {
  const selected = await client.query<{ series_id: string | null }>(
    "SELECT series_id FROM classes WHERE id = $1",
    [classId],
  );
  if (!selected.rows[0])
    throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
  if (!selected.rows[0].series_id)
    throw new AppError(
      409,
      "CLASS_NOT_IN_SERIES",
      "Class is not part of a series",
    );
  const result = await client.query<{ id: string }>(
    "SELECT id FROM classes WHERE series_id = $1 AND cancelled_at IS NULL AND start_date > NOW() ORDER BY id FOR UPDATE",
    [selected.rows[0].series_id],
  );
  if (!result.rows.length)
    throw new AppError(409, "NO_FUTURE_SESSIONS", "No future sessions remain");
  return result.rows.map((row) => row.id);
};

export const updateClassSeries = async (
  classId: string,
  input: UpdateClassInput,
): Promise<void> => {
  if (input.startDate !== undefined)
    throw new AppError(
      400,
      "SERIES_DATE_CHANGE_UNSUPPORTED",
      "Change the date of an individual session instead",
    );
  try {
    await withTransaction(async (client) => {
      for (const id of await getFutureSeriesIds(client, classId))
        await updateClassInTransaction(client, id, input);
    });
  } catch (error) {
    if (hasPostgresConstraint(error, "classes_capacity_not_below_enrollments"))
      throw new AppError(
        409,
        "CAPACITY_BELOW_CURRENT_ENROLLMENTS",
        "Maximum students cannot be lower than the current enrollment count",
      );
    throw error;
  }
};

export const cancelClassSeries = async (classId: string): Promise<void> => {
  await withTransaction(async (client) => {
    for (const id of await getFutureSeriesIds(client, classId))
      await cancelClassInTransaction(client, id);
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
