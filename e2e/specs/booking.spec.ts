import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { ClassDetailPage } from "../pages/ClassDetailPage";
import { ClassListPage } from "../pages/ClassListPage";
import { seededClasses, seededUser } from "../support/test-data";

test.describe("Class discovery and booking", () => {
  test("searches, filters and paginates upcoming classes", async ({ page }) => {
    const classes = new ClassListPage(page);
    await classes.open();

    await expect(
      page.getByRole("navigation", { name: "Phân trang" }),
    ).toBeVisible();
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
    await expect(page.getByText(/^Trang 2\/\d+$/)).toBeVisible();
  });

  test("returns a guest to the requested class after login", async ({
    page,
  }) => {
    const auth = new AuthPage(page);
    const detail = new ClassDetailPage(page);
    const requestedPath = `/classes/${seededClasses.booking.id}`;

    await page.goto(requestedPath);
    await page.getByRole("button", { name: "Đăng nhập để đăng ký" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await auth.submitLogin(seededUser, new RegExp(`${requestedPath}$`));
    await expect(
      page.getByRole("heading", {
        name: seededClasses.booking.title,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Đăng ký lớp học" }),
    ).toBeVisible();
    await detail.expectStudentCount(0, 4);
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

    await classes.cancelEnrollment(seededClasses.booking.title);

    await page.goto(`/classes/${seededClasses.booking.id}`);
    await detail.expectStudentCount(0, 4);
    await expect(
      page.getByRole("button", { name: "Đăng ký lớp học" }),
    ).toBeVisible();
  });
});
