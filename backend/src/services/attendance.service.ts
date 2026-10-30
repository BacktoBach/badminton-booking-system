import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { pool } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";

const QR_LIFETIME_MS = 60_000;
const EARLY_CHECK_IN_MS = 30 * 60_000;
const LATE_CHECK_IN_MS = 2 * 60 * 60_000;

type ClassWindow = { start_date: Date; cancelled_at: Date | null };
type TokenPayload = { classId: string; expiresAt: number };

const sign = (data: string) =>
  createHmac("sha256", env.JWT_SECRET)
    .update(`class-check-in:${data}`)
    .digest();

const getClassWindow = async (classId: string): Promise<ClassWindow> => {
  const result = await pool.query<ClassWindow>(
    "SELECT start_date, cancelled_at FROM classes WHERE id = $1",
    [classId],
  );
  if (!result.rows[0])
    throw new AppError(404, "CLASS_NOT_FOUND", "Class not found");
  return result.rows[0];
};

const ensureCheckInWindow = (record: ClassWindow, now = Date.now()) => {
  if (record.cancelled_at)
    throw new AppError(409, "CLASS_CANCELLED", "Class has been cancelled");
  const start = record.start_date.getTime();
  if (now < start - EARLY_CHECK_IN_MS || now > start + LATE_CHECK_IN_MS) {
    throw new AppError(
      409,
      "CHECK_IN_CLOSED",
      "Check-in is available from 30 minutes before to 2 hours after class starts",
    );
  }
};

export const issueCheckInToken = async (classId: string) => {
  ensureCheckInWindow(await getClassWindow(classId));
  const expiresAt = Date.now() + QR_LIFETIME_MS;
  const data = Buffer.from(
    JSON.stringify({ classId, expiresAt } satisfies TokenPayload),
  ).toString("base64url");
  return {
    token: `${data}.${sign(data).toString("base64url")}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
};

export const verifyCheckInToken = (
  token: string,
  classId: string,
  now = Date.now(),
): void => {
  const [data, signature, extra] = token.split(".");
  if (!data || !signature || extra || token.length > 1024)
    throw new AppError(400, "INVALID_CHECK_IN_QR", "Invalid check-in QR");
  const supplied = Buffer.from(signature, "base64url");
  const expected = sign(data);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw new AppError(400, "INVALID_CHECK_IN_QR", "Invalid check-in QR");
  }
  let payload: TokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8"),
    ) as TokenPayload;
  } catch {
    throw new AppError(400, "INVALID_CHECK_IN_QR", "Invalid check-in QR");
  }
  if (
    payload.classId !== classId ||
    !Number.isSafeInteger(payload.expiresAt) ||
    payload.expiresAt <= now
  ) {
    throw new AppError(
      400,
      "INVALID_CHECK_IN_QR",
      "Invalid or expired check-in QR",
    );
  }
};

export const checkIn = async (
  classId: string,
  userId: string,
  token: string,
) => {
  verifyCheckInToken(token, classId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const classResult = await client.query<ClassWindow>(
      "SELECT start_date, cancelled_at FROM classes WHERE id = $1 FOR UPDATE",
      [classId],
    );
    if (!classResult.rows[0])
      throw new AppError(404, "CLASS_NOT_FOUND", "Class not found");
    ensureCheckInWindow(classResult.rows[0]);
    const result = await client.query<{ checked_in_at: Date }>(
      `INSERT INTO class_attendance (class_id, user_id)
       SELECT $1, $2 FROM enrollments
       WHERE class_id = $1 AND user_id = $2 AND payment_status = 'paid'
       ON CONFLICT DO NOTHING RETURNING checked_in_at`,
      [classId, userId],
    );
    if (!result.rows[0]) {
      const enrolled = await client.query(
        "SELECT 1 FROM enrollments WHERE class_id = $1 AND user_id = $2 AND payment_status = 'paid'",
        [classId, userId],
      );
      throw enrolled.rowCount
        ? new AppError(409, "ALREADY_CHECKED_IN", "You have already checked in")
        : new AppError(
            403,
            "NOT_ENROLLED",
            "You are not enrolled in this class",
          );
    }
    await client.query("COMMIT");
    return { checkedInAt: result.rows[0].checked_in_at.toISOString() };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listAttendance = async (classId: string) => {
  await getClassWindow(classId);
  const result = await pool.query<{
    id: string;
    name: string;
    email: string;
    checked_in_at: Date | null;
  }>(
    `SELECT u.id, u.name, u.email, a.checked_in_at
     FROM enrollments e JOIN users u ON u.id = e.user_id
     LEFT JOIN class_attendance a ON a.class_id = e.class_id AND a.user_id = e.user_id
     WHERE e.class_id = $1 AND e.payment_status = 'paid'
     ORDER BY u.name, u.id`,
    [classId],
  );
  return result.rows.map((row) => ({
    userId: row.id,
    name: row.name,
    email: row.email,
    checkedInAt: row.checked_in_at?.toISOString() ?? null,
  }));
};
