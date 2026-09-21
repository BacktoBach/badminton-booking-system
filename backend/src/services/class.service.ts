import { pool } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";
import { hasPostgresConstraint } from "../database/postgres-error.js";
import { withTransaction } from "../database/transaction.js";
import {
  createClass,
  deleteClass,
  findClassStartDateForUpdate,
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

export const getAdminClasses = async (query: ClassListQuery) => {
  const result = await listAdminClasses(pool, query);
  return {
    classes: result.rows.map(toPublicClass),
    meta: createPaginationMeta(query.page, query.limit, result.total),
  };
};

export const createAdminClass = async (
  input: CreateClassInput,
  adminId: string,
): Promise<PublicClass> => toPublicClass(await createClass(pool, { ...input, createdById: adminId }));

export const updateAdminClass = async (
  classId: string,
  input: UpdateClassInput,
): Promise<PublicClass> => {
  try {
    return await withTransaction(async (client) => {
      if (input.startDate !== undefined) {
        const currentClass = await findClassStartDateForUpdate(client, classId);
        if (!currentClass) throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
        if (currentClass.start_date.getTime() <= Date.now()) {
          throw new AppError(
            409,
            "CLASS_ALREADY_STARTED",
            "The start date of a class that has already started cannot be changed",
          );
        }
      }

      const record = await updateClass(client, classId, input);
      if (!record) throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
      return toPublicClass(record);
    });
  } catch (error) {
    if (hasPostgresConstraint(error, "classes_capacity_not_below_enrollments")) {
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
  if (!(await deleteClass(pool, classId))) {
    throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
  }
};

export const getClassStudents = async (classId: string, query: StudentListQuery) => {
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
