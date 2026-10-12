import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import {
  E2E_ADMIN,
  E2E_CAPACITY_USER,
  E2E_CLASS_FIXTURES,
  E2E_CLASS_IDS,
  E2E_CLASS_TITLES,
  E2E_DIRECTORY_STUDENT_COUNT,
  E2E_DIRECTORY_TARGET,
  E2E_RACE_USERS,
  E2E_USER,
} from "./e2e-fixtures.js";

export { E2E_ADMIN, E2E_CLASS_IDS, E2E_USER } from "./e2e-fixtures.js";

type UserRow = { id: string };
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const insertUser = async (
  client: PoolClient,
  user: { name: string; email: string; password: string },
  role: "admin" | "user",
): Promise<string> => {
  const passwordHash = await bcrypt.hash(user.password, 4);
  const result = await client.query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [user.name, user.email, passwordHash, role],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`Failed to seed E2E user: ${user.email}`);
  return row.id;
};

export const seedE2eDatabase = async (client: PoolClient): Promise<void> => {
  const adminId = await insertUser(client, E2E_ADMIN, "admin");
  const userId = await insertUser(client, E2E_USER, "user");
  const capacityUserId = await insertUser(client, E2E_CAPACITY_USER, "user");
  await Promise.all(
    E2E_RACE_USERS.map((user) => insertUser(client, user, "user")),
  );

  for (const fixture of E2E_CLASS_FIXTURES) {
    await client.query(
      `INSERT INTO classes (
         id, title, description, coach_name, level, start_date,
         schedule, location, max_students, created_by_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        fixture.id,
        fixture.title,
        fixture.description,
        fixture.coachName,
        fixture.level,
        new Date(Date.now() + fixture.daysFromNow * DAY_IN_MS),
        fixture.schedule,
        fixture.location,
        fixture.maxStudents,
        adminId,
      ],
    );
  }

  await client.query(
    `INSERT INTO classes (
       id, title, description, coach_name, level, start_date,
       schedule, location, max_students, created_by_id
     ) VALUES ($1, $2, $3, $4, 'advanced', $5, $6, $7, 10, $8)`,
    [
      E2E_CLASS_IDS.past,
      E2E_CLASS_TITLES.past,
      "Lớp đã bắt đầu dùng để kiểm thử không thể hủy đăng ký sau khai giảng.",
      "Coach E2E Past",
      new Date(Date.now() + DAY_IN_MS),
      "Chủ nhật - 08:00",
      "Sân E2E Past",
      adminId,
    ],
  );

  await client.query(
    `INSERT INTO enrollments (class_id, user_id)
     VALUES ($1, $2), ($3, $4), ($5, $6), ($5, $7), ($8, $9)`,
    [
      E2E_CLASS_IDS.full,
      capacityUserId,
      E2E_CLASS_IDS.past,
      userId,
      E2E_CLASS_IDS.capacity,
      userId,
      capacityUserId,
      E2E_CLASS_IDS.deletable,
      userId,
    ],
  );

  for (let index = 1; index <= E2E_DIRECTORY_STUDENT_COUNT; index += 1) {
    const student =
      index === E2E_DIRECTORY_STUDENT_COUNT
        ? { ...E2E_DIRECTORY_TARGET, password: "DirectoryE2E123!" }
        : {
            name: `Directory Student ${index}`,
            email: `directory.student.${index}@example.com`,
            password: "DirectoryE2E123!",
          };
    const studentId = await insertUser(client, student, "user");
    await client.query(
      "INSERT INTO enrollments (class_id, user_id) VALUES ($1, $2)",
      [E2E_CLASS_IDS.students, studentId],
    );
  }

  await client.query("UPDATE classes SET start_date = $1 WHERE id = $2", [
    new Date(Date.now() - DAY_IN_MS),
    E2E_CLASS_IDS.past,
  ]);
};
