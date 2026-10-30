import type { DatabaseClient } from "../database/pool.js";
import type { ClassWithCountRow } from "../types/class.js";
import type {
  EnrollmentClassRow,
  EnrollmentListQuery,
  LockedClassRow,
} from "../types/enrollment.js";

type CountRow = { total: number };
const activeEnrollment =
  "(e.payment_status = 'paid' OR (e.payment_status = 'pending' AND e.payment_expires_at > NOW()))";

export const findClassForUpdate = async (
  database: DatabaseClient,
  classId: string,
): Promise<LockedClassRow | null> => {
  const result = await database.query<LockedClassRow>(
    `SELECT id, start_date, max_students, tuition_vnd
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
    "SELECT 1 FROM enrollments WHERE class_id = $1 AND user_id = $2 AND (payment_status = 'paid' OR (payment_status = 'pending' AND payment_expires_at > NOW()))",
    [classId, userId],
  );
  return result.rowCount === 1;
};

export const countClassEnrollments = async (
  database: DatabaseClient,
  classId: string,
): Promise<number> => {
  const result = await database.query<CountRow>(
    `SELECT ((SELECT COUNT(*) FROM enrollments e WHERE class_id = $1 AND ${activeEnrollment})
      + (SELECT COUNT(*) FROM class_waitlist w WHERE class_id = $1 AND w.status = 'offered' AND w.offer_expires_at > NOW()))::INTEGER AS total`,
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
            c.schedule, c.location, c.max_students, c.tuition_vnd, c.created_by_id,
            c.created_at, c.updated_at, c.image_url,
            (COUNT(e.user_id) + (SELECT COUNT(*) FROM class_waitlist w WHERE w.class_id = c.id
              AND w.status = 'offered' AND w.offer_expires_at > NOW()))::INTEGER AS current_students
     FROM classes c
     LEFT JOIN enrollments e ON e.class_id = c.id AND ${activeEnrollment}
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
  const statusCondition =
    query.status === "upcoming"
      ? "AND c.start_date > NOW()"
      : query.status === "past"
        ? "AND c.start_date <= NOW()"
        : "";
  const order = query.status === "past" ? "DESC" : "ASC";
  const offset = (query.page - 1) * query.limit;

  const [classesResult, countResult] = await Promise.all([
    database.query<EnrollmentClassRow>(
      `SELECT c.id, c.title, c.description, c.coach_name, c.level, c.start_date,
              c.schedule, c.location, c.max_students, c.tuition_vnd, c.created_by_id,
              c.created_at, c.updated_at, c.image_url, own.enrolled_at,
              (COUNT(all_enrollments.user_id) + (SELECT COUNT(*) FROM class_waitlist w WHERE w.class_id = c.id
                AND w.status = 'offered' AND w.offer_expires_at > NOW()))::INTEGER AS current_students
       FROM enrollments own
       JOIN classes c ON c.id = own.class_id
       LEFT JOIN enrollments all_enrollments ON all_enrollments.class_id = c.id
         AND (all_enrollments.payment_status = 'paid' OR (all_enrollments.payment_status = 'pending' AND all_enrollments.payment_expires_at > NOW()))
       WHERE own.user_id = $1 AND own.payment_status = 'paid' ${statusCondition}
       GROUP BY c.id, own.enrolled_at
       ORDER BY c.start_date ${order}, c.id ASC
       LIMIT $2 OFFSET $3`,
      [userId, query.limit, offset],
    ),
    database.query<CountRow>(
      `SELECT COUNT(*)::INTEGER AS total
       FROM enrollments own
       JOIN classes c ON c.id = own.class_id
       WHERE own.user_id = $1 AND own.payment_status = 'paid' ${statusCondition}`,
      [userId],
    ),
  ]);
  return { rows: classesResult.rows, total: countResult.rows[0]?.total ?? 0 };
};
