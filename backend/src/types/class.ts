export const classLevels = ["beginner", "intermediate", "advanced"] as const;

export type ClassLevel = (typeof classLevels)[number];

export type ClassListQuery = {
  page: number;
  limit: number;
  search?: string | undefined;
  level?: ClassLevel | undefined;
  status?: "active" | "cancelled" | undefined;
};

export type ClassWithCountRow = {
  series_id?: string | null;
  id: string;
  title: string;
  description: string;
  coach_name: string;
  level: ClassLevel;
  start_date: Date;
  schedule: string;
  location: string;
  max_students: number;
  tuition_vnd: number;
  created_by_id: string;
  created_at: Date;
  updated_at: Date;
  current_students: number;
  is_enrolled?: boolean;
  has_pending_payment?: boolean;
  has_paid_tuition?: boolean;
  cancelled_at?: Date | null;
};

export type PublicClass = {
  seriesId?: string | null;
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
  tuitionVnd: number;
  availableSlots: number;
  isFull: boolean;
  isEnrolled?: boolean;
  hasPendingPayment?: boolean;
  hasPaidTuition?: boolean;
  cancelledAt?: string | null;
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
  tuitionVnd?: number;
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
