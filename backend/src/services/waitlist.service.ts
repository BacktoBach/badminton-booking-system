import { pool } from "../database/pool.js";
import { withTransaction } from "../database/transaction.js";
import { AppError } from "../errors/app-error.js";
import type { PoolClient } from "pg";
import { enqueueWaitlistOffer } from "./email-outbox.service.js";
import { enrollInClassInTransaction } from "./enrollment.service.js";

export const WAITLIST_OFFER_HOURS = 2;

const fillVacancies = async (client: PoolClient, classId: string) => {
  const classResult = await client.query<{
    max_students: number;
    cancelled_at: Date | null;
    start_date: Date;
  }>(
    "SELECT max_students, cancelled_at, start_date FROM classes WHERE id = $1 FOR UPDATE",
    [classId],
  );
  const klass = classResult.rows[0];
  if (!klass || klass.cancelled_at || klass.start_date <= new Date()) return 0;
  await client.query(
    `UPDATE class_waitlist SET status = 'expired', responded_at = NOW()
     WHERE class_id = $1 AND status = 'offered' AND offer_expires_at <= NOW()`,
    [classId],
  );
  let offers = 0;
  while (true) {
    const counts = await client.query<{ occupied: number }>(
      `SELECT (
         (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = $1 AND
           (e.payment_status = 'paid' OR (e.payment_status = 'pending' AND e.payment_expires_at > NOW())))
         +
         (SELECT COUNT(*) FROM class_waitlist w WHERE w.class_id = $1 AND w.status = 'offered' AND w.offer_expires_at > NOW())
         )::INTEGER AS occupied`,
      [classId],
    );
    if ((counts.rows[0]?.occupied ?? 0) >= klass.max_students) break;
    const next = await client.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM class_waitlist
       WHERE class_id = $1 AND status = 'waiting'
       ORDER BY joined_at, id LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [classId],
    );
    const row = next.rows[0];
    if (!row) break;
    const offered = await client.query<{ offer_expires_at: Date }>(
      `UPDATE class_waitlist SET status = 'offered', offered_at = NOW(),
         offer_expires_at = NOW() + ($2 * INTERVAL '1 hour')
       WHERE id = $1 AND status = 'waiting' RETURNING offer_expires_at`,
      [row.id, WAITLIST_OFFER_HOURS],
    );
    if (!offered.rows[0]) continue;
    await enqueueWaitlistOffer(
      client,
      classId,
      row.user_id,
      offered.rows[0].offer_expires_at,
    );
    offers += 1;
  }
  return offers;
};

export const joinWaitlist = async (classId: string, userId: string) =>
  withTransaction(async (client) => {
    const klass = await client.query<{
      max_students: number;
      start_date: Date;
      cancelled_at: Date | null;
    }>(
      "SELECT max_students, start_date, cancelled_at FROM classes WHERE id = $1 FOR UPDATE",
      [classId],
    );
    const row = klass.rows[0];
    if (!row) throw new AppError(404, "CLASS_NOT_FOUND", "Class was not found");
    if (row.cancelled_at)
      throw new AppError(
        409,
        "CLASS_CANCELLED",
        "This class has been cancelled",
      );
    if (row.start_date <= new Date())
      throw new AppError(
        409,
        "CLASS_ALREADY_STARTED",
        "This class has already started",
      );
    const enrollment = await client.query(
      `SELECT 1 FROM enrollments WHERE class_id = $1 AND user_id = $2
     AND (payment_status = 'paid' OR (payment_status = 'pending' AND payment_expires_at > NOW()))`,
      [classId, userId],
    );
    if (enrollment.rowCount)
      throw new AppError(
        409,
        "DUPLICATE_ENROLLMENT",
        "You are already enrolled in this class",
      );
    const counts = await client.query<{ occupied: number }>(
      `SELECT ((SELECT COUNT(*) FROM enrollments e WHERE e.class_id = $1 AND
       (e.payment_status = 'paid' OR (e.payment_status = 'pending' AND e.payment_expires_at > NOW())))
       + (SELECT COUNT(*) FROM class_waitlist w WHERE w.class_id = $1 AND w.status = 'offered' AND w.offer_expires_at > NOW()))::INTEGER AS occupied`,
      [classId],
    );
    if ((counts.rows[0]?.occupied ?? 0) < row.max_students)
      throw new AppError(
        409,
        "CLASS_NOT_FULL",
        "This class still has available places",
      );
    const inserted = await client
      .query<{ id: string; status: string; position: number }>(
        `INSERT INTO class_waitlist (class_id, user_id) VALUES ($1, $2)
     RETURNING id, status, (SELECT COUNT(*)::INTEGER FROM class_waitlist w WHERE w.class_id = $1 AND w.status = 'waiting') AS position`,
        [classId, userId],
      )
      .catch((error: unknown) => {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "23505"
        ) {
          throw new AppError(
            409,
            "DUPLICATE_WAITLIST",
            "You are already on this class waitlist",
          );
        }
        throw error;
      });
    return inserted.rows[0];
  });

export const leaveWaitlist = async (classId: string, userId: string) =>
  withTransaction(async (client) => {
    await client.query("SELECT id FROM classes WHERE id = $1 FOR UPDATE", [
      classId,
    ]);
    const result = await client.query(
      `UPDATE class_waitlist SET status = 'cancelled', responded_at = NOW()
     WHERE class_id = $1 AND user_id = $2 AND status IN ('waiting', 'offered') RETURNING id`,
      [classId, userId],
    );
    if (!result.rowCount)
      throw new AppError(
        404,
        "WAITLIST_NOT_FOUND",
        "Waitlist entry was not found",
      );
    await fillVacancies(client, classId);
  });

export const acceptWaitlistOffer = async (classId: string, userId: string) => {
  const result = await withTransaction(async (client) => {
    await client.query("SELECT id FROM classes WHERE id = $1 FOR UPDATE", [
      classId,
    ]);
    const offer = await client.query<{ offer_expires_at: Date }>(
      `SELECT offer_expires_at FROM class_waitlist WHERE class_id = $1 AND user_id = $2
       AND status = 'offered' FOR UPDATE`,
      [classId, userId],
    );
    if (!offer.rows[0])
      throw new AppError(
        404,
        "WAITLIST_OFFER_NOT_FOUND",
        "There is no active place offer",
      );
    if (offer.rows[0].offer_expires_at <= new Date()) {
      await client.query(
        "UPDATE class_waitlist SET status = 'expired', responded_at = NOW() WHERE class_id = $1 AND user_id = $2",
        [classId, userId],
      );
      await fillVacancies(client, classId);
      return { expired: true as const };
    }
    await client.query(
      "UPDATE class_waitlist SET status = 'accepted', responded_at = NOW() WHERE class_id = $1 AND user_id = $2",
      [classId, userId],
    );
    return {
      expired: false as const,
      enrollment: await enrollInClassInTransaction(classId, userId, client),
    };
  });
  if (result.expired)
    throw new AppError(
      409,
      "WAITLIST_OFFER_EXPIRED",
      "The place offer has expired",
    );
  return result.enrollment;
};

export const listMyWaitlist = async (userId: string) => {
  const result = await pool.query(
    `SELECT w.class_id AS "classId", c.title, w.status,
       w.joined_at AS "joinedAt", w.offer_expires_at AS "offerExpiresAt",
       CASE WHEN w.status = 'waiting' THEN (
         SELECT COUNT(*)::INTEGER FROM class_waitlist ahead
         WHERE ahead.class_id = w.class_id AND ahead.status = 'waiting'
           AND (ahead.joined_at, ahead.id) < (w.joined_at, w.id)
       ) + 1 ELSE NULL END AS position
     FROM class_waitlist w JOIN classes c ON c.id = w.class_id
     WHERE w.user_id = $1 AND (w.status = 'waiting' OR (w.status = 'offered' AND w.offer_expires_at > NOW()))
     ORDER BY w.joined_at`,
    [userId],
  );
  return result.rows;
};

export const promoteAvailableWaitlists = async (): Promise<number> => {
  await pool.query(
    `UPDATE class_waitlist SET status = 'expired', responded_at = NOW()
     WHERE status = 'offered' AND offer_expires_at <= NOW()`,
  );
  const classes = await pool.query<{ id: string }>(
    `SELECT DISTINCT c.id FROM classes c JOIN class_waitlist w ON w.class_id = c.id
     WHERE c.cancelled_at IS NULL AND c.start_date > NOW() AND w.status = 'waiting'
     ORDER BY c.id`,
  );
  let total = 0;
  for (const row of classes.rows)
    total += await withTransaction((client) => fillVacancies(client, row.id));
  return total;
};

export const getMyWaitlistForClass = async (
  classId: string,
  userId: string,
) => {
  const result = await pool.query(
    `SELECT w.class_id AS "classId", c.title, w.status,
       w.offer_expires_at AS "offerExpiresAt",
       CASE WHEN w.status = 'waiting' THEN (
         SELECT COUNT(*)::INTEGER FROM class_waitlist ahead
         WHERE ahead.class_id = w.class_id AND ahead.status = 'waiting'
           AND (ahead.joined_at, ahead.id) < (w.joined_at, w.id)
       ) + 1 ELSE NULL END AS position
     FROM class_waitlist w JOIN classes c ON c.id = w.class_id
     WHERE w.class_id = $1 AND w.user_id = $2
        AND (w.status = 'waiting' OR (w.status = 'offered' AND w.offer_expires_at > NOW()))`,
    [classId, userId],
  );
  return result.rows[0] ?? null;
};
