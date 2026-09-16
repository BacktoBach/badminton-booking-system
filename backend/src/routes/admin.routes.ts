import { Router } from "express";
import { listAdminClasses } from "../controllers/class.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validateQuery } from "../middlewares/validate.js";
import { adminClassListQuerySchema } from "../schemas/class.schema.js";

export const adminRouter = Router();

adminRouter.use(authenticate, authorize("admin"));
adminRouter.get("/classes", validateQuery(adminClassListQuerySchema), listAdminClasses);
