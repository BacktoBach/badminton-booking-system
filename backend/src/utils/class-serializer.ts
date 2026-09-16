import type { ClassWithCountRow, PublicClass } from "../types/class.js";

export const toPublicClass = (record: ClassWithCountRow): PublicClass => {
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
    availableSlots,
    isFull: availableSlots === 0,
  };
};
