import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { classRouter } from "./class.routes.js";
import { adminRouter } from "./admin.routes.js";
import { enrollmentRouter } from "./enrollment.routes.js";
import { swaggerRouter } from "./swagger.routes.js";

export const apiRouter = Router();

apiRouter.use(swaggerRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/classes", classRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/enrollments", enrollmentRouter);
