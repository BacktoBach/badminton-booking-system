import type { NextFunction, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import {
  hasPostgresConstraint,
  isPostgresError,
  isPostgresErrorCode,
} from "../../src/database/postgres-error.js";
import { withTransaction } from "../../src/database/transaction.js";
import { AppError } from "../../src/errors/app-error.js";
import { authorize } from "../../src/middlewares/authorize.js";
import { createPaginationMeta } from "../../src/utils/pagination.js";

describe("hardening helpers", () => {
  it("calculates empty and partial pagination metadata", () => {
    expect(createPaginationMeta(1, 10, 0)).toEqual({
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
    });
    expect(createPaginationMeta(2, 10, 21).totalPages).toBe(3);
  });

  it("identifies PostgreSQL codes and constraints without trusting arbitrary values", () => {
    const databaseError = Object.assign(new Error("duplicate"), {
      code: "23505",
      constraint: "enrollments_pkey",
    });
    expect(isPostgresError(databaseError)).toBe(true);
    expect(isPostgresErrorCode(databaseError, "23505")).toBe(true);
    expect(isPostgresErrorCode(databaseError, "23514")).toBe(false);
    expect(hasPostgresConstraint(databaseError, "enrollments_pkey")).toBe(true);
    expect(hasPostgresConstraint(databaseError, "other_constraint")).toBe(false);
    expect(isPostgresError(new Error("ordinary"))).toBe(false);
    expect(isPostgresError({ code: "23505" })).toBe(false);
  });

  it("rejects authorization when authentication context is absent", () => {
    const next = vi.fn();
    authorize("admin")({} as Request, {} as Response, next as NextFunction);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0]?.[0] as AppError).code).toBe("AUTH_REQUIRED");
  });

  it("commits successful transactions", async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const databasePool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    await expect(withTransaction(async () => "done", databasePool)).resolves.toBe("done");
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "COMMIT"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back failed transactions and always releases the client", async () => {
    const failure = new Error("operation failed");
    const query = vi.fn().mockResolvedValue(undefined);
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const databasePool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;

    await expect(withTransaction(async () => { throw failure; }, databasePool)).rejects.toBe(failure);
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "ROLLBACK"]);
    expect(release).toHaveBeenCalledOnce();
  });
});
