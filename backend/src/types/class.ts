export const classLevels = ["beginner", "intermediate", "advanced"] as const;

export type ClassLevel = (typeof classLevels)[number];

export type ClassListQuery = {
  page: number;
  limit: number;
  search?: string | undefined;
  level?: ClassLevel | undefined;
};

export type ClassWithCountRow = {
  id: string;
  title: string;
  description: string;
  coach_name: string;
  level: ClassLevel;
  start_date: Date;
  schedule: string;
  location: string;
  max_students: number;
  created_by_id: string;
  created_at: Date;
  updated_at: Date;
  current_students: number;
};

export type PublicClass = {
  id: string;
  title: string;
  description: string;
  coachName: string;
  level: ClassLevel;
  startDate: string;
  schedule: string;
  location: string;
  currentStudents: number;
  maxStudents: number;
  availableSlots: number;
  isFull: boolean;
};

export type CreateClassInput = {
  title: string;
  description: string;
  coachName: string;
  level: ClassLevel;
  startDate: string;
  schedule: string;
  location: string;
  maxStudents: number;
};

export type UpdateClassInput = Partial<CreateClassInput>;

export type StudentListQuery = {
  page: number;
  limit: number;
  search?: string | undefined;
};

export type EnrolledStudentRow = {
  id: string;
  name: string;
  email: string;
  enrolled_at: Date;
};

export type EnrolledStudent = {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
};
