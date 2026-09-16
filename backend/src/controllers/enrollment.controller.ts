import type { Request, Response } from "express";
import {
  cancelClassEnrollment,
  enrollInClass,
  getMyEnrollments,
} from "../services/enrollment.service.js";
import type { EnrollmentListQuery } from "../types/enrollment.js";

export const enroll = async (request: Request, response: Response): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  const classRecord = await enrollInClass(classId, request.user!.id);
  response.status(201).json({ data: classRecord });
};

export const cancelEnrollment = async (request: Request, response: Response): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  const classRecord = await cancelClassEnrollment(classId, request.user!.id);
  response.status(200).json({ data: classRecord });
};

export const listMyEnrollments = async (request: Request, response: Response): Promise<void> => {
  const result = await getMyEnrollments(
    request.user!.id,
    request.validated?.query as EnrollmentListQuery,
  );
  response.status(200).json({ data: result.classes, meta: result.meta });
};
