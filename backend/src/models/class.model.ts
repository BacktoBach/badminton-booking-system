import type { DatabaseClient } from "../database/pool.js";
import type { ClassListQuery, ClassWithCountRow } from "../types/class.js";

type CountRow = { total: number };

const escapeLikePattern = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");

const buildUpcomingFilter = (query: ClassListQuery) => {
  const conditions = ["c.start_date > NOW()"];
  const values: unknown[] = [];

  if (query.search) {
    values.push(`%${escapeLikePattern(query.search)}%`);
    conditions.push(`c.title ILIKE $${values.length} ESCAPE '\\'`);
  }
  if (query.level) {
    values.push(query.level);
    conditions.push(`c.level = $${values.length}`);
  }

  return { where: conditions.join(" AND "), values };
};

export const listUpcomingClasses = async (
  database: DatabaseClient,
  query: ClassListQuery,
): Promise<{ rows: ClassWithCountRow[]; total: number }> => {
  const filter = buildUpcomingFilter(query);
  const limitPosition = filter.values.length + 1;
  const offsetPosition = filter.values.length + 2;
  const offset = (query.page - 1) * query.limit;

  const [classesResult, countResult] = await Promise.all([
    database.query<ClassWithCountRow>(
      `
        SELECT
          c.id, c.title, c.description, c.coach_name, c.level, c.start_date,
          c.schedule, c.location, c.max_students, c.created_by_id,
          c.created_at, c.updated_at,
          COUNT(e.user_id)::INTEGER AS current_students
        FROM classes c
        LEFT JOIN enrollments e ON e.class_id = c.id
        WHERE ${filter.where}
        GROUP BY c.id
        ORDER BY c.start_date ASC, c.id ASC
        LIMIT $${limitPosition} OFFSET $${offsetPosition}
      `,
      [...filter.values, query.limit, offset],
    ),
    database.query<CountRow>(
      `SELECT COUNT(*)::INTEGER AS total FROM classes c WHERE ${filter.where}`,
      filter.values,
    ),
  ]);

  return { rows: classesResult.rows, total: countResult.rows[0]?.total ?? 0 };
};

export const findPublicClassById = async (
  database: DatabaseClient,
  classId: string,
): Promise<ClassWithCountRow | null> => {
  const result = await database.query<ClassWithCountRow>(
    `
      SELECT
        c.id, c.title, c.description, c.coach_name, c.level, c.start_date,
        c.schedule, c.location, c.max_students, c.created_by_id,
        c.created_at, c.updated_at,
        COUNT(e.user_id)::INTEGER AS current_students
      FROM classes c
      LEFT JOIN enrollments e ON e.class_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `,
    [classId],
  );
  return result.rows[0] ?? null;
};
