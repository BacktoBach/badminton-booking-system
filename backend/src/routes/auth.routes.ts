import { Router } from "express";
import { pool } from "../database/pool.js";
import {
  changePassword,
  completePasswordReset,
  forgotPassword,
  login,
  logout,
  me,
  register,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import {
  loginLimiters,
  passwordResetLimiters,
  registerLimiters,
  resetPasswordLimiter,
} from "../middlewares/rate-limit.js";
import { validateBody } from "../middlewares/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", ...registerLimiters, validateBody(registerSchema), register);
authRouter.post("/login", ...loginLimiters, validateBody(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.post(
  "/forgot-password",
  ...passwordResetLimiters,
  validateBody(forgotPasswordSchema),
  forgotPassword,
);
authRouter.post(
  "/reset-password",
  resetPasswordLimiter,
  validateBody(resetPasswordSchema),
  completePasswordReset,
);
authRouter.get("/me", authenticate, me);
authRouter.get("/data-deletion-request", authenticate, authorize("user"), async (request, response) => {
  const result = await pool.query(
    "SELECT requested_at FROM data_deletion_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1",
    [request.user!.id],
  );
  response.status(200).json({ data: { requestedAt: result.rows[0]?.requested_at ?? null } });
});
authRouter.post("/data-deletion-request", authenticate, authorize("user"), async (request, response) => {
  await pool.query(
    `INSERT INTO data_deletion_requests (user_id) VALUES ($1)
     ON CONFLICT (user_id) WHERE status = 'pending' DO NOTHING`,
    [request.user!.id],
  );
  response.status(202).json({ message: "Data deletion request received" });
});
authRouter.put(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  changePassword,
);
