import bcrypt from "bcryptjs";
import { pool } from "../database/pool.js";
import { hasPostgresConstraint } from "../database/postgres-error.js";
import { AppError } from "../errors/app-error.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updatePasswordIfCurrent,
} from "../models/user.model.js";
import type { ChangePasswordInput, LoginInput, RegisterInput } from "../schemas/auth.schema.js";
import { createAccessToken } from "../utils/jwt.js";
import { toPublicUser } from "../utils/user-serializer.js";

const dummyPasswordHash = bcrypt.hash("not-a-real-account-password", 12);

export const registerUser = async (input: RegisterInput) => {
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await createUser(pool, {
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return toPublicUser(user);
  } catch (error) {
    if (hasPostgresConstraint(error, "users_email_lower_unique")) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email is already registered");
    }
    throw error;
  }
};

export const loginUser = async (input: LoginInput) => {
  const user = await findUserByEmail(pool, input.email);
  const passwordMatches = await bcrypt.compare(
    input.password,
    user?.password_hash ?? await dummyPasswordHash,
  );
  if (!user || !passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }
  const session = createAccessToken(user.id, user.token_version);
  return { user: toPublicUser(user), ...session, remember: input.remember };
};

export const changeUserPassword = async (userId: string, input: ChangePasswordInput) => {
  const user = await findUserById(pool, userId);
  if (!user || !(await bcrypt.compare(input.oldPassword, user.password_hash))) {
    throw new AppError(400, "CURRENT_PASSWORD_INCORRECT", "Current password is incorrect");
  }
  const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
  const changed = await updatePasswordIfCurrent(pool, {
    userId,
    currentPasswordHash: user.password_hash,
    newPasswordHash,
  });
  if (!changed) throw new AppError(409, "TOKEN_REVOKED", "Account credentials changed; please retry");
};
