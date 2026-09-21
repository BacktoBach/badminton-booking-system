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

const titleSchema = z.string().trim().min(3).max(150);
const descriptionSchema = z
  .string()
  .trim()
  .min(10)
  .max(5_000)
  .describe("Plain text only; clients must not render this value as raw HTML");
const coachNameSchema = z.string().trim().min(2).max(100);
const startDateSchema = z.iso.datetime({ offset: true }).refine(
  (value) => new Date(value).getTime() > Date.now(),
  "Start date must be in the future",
);
const scheduleSchema = z.string().trim().min(3).max(255);
const locationSchema = z.string().trim().min(3).max(255);
const maxStudentsSchema = z.coerce.number().int().min(1).max(500);

export const createClassSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    coachName: coachNameSchema,
    level: z.enum(classLevels),
    startDate: startDateSchema,
    schedule: scheduleSchema,
    location: locationSchema,
    maxStudents: maxStudentsSchema,
  })
  .strict();

export const updateClassSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    coachName: coachNameSchema.optional(),
    level: z.enum(classLevels).optional(),
    startDate: startDateSchema.optional(),
    schedule: scheduleSchema.optional(),
    location: locationSchema.optional(),
    maxStudents: maxStudentsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const adminClassListQuerySchema = classListQuerySchema;

export const studentListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    search: z.string().trim().max(100).optional(),
  })
  .strict();
