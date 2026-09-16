import { Router } from "express";
import { getClassDetail, listClasses } from "../controllers/class.controller.js";
import { validateParams, validateQuery } from "../middlewares/validate.js";
import { classListQuerySchema, classParamsSchema } from "../schemas/class.schema.js";

export const classRouter = Router();

classRouter.get("/", validateQuery(classListQuerySchema), listClasses);
classRouter.get("/:classId", validateParams(classParamsSchema), getClassDetail);
