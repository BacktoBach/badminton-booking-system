import type { ClassWithCountRow, PublicClass } from "../types/class.js";

export const toPublicClass = (record: ClassWithCountRow, isEnrolled?: boolean): PublicClass => {
  const availableSlots = Math.max(record.max_students - record.current_students, 0);
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    coachName: record.coach_name,
    level: record.level,
    startDate: record.start_date.toISOString(),
    schedule: record.schedule,
    location: record.location,
    currentStudents: record.current_students,
    maxStudents: record.max_students,
    tuitionVnd: record.tuition_vnd,
    availableSlots,
    isFull: availableSlots === 0,
    ...(record.cancelled_at === undefined ? {} : { cancelledAt: record.cancelled_at?.toISOString() ?? null }),
    ...(isEnrolled === undefined ? {} : { isEnrolled }),
    ...(record.has_pending_payment === undefined ? {} : { hasPendingPayment: record.has_pending_payment }),
    ...(record.has_paid_tuition === undefined ? {} : { hasPaidTuition: record.has_paid_tuition }),
  };
};
