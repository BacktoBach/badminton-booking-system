import { resolve } from "node:path";

export const emptyAuthState = { cookies: [], origins: [] };
export const adminAuthStatePath = resolve(".auth/admin.json");
export const userAuthStatePath = resolve(".auth/user.json");
