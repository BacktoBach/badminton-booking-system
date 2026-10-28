import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { ClassDetailPage } from "../pages/ClassDetailPage";
import { ClassListPage } from "../pages/ClassListPage";
import { emptyAuthState, userAuthStatePath } from "../support/auth-state";
import { raceUsers, seededClasses, seededUser } from "../support/test-data";

test.use({ storageState: userAuthStatePath });

test.describe("Class discovery and booking", () => {
  test("searches, filters and paginates upcoming classes", async ({ page }) => {
    const classes = new ClassListPage(page);
    await classes.open();

    await expect(
      page.getByRole("navigation", { name: "Phân trang" }),
    ).toBeVisible();
    await classes.search(seededClasses.searchTarget);
    await expect(classes.card(seededClasses.searchTarget)).toBeVisible();
    await expect(page.getByTestId("class-card")).toHaveCount(1);

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
    browser,
  }) => {
    const context = await browser.newContext({ storageState: emptyAuthState });
    const page = await context.newPage();
    const auth = new AuthPage(page);
    const requestedPath = `/classes/${seededClasses.booking.id}`;

    try {
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
      await expect(page.getByTestId("class-capacity")).toContainText(
        "/4 học viên",
      );
    } finally {
      await context.close();
    }
  });

  test("enrolls, lists and cancels an upcoming class", async ({ page }) => {
    const classes = new ClassListPage(page);
    const detail = new ClassDetailPage(page);

    await classes.open();
    await classes.search(seededClasses.booking.title);
    await classes.openClass(seededClasses.booking.title);
    await expect(page.getByTestId("class-capacity")).toContainText(
      "/4 học viên",
    );
    await detail.enroll();
    await detail.expectStudentCount(1, 4);

    await page.getByRole("link", { name: "Lớp của tôi" }).click();
    await expect(classes.card(seededClasses.booking.title)).toBeVisible();
    await classes.cancelEnrollment(seededClasses.booking.title);

    await page.goto(`/classes/${seededClasses.booking.id}`);
    await expect(
      page.getByRole("button", { name: "Đăng ký lớp học" }),
    ).toBeVisible();
  });

  test("prevents duplicate enrollment from two tabs", async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext({ storageState: userAuthStatePath }),
      browser.newContext({ storageState: userAuthStatePath }),
    ]);
    const pages = await Promise.all(
      contexts.map((context) => context.newPage()),
    );

    try {
      await Promise.all(
        pages.map((page) =>
          page.goto(`/classes/${seededClasses.duplicate.id}`),
        ),
      );
      const enrollmentResponses = pages.map((page) =>
        page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            response
              .url()
              .includes(`/classes/${seededClasses.duplicate.id}/enrollments`),
        ),
      );
      await Promise.all(
        pages.map((page) =>
          page.getByRole("button", { name: "Đăng ký lớp học" }).click(),
        ),
      );
      const statuses = (await Promise.all(enrollmentResponses)).map(
        (response) => response.status(),
      );
      expect(statuses.sort((left, right) => left - right)).toEqual([201, 409]);

      await Promise.all(
        pages.map(async (page) => {
          await expect(
            page.getByRole("button", { name: "Hủy đăng ký" }),
          ).toBeVisible();
          await expect(page.getByTestId("class-capacity")).toContainText(
            "1/4 học viên",
          );
        }),
      );
      const duplicateAlerts = await Promise.all(
        pages.map((page) =>
          page.getByRole("alert").filter({ hasText: "đã đăng ký" }).count(),
        ),
      );
      expect([...duplicateAlerts].sort()).toEqual([0, 1]);
      const rejectedIndex = duplicateAlerts.findIndex((count) => count === 1);
      await expect(
        pages[rejectedIndex]!.getByRole("alert").filter({
          hasText: "đã đăng ký",
        }),
      ).toBeVisible();
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });

  test("refreshes stale class details when two students race for the final seat", async ({
    browser,
  }) => {
    const contexts = await Promise.all([
      browser.newContext({ storageState: emptyAuthState }),
      browser.newContext({ storageState: emptyAuthState }),
    ]);
    const pages = await Promise.all(
      contexts.map((context) => context.newPage()),
    );

    try {
      await Promise.all(
        pages.map(async (page, index) => {
          const user = raceUsers[index];
          if (!user)
            throw new Error(`Missing race user fixture at index ${index}`);
          await new AuthPage(page).login(user);
          await page.goto(`/classes/${seededClasses.finalSeat.id}`);
          await expect(
            page.getByRole("button", { name: "Đăng ký lớp học" }),
          ).toBeEnabled();
        }),
      );

      const enrollmentResponses = pages.map((page) =>
        page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            response
              .url()
              .includes(`/classes/${seededClasses.finalSeat.id}/enrollments`),
        ),
      );
      await Promise.all(
        pages.map((page) =>
          page.getByRole("button", { name: "Đăng ký lớp học" }).click(),
        ),
      );
      const responses = await Promise.all(enrollmentResponses);
      expect(
        responses
          .map((response) => response.status())
          .sort((left, right) => left - right),
      ).toEqual([201, 409]);

      await Promise.all(
        pages.map(async (page) => {
          await expect(page.getByTestId("class-capacity")).toContainText(
            "1/1 học viên",
          );
          await expect(
            page.getByText("Lớp đã đủ chỗ", { exact: true }),
          ).toBeVisible();
        }),
      );
      const registeredPages = await Promise.all(
        pages.map(async (page) =>
          page.getByRole("button", { name: "Hủy đăng ký" }).isVisible(),
        ),
      );
      expect(registeredPages.filter(Boolean)).toHaveLength(1);
      const rejectedPage = pages[registeredPages[0] ? 1 : 0]!;
      await expect(
        rejectedPage.getByRole("alert").filter({ hasText: "đủ chỗ" }),
      ).toBeVisible();
      await expect(
        rejectedPage.getByRole("button", { name: "Tham gia danh sách chờ" }),
      ).toBeEnabled();
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
});
