import { Router } from "express";
import {
  acceptClassWaitlistOffer,
  getClassWaitlistEntry,
  joinClassWaitlist,
  leaveClassWaitlist,
  listWaitlist,
} from "../controllers/waitlist.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { enrollmentLimiters } from "../middlewares/rate-limit.js";
import { validateParams } from "../middlewares/validate.js";
import { classParamsSchema } from "../schemas/class.schema.js";

export const waitlistRouter = Router();

waitlistRouter.use(authenticate, authorize("user"));
waitlistRouter.get("/me", listWaitlist);
waitlistRouter.get(
  "/classes/:classId",
  validateParams(classParamsSchema),
  getClassWaitlistEntry,
);
waitlistRouter.post(
  "/classes/:classId",
  ...enrollmentLimiters,
  validateParams(classParamsSchema),
  joinClassWaitlist,
);
waitlistRouter.delete(
  "/classes/:classId",
  ...enrollmentLimiters,
  validateParams(classParamsSchema),
  leaveClassWaitlist,
);
waitlistRouter.post(
  "/classes/:classId/accept",
  ...enrollmentLimiters,
  validateParams(classParamsSchema),
  acceptClassWaitlistOffer,
);
