import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { ClassDetailPage } from "../pages/ClassDetailPage";
import { ClassListPage } from "../pages/ClassListPage";
import { seededClasses, seededUser } from "../support/test-data";

test.describe("Class discovery and booking", () => {
  test("searches, filters and paginates upcoming classes", async ({ page }) => {
    const classes = new ClassListPage(page);
    await classes.open();

    await expect(page.getByText("Trang 1/2", { exact: true })).toBeVisible();
    await classes.search(seededClasses.searchTarget);
    await expect(classes.card(seededClasses.searchTarget)).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(1);

    await page.getByPlaceholder("Tìm theo tên lớp...").clear();
    await classes.filterByLevel("Nâng cao");
    await expect(
      classes.card(seededClasses.searchTarget).getByText("Nâng cao"),
    ).toBeVisible();

    await page.getByLabel("Lọc trình độ").selectOption("");
    await expect(page).toHaveURL(/\/classes\?page=1$/);
    await page.getByRole("button", { name: "Sau" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Trang 2/2", { exact: true })).toBeVisible();
  });

  test("enrolls, lists and cancels an upcoming class", async ({ page }) => {
    const auth = new AuthPage(page);
    const classes = new ClassListPage(page);
    const detail = new ClassDetailPage(page);

    await auth.login(seededUser);
    await classes.open();
    await classes.search(seededClasses.booking.title);
    await classes.openClass(seededClasses.booking.title);
    await detail.expectStudentCount(0, 4);
    await detail.enroll();
    await detail.expectStudentCount(1, 4);

    await page.getByRole("link", { name: "Lớp của tôi" }).click();
    await expect(classes.card(seededClasses.booking.title)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Hủy đăng ký" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Đã hủy đăng ký lớp" }),
    ).toBeVisible();
    await expect(classes.card(seededClasses.booking.title)).toHaveCount(0);

    await page.goto(`/classes/${seededClasses.booking.id}`);
    await detail.expectStudentCount(0, 4);
    await expect(
      page.getByRole("button", { name: "Đăng ký lớp học" }),
    ).toBeVisible();
  });
});
