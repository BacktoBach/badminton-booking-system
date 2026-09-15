import type { Request, Response } from "express";
import { checkDatabaseConnection } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";

export const getHealth = async (_request: Request, response: Response): Promise<void> => {
  try {
    await checkDatabaseConnection();
  } catch {
    throw new AppError(503, "DATABASE_UNAVAILABLE", "Database is unavailable");
  }

  response.status(200).json({
    status: "ok",
    database: "connected",
    uptime: Math.floor(process.uptime()),
  });
};
