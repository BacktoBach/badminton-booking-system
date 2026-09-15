export type PostgresError = Error & {
  code: string;
  constraint?: string;
  detail?: string;
};

export const isPostgresError = (error: unknown): error is PostgresError =>
  error instanceof Error &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

export const isPostgresErrorCode = (error: unknown, code: string): boolean =>
  isPostgresError(error) && error.code === code;

export const hasPostgresConstraint = (error: unknown, constraint: string): boolean =>
  isPostgresError(error) && error.constraint === constraint;
