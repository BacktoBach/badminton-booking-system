import type { Request, Response } from "express";
import {
  getAuthCookieName,
  getAuthCookieOptions,
  getClearAuthCookieOptions,
} from "../config/auth-cookie.js";
import type { ChangePasswordInput, LoginInput, RegisterInput } from "../schemas/auth.schema.js";
import {
  changeUserPassword,
  loginUser,
  registerUser,
} from "../services/auth.service.js";

export const register = async (request: Request, response: Response): Promise<void> => {
  const user = await registerUser(request.body as RegisterInput);
  response.status(201).json({ message: "Registration successful", data: { user } });
};

export const login = async (request: Request, response: Response): Promise<void> => {
  const result = await loginUser(request.body as LoginInput);
  response.cookie(getAuthCookieName(), result.token, getAuthCookieOptions(result.remember));
  response.status(200).json({
    message: "Sign in successful",
    data: { user: result.user, session: { expiresAt: result.expiresAt } },
  });
};

export const me = async (request: Request, response: Response): Promise<void> => {
  const { tokenVersion: _tokenVersion, ...user } = request.user!;
  response.status(200).json({
    message: "Current user retrieved",
    data: {
      user,
      session: { expiresAt: new Date(request.auth!.exp * 1000).toISOString() },
    },
  });
};

export const changePassword = async (request: Request, response: Response): Promise<void> => {
  await changeUserPassword(request.user!.id, request.body as ChangePasswordInput);
  response.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
  response.status(200).json({ message: "Password changed; please sign in again" });
};

export const logout = (_request: Request, response: Response): void => {
  response.clearCookie(getAuthCookieName(), getClearAuthCookieOptions());
  response.status(200).json({ message: "Sign out successful" });
};
