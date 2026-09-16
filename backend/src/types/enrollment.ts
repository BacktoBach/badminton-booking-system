import type { PublicClass } from "./class.js";

export type EnrollmentStatus = "upcoming" | "past" | "all";

export type EnrollmentListQuery = {
  page: number;
  limit: number;
  status: EnrollmentStatus;
};

export type LockedClassRow = {
  id: string;
  start_date: Date;
  max_students: number;
};

export type EnrollmentClassRow = {
  id: string;
  title: string;
  description: string;
  coach_name: string;
  level: "beginner" | "intermediate" | "advanced";
  start_date: Date;
  schedule: string;
  location: string;
  max_students: number;
  created_by_id: string;
  created_at: Date;
  updated_at: Date;
  current_students: number;
  enrolled_at: Date;
};

export type EnrollmentClass = PublicClass & {
  enrolledAt: string;
};
