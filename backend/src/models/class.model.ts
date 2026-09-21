import type { DatabaseClient } from "../database/pool.js";
import type {
  ClassListQuery,
  ClassWithCountRow,
  CreateClassInput,
  EnrolledStudentRow,
  StudentListQuery,
  UpdateClassInput,
} from "../types/class.js";

type CountRow = { total: number };
type ClassStartDateRow = { start_date: Date };

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

export const listAdminClasses = async (
  database: DatabaseClient,
  query: ClassListQuery,
): Promise<{ rows: ClassWithCountRow[]; total: number }> => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (query.search) {
    values.push(`%${escapeLikePattern(query.search)}%`);
    conditions.push(`c.title ILIKE $${values.length} ESCAPE '\\'`);
  }
  if (query.level) {
    values.push(query.level);
    conditions.push(`c.level = $${values.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;

  const [classesResult, countResult] = await Promise.all([
    database.query<ClassWithCountRow>(
      `SELECT c.id, c.title, c.description, c.coach_name, c.level, c.start_date,
              c.schedule, c.location, c.max_students, c.created_by_id,
              c.created_at, c.updated_at, COUNT(e.user_id)::INTEGER AS current_students
       FROM classes c
       LEFT JOIN enrollments e ON e.class_id = c.id
       ${where}
       GROUP BY c.id
       ORDER BY c.start_date DESC, c.id ASC
       LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
      [...values, query.limit, (query.page - 1) * query.limit],
    ),
    database.query<CountRow>(`SELECT COUNT(*)::INTEGER AS total FROM classes c ${where}`, values),
  ]);
  return { rows: classesResult.rows, total: countResult.rows[0]?.total ?? 0 };
};

export const createClass = async (
  database: DatabaseClient,
  input: CreateClassInput & { createdById: string },
): Promise<ClassWithCountRow> => {
  const result = await database.query<ClassWithCountRow>(
    `INSERT INTO classes
       (title, description, coach_name, level, start_date, schedule, location, max_students, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *, 0::INTEGER AS current_students`,
    [input.title, input.description, input.coachName, input.level, input.startDate,
      input.schedule, input.location, input.maxStudents, input.createdById],
  );
  const classRecord = result.rows[0];
  if (!classRecord) throw new Error("Class insert returned no row");
  return classRecord;
};

export const findClassStartDateForUpdate = async (
  database: DatabaseClient,
  classId: string,
): Promise<ClassStartDateRow | null> => {
  const result = await database.query<ClassStartDateRow>(
    "SELECT start_date FROM classes WHERE id = $1 FOR UPDATE",
    [classId],
  );
  return result.rows[0] ?? null;
};

export const updateClass = async (
  database: DatabaseClient,
  classId: string,
  input: UpdateClassInput,
): Promise<ClassWithCountRow | null> => {
  const columnByField: Record<keyof CreateClassInput, string> = {
    title: "title",
    description: "description",
    coachName: "coach_name",
    level: "level",
    startDate: "start_date",
    schedule: "schedule",
    location: "location",
    maxStudents: "max_students",
  };
  const entries = Object.entries(input) as [keyof CreateClassInput, unknown][];
  const assignments = entries.map(([field], index) => `${columnByField[field]} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  const result = await database.query<ClassWithCountRow>(
    `UPDATE classes c
     SET ${assignments.join(", ")}
     WHERE c.id = $${values.length + 1}
     RETURNING c.*, (SELECT COUNT(*)::INTEGER FROM enrollments e WHERE e.class_id = c.id) AS current_students`,
    [...values, classId],
  );
  return result.rows[0] ?? null;
};

export const deleteClass = async (database: DatabaseClient, classId: string): Promise<boolean> => {
  const result = await database.query("DELETE FROM classes WHERE id = $1", [classId]);
  return result.rowCount === 1;
};

export const listClassStudents = async (
  database: DatabaseClient,
  classId: string,
  query: StudentListQuery,
): Promise<{ rows: EnrolledStudentRow[]; total: number }> => {
  const values: unknown[] = [classId];
  let searchCondition = "";
  if (query.search) {
    values.push(`%${escapeLikePattern(query.search)}%`);
    searchCondition = `AND (u.name ILIKE $2 ESCAPE '\\' OR u.email ILIKE $2 ESCAPE '\\')`;
  }
  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;
  const [studentsResult, countResult] = await Promise.all([
    database.query<EnrolledStudentRow>(
      `SELECT u.id, u.name, u.email, e.enrolled_at
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       WHERE e.class_id = $1 ${searchCondition}
       ORDER BY e.enrolled_at ASC, u.id ASC
       LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
      [...values, query.limit, (query.page - 1) * query.limit],
    ),
    database.query<CountRow>(
      `SELECT COUNT(*)::INTEGER AS total
       FROM enrollments e JOIN users u ON u.id = e.user_id
       WHERE e.class_id = $1 ${searchCondition}`,
      values,
    ),
  ]);
  return { rows: studentsResult.rows, total: countResult.rows[0]?.total ?? 0 };
};
