import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";

export const E2E_ADMIN = {
  name: "E2E Admin",
  email: "admin.e2e@example.com",
  password: "AdminE2E123!",
} as const;

export const E2E_USER = {
  name: "E2E Student",
  email: "user.e2e@example.com",
  password: "UserE2E123!",
} as const;

const E2E_CAPACITY_USER = {
  name: "E2E Capacity Student",
  email: "capacity.e2e@example.com",
  password: "CapacityE2E123!",
} as const;

export const E2E_CLASS_IDS = {
  booking: "30000000-0000-4000-8000-000000000001",
  full: "30000000-0000-4000-8000-000000000002",
  past: "30000000-0000-4000-8000-000000000003",
  capacity: "30000000-0000-4000-8000-000000000101",
  students: "30000000-0000-4000-8000-000000000102",
} as const;

type UserRow = { id: string };

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const classFixtures = [
  {
    id: E2E_CLASS_IDS.booking,
    title: "E2E Booking Fundamentals",
    description: "Lớp ổn định dùng để kiểm thử luồng đăng ký và hủy đăng ký.",
    coachName: "Coach E2E One",
    level: "beginner",
    daysFromNow: 10,
    schedule: "Thứ 2, Thứ 4 - 18:00",
    location: "Sân E2E A",
    maxStudents: 4,
  },
  {
    id: E2E_CLASS_IDS.full,
    title: "E2E Full Capacity",
    description:
      "Lớp đủ sĩ số dùng để kiểm thử quy tắc không nhận thêm học viên.",
    coachName: "Coach E2E Two",
    level: "intermediate",
    daysFromNow: 12,
    schedule: "Thứ 3 - 19:00",
    location: "Sân E2E B",
    maxStudents: 1,
  },
  {
    id: E2E_CLASS_IDS.capacity,
    title: "E2E Capacity Guard",
    description:
      "Lớp có nhiều học viên dùng để kiểm thử không thể giảm sức chứa quá thấp.",
    coachName: "Coach Capacity Guard",
    level: "intermediate",
    daysFromNow: 14,
    schedule: "Thứ 5 - 19:30",
    location: "Sân E2E Capacity",
    maxStudents: 3,
  },
  {
    id: E2E_CLASS_IDS.students,
    title: "E2E Student Directory",
    description:
      "Lớp có nhiều học viên dùng để kiểm thử tìm kiếm và phân trang danh sách.",
    coachName: "Coach Student Directory",
    level: "beginner",
    daysFromNow: 16,
    schedule: "Thứ 7 - 09:00",
    location: "Sân E2E Students",
    maxStudents: 30,
  },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `30000000-0000-4000-8000-${String(index + 4).padStart(12, "0")}`,
    title:
      index === 0
        ? "E2E Search Target Advanced"
        : `E2E Pagination Class ${index + 1}`,
    description: `Lớp dữ liệu E2E số ${index + 1} phục vụ tìm kiếm, lọc và phân trang.`,
    coachName: `Coach E2E ${index + 3}`,
    level:
      index % 3 === 0
        ? "advanced"
        : index % 3 === 1
          ? "intermediate"
          : "beginner",
    daysFromNow: 20 + index,
    schedule: `Buổi E2E ${index + 1}`,
    location: `Sân E2E ${index + 3}`,
    maxStudents: 10,
  })),
] as const;

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

  for (const fixture of classFixtures) {
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
      "E2E Past Enrollment",
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
     VALUES ($1, $2), ($3, $4), ($5, $6), ($5, $7)`,
    [
      E2E_CLASS_IDS.full,
      capacityUserId,
      E2E_CLASS_IDS.past,
      userId,
      E2E_CLASS_IDS.capacity,
      userId,
      capacityUserId,
    ],
  );

  for (let index = 1; index <= 21; index += 1) {
    const studentId = await insertUser(
      client,
      {
        name: index === 21 ? "Target Student" : `Directory Student ${index}`,
        email:
          index === 21
            ? "target.student.e2e@example.com"
            : `directory.student.${index}@example.com`,
        password: "DirectoryE2E123!",
      },
      "user",
    );
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
