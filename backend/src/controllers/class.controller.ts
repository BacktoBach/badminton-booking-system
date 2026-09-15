import type { Request, Response } from "express";
import type { ClassListQuery } from "../types/class.js";
import { getPublicClass, getUpcomingClasses } from "../services/class.service.js";

export const listClasses = async (request: Request, response: Response): Promise<void> => {
  const result = await getUpcomingClasses(request.validated?.query as ClassListQuery);
  response.status(200).json({ data: result.classes, meta: result.meta });
};

export const getClassDetail = async (request: Request, response: Response): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  const classRecord = await getPublicClass(classId);
  response.status(200).json({ data: classRecord });
};
