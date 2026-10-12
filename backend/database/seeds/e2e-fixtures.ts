export const E2E_ADMIN = {
  name: "E2E Admin",
  email: "admin.e2e@example.com",
  password: "AdminE2E123!",
} as const;

export const E2E_USER = {
  name: "E2E Student",
  email: "user.e2e@example.com",
  password: "UserE2E123!",
} as const;

export const E2E_CAPACITY_USER = {
  name: "E2E Capacity Student",
  email: "capacity.e2e@example.com",
  password: "CapacityE2E123!",
} as const;

export const E2E_RACE_USERS = [
  {
    name: "E2E Race Student One",
    email: "race-one.e2e@example.com",
    password: "RaceE2E123!",
  },
  {
    name: "E2E Race Student Two",
    email: "race-two.e2e@example.com",
    password: "RaceE2E123!",
  },
] as const;

export const E2E_CLASS_IDS = {
  booking: "30000000-0000-4000-8000-000000000001",
  full: "30000000-0000-4000-8000-000000000002",
  past: "30000000-0000-4000-8000-000000000003",
  capacity: "30000000-0000-4000-8000-000000000101",
  students: "30000000-0000-4000-8000-000000000102",
  duplicate: "30000000-0000-4000-8000-000000000103",
  finalSeat: "30000000-0000-4000-8000-000000000104",
  editable: "30000000-0000-4000-8000-000000000105",
  deletable: "30000000-0000-4000-8000-000000000106",
} as const;

export const E2E_CLASS_TITLES = {
  booking: "E2E Booking Fundamentals",
  full: "E2E Full Capacity",
  past: "E2E Past Enrollment",
  capacity: "E2E Capacity Guard",
  students: "E2E Student Directory",
  duplicate: "E2E Duplicate Enrollment",
  finalSeat: "E2E Final Seat Race",
  editable: "E2E Editable Admin Class",
  deletable: "E2E Deletable Enrolled Class",
} as const;

export const E2E_SEARCH_TARGET = "E2E Search Target Advanced";
export const E2E_DIRECTORY_TARGET = {
  name: "Target Student",
  email: "target.student.e2e@example.com",
} as const;
export const E2E_DIRECTORY_STUDENT_COUNT = 21;

const paginationClasses = Array.from({ length: 8 }, (_, index) => ({
  id: `30000000-0000-4000-8000-${String(index + 4).padStart(12, "0")}`,
  title: index === 0 ? E2E_SEARCH_TARGET : `E2E Pagination Class ${index + 1}`,
  description: `Lớp dữ liệu E2E số ${index + 1} phục vụ tìm kiếm, lọc và phân trang.`,
  coachName: `Coach E2E ${index + 3}`,
  level: (index % 3 === 0
    ? "advanced"
    : index % 3 === 1
      ? "intermediate"
      : "beginner") as "advanced" | "intermediate" | "beginner",
  daysFromNow: 20 + index,
  schedule: `Buổi E2E ${index + 1}`,
  location: `Sân E2E ${index + 3}`,
  maxStudents: 10,
}));

export const E2E_CLASS_FIXTURES = [
  {
    id: E2E_CLASS_IDS.booking,
    title: E2E_CLASS_TITLES.booking,
    description: "Lớp ổn định dùng để kiểm thử luồng đăng ký và hủy đăng ký.",
    coachName: "Coach E2E One",
    level: "beginner",
    daysFromNow: 10,
    schedule: "Thứ 2, Thứ 4 - 18:00",
    location: "Sân E2E A",
    maxStudents: 4,
  },
  {
    id: E2E_CLASS_IDS.full,
    title: E2E_CLASS_TITLES.full,
    description:
      "Lớp đủ sĩ số dùng để kiểm thử quy tắc không nhận thêm học viên.",
    coachName: "Coach E2E Two",
    level: "intermediate",
    daysFromNow: 12,
    schedule: "Thứ 3 - 19:00",
    location: "Sân E2E B",
    maxStudents: 1,
  },
  {
    id: E2E_CLASS_IDS.capacity,
    title: E2E_CLASS_TITLES.capacity,
    description:
      "Lớp có nhiều học viên dùng để kiểm thử không thể giảm sức chứa quá thấp.",
    coachName: "Coach Capacity Guard",
    level: "intermediate",
    daysFromNow: 14,
    schedule: "Thứ 5 - 19:30",
    location: "Sân E2E Capacity",
    maxStudents: 3,
  },
  {
    id: E2E_CLASS_IDS.students,
    title: E2E_CLASS_TITLES.students,
    description:
      "Lớp có nhiều học viên dùng để kiểm thử tìm kiếm và phân trang danh sách.",
    coachName: "Coach Student Directory",
    level: "beginner",
    daysFromNow: 16,
    schedule: "Thứ 7 - 09:00",
    location: "Sân E2E Students",
    maxStudents: 30,
  },
  {
    id: E2E_CLASS_IDS.duplicate,
    title: E2E_CLASS_TITLES.duplicate,
    description: "Lớp riêng kiểm thử đăng ký lặp từ nhiều thao tác.",
    coachName: "Coach Duplicate",
    level: "beginner",
    daysFromNow: 18,
    schedule: "Thứ 6 - 18:00",
    location: "Sân E2E Duplicate",
    maxStudents: 4,
  },
  {
    id: E2E_CLASS_IDS.finalSeat,
    title: E2E_CLASS_TITLES.finalSeat,
    description: "Lớp riêng có một chỗ cuối để kiểm tra đăng ký đồng thời.",
    coachName: "Coach Final Seat",
    level: "intermediate",
    daysFromNow: 19,
    schedule: "Thứ 6 - 19:00",
    location: "Sân E2E Final Seat",
    maxStudents: 1,
  },
  {
    id: E2E_CLASS_IDS.editable,
    title: E2E_CLASS_TITLES.editable,
    description: "Lớp riêng dành cho kiểm thử cập nhật thông tin quản trị.",
    coachName: "Coach Editable",
    level: "advanced",
    daysFromNow: 21,
    schedule: "Thứ 7 - 10:00",
    location: "Sân E2E Editable",
    maxStudents: 6,
  },
  {
    id: E2E_CLASS_IDS.deletable,
    title: E2E_CLASS_TITLES.deletable,
    description:
      "Lớp có học viên để kiểm thử xóa lớp và các đăng ký liên quan.",
    coachName: "Coach Deletable",
    level: "beginner",
    daysFromNow: 22,
    schedule: "Thứ 2 - 18:00",
    location: "Sân E2E Deletable",
    maxStudents: 4,
  },
  ...paginationClasses,
] as const;
