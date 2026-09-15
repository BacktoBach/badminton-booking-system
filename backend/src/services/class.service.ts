import { pool } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";
import { findPublicClassById, listUpcomingClasses } from "../models/class.model.js";
import type { ClassListQuery, ClassWithCountRow, PublicClass } from "../types/class.js";
import { createPaginationMeta } from "../utils/pagination.js";

const toPublicClass = (record: ClassWithCountRow): PublicClass => {
  const availableSlots = Math.max(record.max_students - record.current_students, 0);
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    coachName: record.coach_name,
    level: record.level,
    startDate: record.start_date.toISOString(),
    schedule: record.schedule,
    location: record.location,
    currentStudents: record.current_students,
    maxStudents: record.max_students,
    availableSlots,
    isFull: availableSlots === 0,
  };
};

export const getUpcomingClasses = async (query: ClassListQuery) => {
  const result = await listUpcomingClasses(pool, query);
  return {
    classes: result.rows.map(toPublicClass),
    meta: createPaginationMeta(query.page, query.limit, result.total),
  };
};

export const getPublicClass = async (classId: string): Promise<PublicClass> => {
  const record = await findPublicClassById(pool, classId);
  if (!record) throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
  return toPublicClass(record);
};
