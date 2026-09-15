import type { PublicUser, UserRow } from "../types/auth.js";

export const toPublicUser = (user: UserRow): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});
