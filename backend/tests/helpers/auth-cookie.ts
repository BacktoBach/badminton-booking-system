import { getAuthCookieName } from "../../src/config/auth-cookie.js";
import { createAccessToken } from "../../src/utils/jwt.js";

export const createTestAuthCookie = (userId: string, tokenVersion = 0): string => {
  const { token } = createAccessToken(userId, tokenVersion);
  return `${getAuthCookieName()}=${token}`;
};
