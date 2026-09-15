import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";

export type DevelopmentSeedInput = {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

type UserIdRow = { id: string };

const classSeeds = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    title: "Badminton Foundation",
    description: "Lớp nền tảng dành cho học viên mới bắt đầu chơi cầu lông.",
    coachName: "Coach Minh",
    level: "beginner",
    schedule: "Thứ 3, Thứ 5 - 19:00",
    location: "Sân cầu lông số 1",
    maxStudents: 12,
    daysFromNow: 30,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    title: "Intermediate Skills",
    description: "Lớp nâng cao kỹ thuật di chuyển, điều cầu và phối hợp chiến thuật.",
    coachName: "Coach Lan",
    level: "intermediate",
    schedule: "Thứ 2, Thứ 6 - 19:30",
    location: "Sân cầu lông số 2",
    maxStudents: 10,
    daysFromNow: 45,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    title: "Advanced Match Play",
    description: "Lớp chiến thuật thi đấu và xử lý tình huống dành cho học viên nâng cao.",
    coachName: "Coach Hùng",
    level: "advanced",
    schedule: "Thứ 4, Chủ nhật - 20:00",
    location: "Sân cầu lông số 3",
    maxStudents: 8,
    daysFromNow: 60,
  },
] as const;

export const seedDevelopmentDatabase = async (
  client: PoolClient,
  input: DevelopmentSeedInput,
): Promise<void> => {
  const passwordHash = await bcrypt.hash(input.adminPassword, 12);
  const normalizedEmail = input.adminEmail.trim().toLowerCase();

  const adminResult = await client.query<UserIdRow>(
    `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT ((LOWER(email))) DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = 'admin'
      RETURNING id
    `,
    [input.adminName.trim(), normalizedEmail, passwordHash],
  );
  const admin = adminResult.rows[0];
  if (!admin) throw new Error("Admin seed did not return a user ID");

  for (const classSeed of classSeeds) {
    const startDate = new Date(Date.now() + classSeed.daysFromNow * 24 * 60 * 60 * 1000);
    await client.query(
      `
        INSERT INTO classes (
          id, title, description, coach_name, level, start_date,
          schedule, location, max_students, created_by_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          coach_name = EXCLUDED.coach_name,
          level = EXCLUDED.level,
          start_date = EXCLUDED.start_date,
          schedule = EXCLUDED.schedule,
          location = EXCLUDED.location,
          max_students = EXCLUDED.max_students,
          created_by_id = EXCLUDED.created_by_id
      `,
      [
        classSeed.id,
        classSeed.title,
        classSeed.description,
        classSeed.coachName,
        classSeed.level,
        startDate,
        classSeed.schedule,
        classSeed.location,
        classSeed.maxStudents,
        admin.id,
      ],
    );
  }
};
