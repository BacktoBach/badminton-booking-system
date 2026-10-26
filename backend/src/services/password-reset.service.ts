import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { pool } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";
import { findUserByEmail } from "../models/user.model.js";
import type { ForgotPasswordInput, ResetPasswordInput } from "../schemas/auth.schema.js";

const TOKEN_LIFETIME_MINUTES = 20;
const REQUEST_COOLDOWN_MINUTES = 2;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const sendResetEmail = async (email: string, token: string): Promise<void> => {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.PASSWORD_RESET_URL) {
    throw new Error("Password reset email is not configured");
  }

  const url = new URL(env.PASSWORD_RESET_URL);
  url.hash = new URLSearchParams({ token }).toString();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [email],
      subject: "Đặt lại mật khẩu ShuttleUp",
      text: `Bạn đã yêu cầu đặt lại mật khẩu. Mở liên kết sau trong vòng ${TOKEN_LIFETIME_MINUTES} phút:\n\n${url.toString()}\n\nNếu không yêu cầu, bạn có thể bỏ qua email này.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend rejected password reset email (${response.status})`);
};

const deliverResetEmail = async (email: string, token: string, tokenId: string): Promise<void> => {
  try {
    await sendResetEmail(email, token);
  } catch (error) {
    try {
      await pool.query("DELETE FROM password_reset_tokens WHERE id = $1", [tokenId]);
    } catch {
      console.error("Could not remove an undelivered password reset token");
    }
    console.error(
      "Password reset email delivery failed",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
};

export const requestPasswordReset = async (input: ForgotPasswordInput): Promise<void> => {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.PASSWORD_RESET_URL) {
    throw new AppError(503, "EMAIL_UNAVAILABLE", "Password reset email is not configured");
  }
  const user = await findUserByEmail(pool, input.email);
  if (!user) return;

  const token = randomBytes(32).toString("hex");
  const client = await pool.connect();
  let tokenId: string | undefined;
  try {
    await client.query("BEGIN");
    const lockedUser = await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [user.id],
    );
    if (!lockedUser.rowCount) {
      await client.query("COMMIT");
      return;
    }
    const recent = await client.query(
      `SELECT 1 FROM password_reset_tokens
       WHERE user_id = $1 AND created_at > NOW() - ($2 * INTERVAL '1 minute')
       LIMIT 1`,
      [user.id, REQUEST_COOLDOWN_MINUTES],
    );
    if (recent.rowCount) {
      await client.query("COMMIT");
      return;
    }
    await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [user.id],
    );
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute')) RETURNING id`,
      [user.id, hashToken(token), TOKEN_LIFETIME_MINUTES],
    );
    tokenId = inserted.rows[0]?.id;
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!tokenId) throw new Error("Password reset token insert returned no row");
  void deliverResetEmail(user.email, token, tokenId);
};

export const resetPassword = async (input: ResetPasswordInput): Promise<void> => {
  const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [hashToken(input.token)],
    );
    const resetToken = result.rows[0];
    if (!resetToken) {
      throw new AppError(400, "INVALID_RESET_TOKEN", "Reset link is invalid or expired");
    }
    await client.query(
      "UPDATE users SET password_hash = $1, token_version = token_version + 1 WHERE id = $2",
      [newPasswordHash, resetToken.user_id],
    );
    await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
      [resetToken.user_id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
