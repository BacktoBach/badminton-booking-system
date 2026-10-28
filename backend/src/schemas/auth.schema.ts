import { z } from "zod";
import { isPasswordTooLong, MAX_PASSWORD_BYTES } from "../utils/password.js";

const passwordWithinBcryptLimit = (value: string): boolean => !isPasswordTooLong(value);
const passwordTooLongMessage = `Password must not exceed ${MAX_PASSWORD_BYTES} UTF-8 bytes`;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(8).refine(passwordWithinBcryptLimit, passwordTooLongMessage),
    acceptedTerms: z.literal(true),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(1).refine(passwordWithinBcryptLimit, passwordTooLongMessage),
    remember: z.boolean().default(false),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1).refine(passwordWithinBcryptLimit, passwordTooLongMessage),
    newPassword: z.string().min(8).refine(passwordWithinBcryptLimit, passwordTooLongMessage),
  })
  .strict()
  .refine((input) => input.oldPassword !== input.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password",
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  newPassword: z.string().min(8).refine(passwordWithinBcryptLimit, passwordTooLongMessage),
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
