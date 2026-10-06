export const seededAdmin = {
  name: "E2E Admin",
  email: "admin.e2e@example.com",
  password: "AdminE2E123!",
} as const;

export const seededUser = {
  name: "E2E Student",
  email: "user.e2e@example.com",
  password: "UserE2E123!",
} as const;

export const seededClasses = {
  booking: {
    id: "30000000-0000-4000-8000-000000000001",
    title: "E2E Booking Fundamentals",
  },
  full: {
    id: "30000000-0000-4000-8000-000000000002",
    title: "E2E Full Capacity",
  },
  past: {
    id: "30000000-0000-4000-8000-000000000003",
    title: "E2E Past Enrollment",
  },
  searchTarget: "E2E Search Target Advanced",
} as const;

export const toFutureDateTimeLocal = (daysFromNow: number): string => {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
};
