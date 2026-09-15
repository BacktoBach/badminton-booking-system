import { z } from "zod";
import { classLevels } from "../types/class.js";

export const classListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(9),
    search: z.string().trim().max(100).optional(),
    level: z.enum(classLevels).optional(),
  })
  .strict();

export const classParamsSchema = z.object({ classId: z.string().uuid() }).strict();
