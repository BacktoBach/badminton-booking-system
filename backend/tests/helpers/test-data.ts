import type { Pool } from "pg";
import type { UserRole } from "../../src/types/auth.js";
import type { ClassLevel } from "../../src/types/class.js";

export const insertTestUser = async (
  database: Pool,
  input: { name: string; email: string; role?: UserRole },
): Promise<string> => {
  const result = await database.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, 'unused-test-hash', $3)
     RETURNING id`,
    [input.name, input.email, input.role ?? "user"],
  );
  return result.rows[0]!.id;
};

export const insertTestClass = async (
  database: Pool,
  input: {
    ownerId: string;
    title: string;
    startsInHours?: number;
    maxStudents?: number;
    level?: ClassLevel;
  },
): Promise<string> => {
  const result = await database.query<{ id: string }>(
    `INSERT INTO classes
       (title, description, coach_name, level, start_date, schedule, location, max_students, created_by_id)
     VALUES ($1, 'A complete class description for integration testing', 'Coach An', $2, $3,
             'Monday and Wednesday', 'Court One', $4, $5)
     RETURNING id`,
    [
      input.title,
      input.level ?? "beginner",
      new Date(Date.now() + (input.startsInHours ?? 24) * 60 * 60 * 1_000),
      input.maxStudents ?? 4,
      input.ownerId,
    ],
  );
  return result.rows[0]!.id;
};
