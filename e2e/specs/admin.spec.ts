import { expect, test } from "@playwright/test";
import { AdminClassesPage } from "../pages/AdminClassesPage";
import { AuthPage } from "../pages/AuthPage";
import { ClassDetailPage } from "../pages/ClassDetailPage";
import { ClassListPage } from "../pages/ClassListPage";
import {
  seededAdmin,
  seededUser,
  toFutureDateTimeLocal,
} from "../support/test-data";

test("admin creates, updates, inspects students and deletes a class", async ({
  page,
}) => {
  const auth = new AuthPage(page);
  const admin = new AdminClassesPage(page);
  const classes = new ClassListPage(page);
  const detail = new ClassDetailPage(page);
  const title = `E2E Admin Lifecycle ${Date.now()}`;
  const classData = {
    title,
    description:
      "Lớp được tạo xuyên suốt bằng Playwright để kiểm thử luồng quản trị.",
    coachName: "Coach Lifecycle",
    level: "Trung cấp" as const,
    startDate: toFutureDateTimeLocal(90),
    maxStudents: 6,
    schedule: "Thứ 3, Thứ 5 - 20:00",
    location: "Sân Lifecycle A",
  };

  await auth.login(seededAdmin, /\/admin\/classes$/);
  await admin.createClass(classData);
  await admin.search(title);
  await expect(admin.row(title)).toContainText(classData.location);

  await auth.logout(seededAdmin.name);
  await auth.login(seededUser);
  await classes.open();
  await classes.search(title);
  await classes.openClass(title);
  await detail.enroll();

  await auth.logout(seededUser.name);
  await auth.login(seededAdmin, /\/admin\/classes$/);
  await admin.search(title);
  await admin.editClass(title, {
    location: "Sân Lifecycle B",
    schedule: "Thứ 7 - 17:30",
    maxStudents: 8,
  });
  await admin.search(title);
  await expect(admin.row(title)).toContainText("Sân Lifecycle B");
  await expect(admin.row(title)).toContainText("1/8");

  await admin.openStudents(title);
  await expect(
    page.getByRole("cell", { name: seededUser.email }),
  ).toBeVisible();

  await admin.open();
  await admin.search(title);
  await admin.deleteClass(title);
});
