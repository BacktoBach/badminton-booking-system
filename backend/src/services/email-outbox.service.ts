import type { DatabaseClient } from "../database/pool.js";
import { pool } from "../database/pool.js";
import { env } from "../config/env.js";

type ClassEmailDetails = {
  id: string;
  title: string;
  startDate: Date;
  schedule: string;
  location: string;
};

type OutboxEmail = {
  id: string;
  event_key: string;
  recipient_email: string;
  subject: string;
  body_text: string;
  attempts: number;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);

const classSummary = (details: ClassEmailDetails) =>
  `Lớp: ${details.title}\nKhai giảng: ${formatDate(details.startDate)}\nLịch học: ${details.schedule}\nĐịa điểm: ${details.location}`;

const classUrl = (classId: string) => {
  const base = new URL(
    env.PASSWORD_RESET_URL ?? "http://localhost:5173/reset-password",
  );
  return new URL(`/classes/${classId}`, base.origin).toString();
};

const enqueueEmail = async (
  database: DatabaseClient,
  input: {
    eventKey: string;
    recipientEmail: string;
    subject: string;
    bodyText: string;
  },
): Promise<void> => {
  await database.query(
    `INSERT INTO email_outbox (event_key, recipient_email, subject, body_text)
     VALUES ($1, $2, $3, $4) ON CONFLICT (event_key) DO NOTHING`,
    [input.eventKey, input.recipientEmail, input.subject, input.bodyText],
  );
};

export const enqueueEnrollmentConfirmation = async (
  database: DatabaseClient,
  classId: string,
  userId: string,
): Promise<void> => {
  const result = await database.query<{
    email: string;
    title: string;
    start_date: Date;
    schedule: string;
    location: string;
    enrolled_at: Date;
    payment_code: string | null;
  }>(
    `SELECT u.email, c.title, c.start_date, c.schedule, c.location,
            e.enrolled_at, e.payment_code
     FROM enrollments e
     JOIN users u ON u.id = e.user_id
     JOIN classes c ON c.id = e.class_id
     WHERE e.class_id = $1 AND e.user_id = $2 AND e.payment_status = 'paid'`,
    [classId, userId],
  );
  const row = result.rows[0];
  if (!row) return;
  const details = {
    id: classId,
    title: row.title,
    startDate: row.start_date,
    schedule: row.schedule,
    location: row.location,
  };
  await enqueueEmail(database, {
    eventKey: `enrollment:${classId}:${userId}:${row.payment_code ?? row.enrolled_at.toISOString()}`,
    recipientEmail: row.email,
    subject: `Xác nhận đăng ký lớp ${row.title}`,
    bodyText: `Bạn đã đăng ký lớp thành công.\n\n${classSummary(details)}\n\nChi tiết: ${classUrl(classId)}`,
  });
};

export const enqueueWaitlistOffer = async (
  database: DatabaseClient,
  classId: string,
  userId: string,
  expiresAt: Date,
): Promise<void> => {
  const result = await database.query<{
    email: string;
    title: string;
    start_date: Date;
    schedule: string;
    location: string;
  }>(
    `SELECT u.email, c.title, c.start_date, c.schedule, c.location
     FROM users u JOIN classes c ON c.id = $1 WHERE u.id = $2 AND c.cancelled_at IS NULL`,
    [classId, userId],
  );
  const row = result.rows[0];
  if (!row) return;
  const details = {
    id: classId,
    title: row.title,
    startDate: row.start_date,
    schedule: row.schedule,
    location: row.location,
  };
  await enqueueEmail(database, {
    eventKey: `waitlist-offer:${classId}:${userId}:${expiresAt.toISOString()}`,
    recipientEmail: row.email,
    subject: `Có chỗ trống trong lớp ${row.title}`,
    bodyText: `Bạn là người tiếp theo trong danh sách chờ và được giữ chỗ đến ${formatDate(expiresAt)}. Hãy đăng nhập để xác nhận trước thời hạn; sau đó chỗ sẽ được mời cho người tiếp theo.\n\n${classSummary(details)}\n\nChi tiết: ${classUrl(classId)}`,
  });
};

export const enqueuePaymentNotice = async (
  database: DatabaseClient,
  classId: string,
  userId: string,
  paymentCode: string,
  outcome: "paid" | "needs_review" | "expired",
): Promise<void> => {
  const result = await database.query<{
    email: string;
    title: string;
    amount_vnd: number;
  }>(
    `SELECT u.email, c.title, e.amount_vnd
     FROM enrollments e JOIN users u ON u.id = e.user_id
     JOIN classes c ON c.id = e.class_id
     WHERE e.class_id = $1 AND e.user_id = $2`,
    [classId, userId],
  );
  const row = result.rows[0];
  if (!row) return;
  const amount = new Intl.NumberFormat("vi-VN").format(row.amount_vnd);
  const status =
    outcome === "paid"
      ? "Thanh toán thành công"
      : outcome === "expired"
        ? "Hết hạn thanh toán"
        : "Thanh toán cần được kiểm tra";
  const instruction =
    outcome === "paid"
      ? "Chỗ học của bạn đã được xác nhận."
      : outcome === "expired"
        ? "Chỗ giữ tạm đã hết hạn. Bạn có thể đăng ký lại nếu lớp còn chỗ."
        : "Khoản chuyển của bạn cần quản trị viên kiểm tra. Vui lòng không chuyển lại trước khi được xác nhận.";
  await enqueueEmail(database, {
    eventKey: `payment:${outcome}:${paymentCode}`,
    recipientEmail: row.email,
    subject: `${status} - ${row.title}`,
    bodyText: `${status} cho lớp ${row.title}.\nSố tiền: ${amount} đ.\n${instruction}\n\nChi tiết: ${classUrl(classId)}`,
  });
};

export const enqueueClassChangeNotice = async (
  database: DatabaseClient,
  details: ClassEmailDetails,
  eventId: string,
  cancelled: boolean,
): Promise<void> => {
  const subject = cancelled
    ? `Lớp ${details.title} đã bị hủy`
    : `Lịch hoặc địa điểm lớp ${details.title} đã thay đổi`;
  const body = cancelled
    ? `Lớp bạn đã đăng ký bị hủy.\n\n${classSummary(details)}\n\nVui lòng liên hệ quản trị viên nếu cần hỗ trợ.`
    : `Thông tin lớp bạn đã đăng ký đã thay đổi.\n\n${classSummary(details)}\n\nChi tiết: ${classUrl(details.id)}`;
  await database.query(
    `INSERT INTO email_outbox (event_key, recipient_email, subject, body_text)
     SELECT $1 || ':' || e.user_id::TEXT, u.email, $2,
            CASE WHEN $5::BOOLEAN AND e.amount_vnd > 0 THEN
              $3 || E'\n\nHọc phí đã thanh toán sẽ được hoàn 100%. Trạng thái: chờ quản trị viên đối soát.'
            ELSE $3 END
     FROM enrollments e JOIN users u ON u.id = e.user_id
     WHERE e.class_id = $4 AND e.payment_status = 'paid'
     ON CONFLICT (event_key) DO NOTHING`,
    [
      `class:${cancelled ? "cancelled" : "changed"}:${eventId}`,
      subject,
      body,
      details.id,
      cancelled,
    ],
  );
};

export const discardPendingReminders = async (
  database: DatabaseClient,
  classId: string,
): Promise<void> => {
  await database.query(
    `DELETE FROM email_outbox
     WHERE event_key LIKE $1 AND sent_at IS NULL`,
    [`reminder:${classId}:%`],
  );
};

export const enqueueDueClassReminders = async (): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO email_outbox (event_key, recipient_email, subject, body_text)
     SELECT 'reminder:' || c.id::TEXT || ':' || e.user_id::TEXT || ':' ||
            TO_CHAR(c.start_date AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSUS'),
            u.email,
            'Nhắc lịch khai giảng - ' || c.title,
            'Lớp ' || c.title || ' sắp khai giảng lúc ' ||
            TO_CHAR(c.start_date AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM/YYYY') ||
            ' (giờ Việt Nam). Lịch học: ' || c.schedule ||
            '. Địa điểm: ' || c.location || '.'
     FROM classes c
     JOIN enrollments e ON e.class_id = c.id AND e.payment_status = 'paid'
     JOIN users u ON u.id = e.user_id
     WHERE c.cancelled_at IS NULL AND c.start_date > NOW()
       AND c.start_date <= NOW() + INTERVAL '24 hours'
     ON CONFLICT (event_key) DO NOTHING`,
  );
  return result.rowCount ?? 0;
};

const claimEmails = async (): Promise<OutboxEmail[]> => {
  await pool.query(
    `UPDATE email_outbox SET failed_at = NOW(), lease_until = NULL
     WHERE sent_at IS NULL AND failed_at IS NULL
       AND (attempts >= 5 OR first_attempt_at < NOW() - INTERVAL '23 hours')
       AND (lease_until IS NULL OR lease_until < NOW())`,
  );
  const result = await pool.query<OutboxEmail>(
    `WITH claimed AS (
       SELECT id FROM email_outbox
       WHERE sent_at IS NULL AND failed_at IS NULL
         AND available_at <= NOW()
         AND attempts < 5
         AND (first_attempt_at IS NULL OR first_attempt_at >= NOW() - INTERVAL '23 hours')
         AND (lease_until IS NULL OR lease_until < NOW())
       ORDER BY available_at, created_at
       FOR UPDATE SKIP LOCKED LIMIT 5
     )
     UPDATE email_outbox AS e
     SET lease_until = NOW() + INTERVAL '2 minutes', attempts = attempts + 1,
         first_attempt_at = COALESCE(first_attempt_at, NOW())
     FROM claimed WHERE e.id = claimed.id
     RETURNING e.id, e.event_key, e.recipient_email, e.subject, e.body_text, e.attempts`,
  );
  return result.rows;
};

const isNotificationCurrent = async (email: OutboxEmail): Promise<boolean> => {
  if (email.event_key.startsWith("waitlist-offer:")) {
    const [, classId, userId] = email.event_key.split(":");
    if (!classId || !userId) return false;
    const result = await pool.query(
      `SELECT 1 FROM class_waitlist w
       JOIN classes c ON c.id = w.class_id
       JOIN users u ON u.id = w.user_id
       WHERE w.class_id = $1::UUID AND w.user_id = $2::UUID
         AND w.status = 'offered' AND w.offer_expires_at > NOW()
         AND c.cancelled_at IS NULL AND u.email = $3
       LIMIT 1`,
      [classId, userId, email.recipient_email],
    );
    return result.rowCount === 1;
  }
  if (!email.event_key.startsWith("reminder:")) return true;
  const result = await pool.query(
    `SELECT 1 FROM classes c
     JOIN enrollments e ON e.class_id = c.id AND e.payment_status = 'paid'
     JOIN users u ON u.id = e.user_id
     WHERE c.start_date > NOW()
       AND c.cancelled_at IS NULL
       AND u.email = $2
       AND EXISTS (SELECT 1 FROM email_outbox WHERE id = $3)
       AND 'reminder:' || c.id::TEXT || ':' || e.user_id::TEXT || ':' ||
           TO_CHAR(c.start_date AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISSUS') = $1
     LIMIT 1`,
    [email.event_key, email.recipient_email, email.id],
  );
  return result.rowCount === 1;
};

const sendEmail = async (email: OutboxEmail): Promise<void> => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.id,
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [email.recipient_email],
      subject: email.subject,
      text: email.body_text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error(
      `Resend rejected notification (${response.status})`,
    );
    Object.assign(error, {
      retryable: response.status === 429 || response.status >= 500,
    });
    throw error;
  }
};

export const processEmailOutbox = async (): Promise<number> => {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return 0;
  const emails = await claimEmails();
  for (const email of emails) {
    try {
      if (!(await isNotificationCurrent(email))) {
        await pool.query(
          "UPDATE email_outbox SET failed_at = NOW(), lease_until = NULL WHERE id = $1",
          [email.id],
        );
        continue;
      }
      await sendEmail(email);
      await pool.query(
        "UPDATE email_outbox SET sent_at = NOW(), lease_until = NULL WHERE id = $1",
        [email.id],
      );
    } catch (error) {
      const retryable = !(
        error instanceof Error &&
        "retryable" in error &&
        error.retryable === false
      );
      const failed = !retryable || email.attempts >= 5;
      await pool.query(
        `UPDATE email_outbox
         SET lease_until = NULL,
             available_at = NOW() + ($2 * INTERVAL '1 minute'),
             failed_at = CASE WHEN $3 THEN NOW() ELSE NULL END
         WHERE id = $1`,
        [email.id, Math.min(2 ** email.attempts, 60), failed],
      );
      console.error("Notification email delivery failed", {
        id: email.id,
        attempt: email.attempts,
        final: failed,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return emails.length;
};
