import type { Request, Response } from "express";
import type {
  ClassListQuery,
  CreateClassInput,
  StudentListQuery,
  UpdateClassInput,
} from "../types/class.js";
import {
  createAdminClass,
  deleteAdminClass,
  getAdminClasses,
  getClassStudents,
  getPublicClass,
  getUpcomingClasses,
  updateAdminClass,
} from "../services/class.service.js";

export const listClasses = async (request: Request, response: Response): Promise<void> => {
  const result = await getUpcomingClasses(request.validated?.query as ClassListQuery);
  response.status(200).json({ data: result.classes, meta: result.meta });
};

export const getClassDetail = async (request: Request, response: Response): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  const classRecord = await getPublicClass(classId);
  response.status(200).json({ data: classRecord });
};

export const listAdminClasses = async (request: Request, response: Response): Promise<void> => {
  const result = await getAdminClasses(request.validated?.query as ClassListQuery);
  response.status(200).json({ data: result.classes, meta: result.meta });
};

export const createClass = async (request: Request, response: Response): Promise<void> => {
  const classRecord = await createAdminClass(request.body as CreateClassInput, request.user!.id);
  response.status(201).json({ data: classRecord });
};

export const updateClass = async (request: Request, response: Response): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  const classRecord = await updateAdminClass(classId, request.body as UpdateClassInput);
  response.status(200).json({ data: classRecord });
};

export const removeClass = async (request: Request, response: Response): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  await deleteAdminClass(classId);
  response.status(204).end();
};

export const listClassStudents = async (request: Request, response: Response): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  const result = await getClassStudents(
    classId,
    request.validated?.query as StudentListQuery,
  );
  response.status(200).json({ data: result.students, meta: result.meta });
};
