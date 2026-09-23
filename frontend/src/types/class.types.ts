export const classLevels = ['beginner', 'intermediate', 'advanced'] as const
export type ClassLevel = (typeof classLevels)[number]

export type BadmintonClass = {
  id: string
  title: string
  description: string
  coachName: string
  level: ClassLevel
  startDate: string
  schedule: string
  location: string
  currentStudents: number
  maxStudents: number
  availableSlots: number
  isFull: boolean
}

export type ClassListParams = {
  page?: number
  limit?: number
  search?: string
  level?: ClassLevel
}

export type ClassWriteInput = Pick<
  BadmintonClass,
  'title' | 'description' | 'coachName' | 'level' | 'startDate' | 'schedule' | 'location' | 'maxStudents'
>

export type Student = { id: string; name: string; email: string; enrolledAt: string }
export type StudentListParams = { page?: number; limit?: number; search?: string }
