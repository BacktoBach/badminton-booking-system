import { Router } from "express";
import {
  createClass,
  getClassDetail,
  listClasses,
  listClassStudents,
  removeClass,
  updateClass,
} from "../controllers/class.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validateParams, validateQuery } from "../middlewares/validate.js";
import { validateBody } from "../middlewares/validate.js";
import {
  classListQuerySchema,
  classParamsSchema,
  createClassSchema,
  studentListQuerySchema,
  updateClassSchema,
} from "../schemas/class.schema.js";

export const classRouter = Router();

classRouter.get("/", validateQuery(classListQuerySchema), listClasses);
classRouter.post("/", authenticate, authorize("admin"), validateBody(createClassSchema), createClass);
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
classRouter.get("/:classId", validateParams(classParamsSchema), getClassDetail);
