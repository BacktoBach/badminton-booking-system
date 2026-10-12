import {
  E2E_ADMIN,
  E2E_CLASS_IDS,
  E2E_CLASS_TITLES,
  E2E_RACE_USERS,
  E2E_SEARCH_TARGET,
  E2E_USER,
  E2E_DIRECTORY_TARGET,
} from "../../backend/database/seeds/e2e-fixtures.js";

export const seededAdmin = E2E_ADMIN;
export const seededUser = E2E_USER;
export const raceUsers = E2E_RACE_USERS;

export const seededClasses = {
  booking: { id: E2E_CLASS_IDS.booking, title: E2E_CLASS_TITLES.booking },
  full: { id: E2E_CLASS_IDS.full, title: E2E_CLASS_TITLES.full },
  past: { id: E2E_CLASS_IDS.past, title: E2E_CLASS_TITLES.past },
  capacity: { id: E2E_CLASS_IDS.capacity, title: E2E_CLASS_TITLES.capacity },
  students: {
    id: E2E_CLASS_IDS.students,
    title: E2E_CLASS_TITLES.students,
    searchEmail: E2E_DIRECTORY_TARGET.email,
  },
  duplicate: {
    id: E2E_CLASS_IDS.duplicate,
    title: E2E_CLASS_TITLES.duplicate,
  },
  finalSeat: { id: E2E_CLASS_IDS.finalSeat, title: E2E_CLASS_TITLES.finalSeat },
  editable: { id: E2E_CLASS_IDS.editable, title: E2E_CLASS_TITLES.editable },
  deletable: {
    id: E2E_CLASS_IDS.deletable,
    title: E2E_CLASS_TITLES.deletable,
  },
  searchTarget: E2E_SEARCH_TARGET,
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
