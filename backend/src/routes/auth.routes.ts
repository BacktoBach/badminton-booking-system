import { Router } from "express";
import { changePassword, login, logout, me, register } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { loginLimiters, registerLimiters } from "../middlewares/rate-limit.js";
import { validateBody } from "../middlewares/validate.js";
import { changePasswordSchema, loginSchema, registerSchema } from "../schemas/auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", ...registerLimiters, validateBody(registerSchema), register);
authRouter.post("/login", ...loginLimiters, validateBody(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.get("/me", authenticate, me);
authRouter.put(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  changePassword,
);
