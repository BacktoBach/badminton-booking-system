import type { DatabaseClient } from "../database/pool.js";
import type { ClassWithCountRow } from "../types/class.js";
import type {
  EnrollmentClassRow,
  EnrollmentListQuery,
  LockedClassRow,
} from "../types/enrollment.js";

type CountRow = { total: number };

export const findClassForUpdate = async (
  database: DatabaseClient,
  classId: string,
): Promise<LockedClassRow | null> => {
  const result = await database.query<LockedClassRow>(
    `SELECT id, start_date, max_students
     FROM classes
     WHERE id = $1
     FOR UPDATE`,
    [classId],
  );
  return result.rows[0] ?? null;
};

export const enrollmentExists = async (
  database: DatabaseClient,
  classId: string,
  userId: string,
): Promise<boolean> => {
  const result = await database.query(
    "SELECT 1 FROM enrollments WHERE class_id = $1 AND user_id = $2",
    [classId, userId],
  );
  return result.rowCount === 1;
};

export const countClassEnrollments = async (
  database: DatabaseClient,
  classId: string,
): Promise<number> => {
  const result = await database.query<CountRow>(
    "SELECT COUNT(*)::INTEGER AS total FROM enrollments WHERE class_id = $1",
    [classId],
  );
  return result.rows[0]?.total ?? 0;
};

export const insertEnrollment = async (
  database: DatabaseClient,
  classId: string,
  userId: string,
): Promise<void> => {
  await database.query(
    "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
    [classId, userId],
  );
};

export const deleteEnrollment = async (
  database: DatabaseClient,
  classId: string,
  userId: string,
): Promise<boolean> => {
  const result = await database.query(
    "DELETE FROM enrollments WHERE class_id = $1 AND user_id = $2",
    [classId, userId],
  );
  return result.rowCount === 1;
};

export const findClassWithCount = async (
  database: DatabaseClient,
  classId: string,
): Promise<ClassWithCountRow | null> => {
  const result = await database.query<ClassWithCountRow>(
    `SELECT c.id, c.title, c.description, c.coach_name, c.level, c.start_date,
            c.schedule, c.location, c.max_students, c.created_by_id,
            c.created_at, c.updated_at, COUNT(e.user_id)::INTEGER AS current_students
     FROM classes c
     LEFT JOIN enrollments e ON e.class_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [classId],
  );
  return result.rows[0] ?? null;
};

export const listUserEnrollments = async (
  database: DatabaseClient,
  userId: string,
  query: EnrollmentListQuery,
): Promise<{ rows: EnrollmentClassRow[]; total: number }> => {
  const statusCondition = query.status === "upcoming"
    ? "AND c.start_date > NOW()"
    : query.status === "past"
      ? "AND c.start_date <= NOW()"
      : "";
  const order = query.status === "past" ? "DESC" : "ASC";
  const offset = (query.page - 1) * query.limit;

  const [classesResult, countResult] = await Promise.all([
    database.query<EnrollmentClassRow>(
      `SELECT c.id, c.title, c.description, c.coach_name, c.level, c.start_date,
              c.schedule, c.location, c.max_students, c.created_by_id,
              c.created_at, c.updated_at, own.enrolled_at,
              COUNT(all_enrollments.user_id)::INTEGER AS current_students
       FROM enrollments own
       JOIN classes c ON c.id = own.class_id
       LEFT JOIN enrollments all_enrollments ON all_enrollments.class_id = c.id
       WHERE own.user_id = $1 ${statusCondition}
       GROUP BY c.id, own.enrolled_at
       ORDER BY c.start_date ${order}, c.id ASC
       LIMIT $2 OFFSET $3`,
      [userId, query.limit, offset],
    ),
    database.query<CountRow>(
      `SELECT COUNT(*)::INTEGER AS total
       FROM enrollments own
       JOIN classes c ON c.id = own.class_id
       WHERE own.user_id = $1 ${statusCondition}`,
      [userId],
    ),
  ]);
  return { rows: classesResult.rows, total: countResult.rows[0]?.total ?? 0 };
};
