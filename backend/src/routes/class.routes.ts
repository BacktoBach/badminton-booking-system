import { Router } from "express";
import { z } from "zod";
import {
  cancelClassSeries,
  createClassSeries,
  updateClassSeries,
} from "../services/class.service.js";
import {
  createClass,
  getClassDetail,
  listClasses,
  listClassStudents,
  removeClass,
  updateClass,
} from "../controllers/class.controller.js";
import {
  cancelEnrollment,
  enroll,
} from "../controllers/enrollment.controller.js";
import {
  authenticate,
  optionalAuthenticate,
} from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import {
  enrollmentLimiters,
  publicClassReadLimiter,
} from "../middlewares/rate-limit.js";
import { validateParams, validateQuery } from "../middlewares/validate.js";
import { validateBody } from "../middlewares/validate.js";
import { checkIn } from "../services/attendance.service.js";
import {
  classListQuerySchema,
  classParamsSchema,
  createClassSchema,
  studentListQuerySchema,
  updateClassSchema,
} from "../schemas/class.schema.js";

export const classRouter = Router();

classRouter.post(
  "/:classId/check-in",
  authenticate,
  authorize("user"),
  ...enrollmentLimiters,
  validateParams(classParamsSchema),
  validateBody(z.object({ token: z.string().min(1).max(1024) }).strict()),
  async (request, response) => {
    const { classId } = request.validated!.params as { classId: string };
    response.json({
      data: await checkIn(
        classId,
        request.user!.id,
        request.body.token as string,
      ),
    });
  },
);

classRouter.get(
  "/",
  publicClassReadLimiter,
  validateQuery(classListQuerySchema),
  listClasses,
);
classRouter.post(
  "/",
  authenticate,
  authorize("admin"),
  validateBody(createClassSchema),
  createClass,
);
classRouter.post(
  "/series",
  authenticate,
  authorize("admin"),
  validateBody(
    z
      .object({
        class: createClassSchema,
        recurrence: z
          .object({
            endDate: z.iso.date(),
            endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            weekdays: z
              .array(z.number().int().min(0).max(6))
              .min(1)
              .max(7)
              .refine((days) => new Set(days).size === days.length),
          })
          .strict(),
      })
      .strict(),
  ),
  async (request, response) => {
    const result = await createClassSeries(
      request.body.class,
      request.body.recurrence,
      request.user!.id,
    );
    response.status(201).json({ data: result });
  },
);
classRouter.patch(
  "/:classId/series",
  authenticate,
  authorize("admin"),
  validateParams(classParamsSchema),
  validateBody(updateClassSchema),
  async (request, response) => {
    await updateClassSeries(
      (request.validated!.params as { classId: string }).classId,
      request.body,
    );
    response.status(204).end();
  },
);
classRouter.delete(
  "/:classId/series",
  authenticate,
  authorize("admin"),
  validateParams(classParamsSchema),
  async (request, response) => {
    await cancelClassSeries(
      (request.validated!.params as { classId: string }).classId,
    );
    response.status(204).end();
  },
);
classRouter.post(
  "/:classId/enrollments",
  authenticate,
  authorize("user"),
  ...enrollmentLimiters,
  validateParams(classParamsSchema),
  enroll,
);
classRouter.delete(
  "/:classId/enrollments",
  authenticate,
  authorize("user"),
  ...enrollmentLimiters,
  validateParams(classParamsSchema),
  cancelEnrollment,
);
classRouter.get(
  "/:classId/students",
  authenticate,
  authorize("admin"),
  validateParams(classParamsSchema),
  validateQuery(studentListQuerySchema),
  listClassStudents,
);
classRouter.patch(
  "/:classId",
  authenticate,
  authorize("admin"),
  validateParams(classParamsSchema),
  validateBody(updateClassSchema),
  updateClass,
);
classRouter.delete(
  "/:classId",
  authenticate,
  authorize("admin"),
  validateParams(classParamsSchema),
  removeClass,
);
classRouter.get(
  "/:classId",
  publicClassReadLimiter,
  optionalAuthenticate,
  validateParams(classParamsSchema),
  getClassDetail,
);
