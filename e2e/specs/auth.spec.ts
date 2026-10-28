import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { emptyAuthState } from "../support/auth-state";
import { seededAdmin, seededUser } from "../support/test-data";

test.use({ storageState: emptyAuthState });

test.describe("Authentication and session management", () => {
  test("registers, logs in, changes password and revokes another active session", async ({
    page,
    browser,
  }) => {
    const auth = new AuthPage(page);
    const unique = `${Date.now()}-${test.info().workerIndex}`;
    const account = {
      name: "E2E New Student",
      email: `student-${unique}@example.com`,
      password: "InitialE2E123!",
    };
    const newPassword = "ChangedE2E123!";

    await auth.register(account);
    await auth.login(account);

    const oldSessionContext = await browser.newContext();
    const oldSessionPage = await oldSessionContext.newPage();
    const oldSessionAuth = new AuthPage(oldSessionPage);
    await oldSessionAuth.login(account);

    await auth.changePassword(account.password, newPassword);

    await page.getByLabel("Email đăng ký").fill(account.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await auth.expectInvalidCredentials();

    await auth.login({ email: account.email, password: newPassword });

    await oldSessionPage.getByRole("link", { name: "Lớp của tôi" }).click();
    await expect(oldSessionPage).toHaveURL(/\/login$/);
    await expect(
      oldSessionPage
        .getByRole("alert")
        .filter({ hasText: "Phiên đăng nhập đã hết hạn" }),
    ).toBeVisible();
    await oldSessionContext.close();
  });

  test("shows invalid login feedback and blocks users from admin routes", async ({
    page,
  }) => {
    const auth = new AuthPage(page);

    await page.goto("/login");
    await page.getByLabel("Email đăng ký").fill(seededUser.email);
    await page
      .getByLabel("Mật khẩu", { exact: true })
      .fill("WrongPassword123!");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await auth.expectInvalidCredentials();

    await auth.login(seededUser);
    await page.goto("/admin/classes");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(
      page.getByRole("heading", { name: "Bạn không có quyền truy cập" }),
    ).toBeVisible();
  });

  test("shows inline registration validation for a weak password and duplicate email", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Họ tên học viên").fill("E2E Duplicate Student");
    await page.getByLabel("Email đăng ký").fill(seededUser.email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill("weak");
    await page.getByRole("button", { name: "Tạo tài khoản học viên" }).click();
    await expect(page.getByText("Mật khẩu cần ít nhất 8 ký tự")).toBeVisible();

    await page.getByLabel("Mật khẩu", { exact: true }).fill("ValidE2E123!");
    await page.getByRole("checkbox", { name: /Tôi đã đọc và đồng ý/ }).check();
    await page.getByRole("button", { name: "Tạo tài khoản học viên" }).click();
    await expect(page.getByText("Email này đã được đăng ký.")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test("blocks an admin from the student-only class list", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login(seededAdmin, /\/admin\/classes$/);
    await page.goto("/my-classes");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(
      page.getByRole("heading", { name: "Bạn không có quyền truy cập" }),
    ).toBeVisible();
  });
});
