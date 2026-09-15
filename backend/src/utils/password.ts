export const MAX_PASSWORD_BYTES = 72;

export const isPasswordTooLong = (password: string): boolean =>
  Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES;
