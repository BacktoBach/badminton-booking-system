import type { Request, Response } from "express";
import {
  acceptWaitlistOffer,
  getMyWaitlistForClass,
  joinWaitlist,
  leaveWaitlist,
  listMyWaitlist,
} from "../services/waitlist.service.js";

export const listWaitlist = async (
  request: Request,
  response: Response,
): Promise<void> => {
  response.status(200).json({ data: await listMyWaitlist(request.user!.id) });
};

export const getClassWaitlistEntry = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  response
    .status(200)
    .json({ data: await getMyWaitlistForClass(classId, request.user!.id) });
};

export const joinClassWaitlist = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  response
    .status(201)
    .json({ data: await joinWaitlist(classId, request.user!.id) });
};

export const leaveClassWaitlist = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  await leaveWaitlist(classId, request.user!.id);
  response.status(204).end();
};

export const acceptClassWaitlistOffer = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const { classId } = request.validated?.params as { classId: string };
  response
    .status(200)
    .json({ data: await acceptWaitlistOffer(classId, request.user!.id) });
};
