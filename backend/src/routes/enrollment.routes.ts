import { Router } from "express";
import { listMyEnrollments } from "../controllers/enrollment.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validateQuery } from "../middlewares/validate.js";
import { enrollmentListQuerySchema } from "../schemas/enrollment.schema.js";

export const enrollmentRouter = Router();

enrollmentRouter.use(authenticate, authorize("user"));
enrollmentRouter.get("/me", validateQuery(enrollmentListQuerySchema), listMyEnrollments);
