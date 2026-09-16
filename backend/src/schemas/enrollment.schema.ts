import { z } from "zod";

export const enrollmentListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(["upcoming", "past", "all"]).default("upcoming"),
  })
  .strict();
