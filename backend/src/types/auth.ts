export type UserRole = "admin" | "user";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  token_version: number;
  created_at: Date;
  updated_at: Date;
};

export type PublicUser = Pick<UserRow, "id" | "name" | "email" | "role">;

export type AuthTokenPayload = {
  sub: string;
  tokenVersion: number;
  iat: number;
  exp: number;
};
