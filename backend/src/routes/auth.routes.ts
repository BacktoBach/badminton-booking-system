import { Router } from "express";
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
authRouter.put(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  changePassword,
);
