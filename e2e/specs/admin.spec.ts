import { expect, test } from "@playwright/test";
import { AdminClassesPage } from "../pages/AdminClassesPage";
import { deleteAdminClassByTitle } from "../support/cleanup";
import { seededClasses, toFutureDateTimeLocal } from "../support/test-data";
import { adminAuthStatePath } from "../support/auth-state";

test.use({ storageState: adminAuthStatePath });

test("admin creates and cancels a recurring series", async ({ page }) => {
  const admin = new AdminClassesPage(page);
  const title = `E2E Series ${Date.now()}`;
  const start = toFutureDateTimeLocal(90);
  const end = new Date(`${start.slice(0, 10)}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 2);
  await admin.open();
  await page.getByRole("link", { name: "Tạo lớp mới" }).click();
  await page.getByLabel("Tên lớp").fill(title);
  await page
    .getByLabel("Mô tả")
    .fill("Chuỗi buổi học để kiểm thử chức năng lặp hàng tuần.");
  await page.getByLabel("Huấn luyện viên").fill("Coach Series");
  await admin.setStartDate(start);
  await page.getByLabel("Địa điểm").fill("Sân E2E");
  await page.getByLabel("Tạo chuỗi buổi học hằng tuần").check();
  await page.getByLabel("Ngày kết thúc").fill(end.toISOString().slice(0, 10));
  await page.getByLabel("Giờ kết thúc mỗi buổi").fill("23:59");
  for (const name of [
    "CN",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ])
    await page.getByRole("checkbox", { name, exact: true }).check();
  await page.getByLabel("Tên lớp").fill(title);
  await page.getByRole("button", { name: "Lưu lớp học" }).click();
  await expect(page).toHaveURL(/\/admin\/classes$/);
  await page.getByPlaceholder("Tìm theo tên lớp...").fill(title);
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(3);
  await page
    .getByRole("button", { name: `Hủy chuỗi lớp ${title}` })
    .first()
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận" })
    .click();
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
});

test("admin creates a class", async ({ page, request }) => {
  const admin = new AdminClassesPage(page);
  const title = `E2E Admin Created ${Date.now()}`;
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

  try {
    await admin.open();
    await admin.createClass(classData);
    await admin.search(title);
    await expect(admin.row(title)).toContainText(classData.location);
  } finally {
    await deleteAdminClassByTitle(request, title);
  }
});

test("admin edits a class", async ({ page }) => {
  const admin = new AdminClassesPage(page);
  await admin.open();
  await admin.search(seededClasses.editable.title);
  await admin.editClass(seededClasses.editable.title, {
    location: "Sân E2E Editable Updated",
    schedule: "Chủ nhật - 11:00",
    maxStudents: 7,
  });
  await admin.search(seededClasses.editable.title);
  await expect(admin.row(seededClasses.editable.title)).toContainText(
    "Sân E2E Editable Updated",
  );
  await expect(admin.row(seededClasses.editable.title)).toContainText("0/7");
});

test("admin searches and inspects the enrolled student list", async ({
  page,
}) => {
  const admin = new AdminClassesPage(page);
  await admin.open();
  await admin.search(seededClasses.students.title);
  await admin.openStudents(seededClasses.students.title);
  await page
    .getByPlaceholder("Tìm theo tên hoặc email...")
    .fill(seededClasses.students.searchEmail);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("search"))
    .toBe(seededClasses.students.searchEmail);
  await expect(
    page.getByRole("cell", { name: seededClasses.students.searchEmail }),
  ).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(2);
});

test("admin cancels a class with enrolled students and retains its history", async ({
  page,
}) => {
  const admin = new AdminClassesPage(page);
  const title = seededClasses.deletable.title;
  await admin.open();
  await admin.search(title);
  await expect(admin.row(title)).toContainText("1/4");
  await admin.cancelClass(title);
});

test("admin searches and paginates students", async ({ page }) => {
  await page.goto(`/admin/classes/${seededClasses.students.id}/students`);
  await expect(page.getByText(/^Trang 1\/\d+$/)).toBeVisible();
  await page.getByRole("button", { name: "Sau" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(/^Trang 2\/\d+$/)).toBeVisible();

  await page
    .getByPlaceholder("Tìm theo tên hoặc email...")
    .fill(seededClasses.students.searchEmail);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("search"))
    .toBe(seededClasses.students.searchEmail);
  await expect(
    page.getByRole("cell", { name: seededClasses.students.searchEmail }),
  ).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(2);
});

test("admin cannot reduce capacity below current enrollment count", async ({
  page,
}) => {
  const admin = new AdminClassesPage(page);

  await admin.open();
  await admin.search(seededClasses.capacity.title);
  await admin.rejectCapacityBelowEnrollmentCount(
    seededClasses.capacity.title,
    1,
  );
});

test("admin class form validates required fields, past dates and capacity bounds", async ({
  page,
}) => {
  const admin = new AdminClassesPage(page);
  await page.goto("/admin/classes/new");
  await page.getByRole("button", { name: "Lưu lớp học" }).click();
  await expect(page.getByText("Tên lớp cần ít nhất 3 ký tự")).toBeVisible();
  await expect(page.getByText("Mô tả cần ít nhất 10 ký tự")).toBeVisible();

  await page.getByLabel("Tên lớp").fill("E2E Invalid Form");
  await page.getByLabel("Mô tả").fill("Mô tả hợp lệ dùng để kiểm tra form.");
  await page.getByLabel("Huấn luyện viên").fill("Coach Validation");
  await page.getByLabel("Trình độ").selectOption("beginner");
  await admin.setStartDate("2020-01-01T10:00");
  await page.getByLabel("Số học viên tối đa").fill("501");
  await admin.setSchedule("Thứ 2 - 18:00");
  await page.getByLabel("Địa điểm").fill("Sân Validation");
  await page.getByRole("button", { name: "Lưu lớp học" }).click();
  await expect(
    page.getByText("Ngày khai giảng phải ở tương lai"),
  ).toBeVisible();
  await expect(
    page.getByText("Số học viên tối đa không được vượt quá 500"),
  ).toBeVisible();

  await admin.setStartDate(toFutureDateTimeLocal(30));
  await page.getByLabel("Số học viên tối đa").fill("0");
  await page.getByRole("button", { name: "Lưu lớp học" }).click();
  await expect(
    page.getByText("Số học viên tối đa phải từ 1 trở lên"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/classes\/new$/);
});
