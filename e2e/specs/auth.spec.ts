import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { seededUser } from "../support/test-data";

test.describe("Authentication and session management", () => {
  test("registers, logs in, changes password and revokes another active session", async ({
    page,
    browser,
  }) => {
    const auth = new AuthPage(page);
    const unique = `${Date.now()}-${test.info().retry}`;
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

    await oldSessionPage.goto("/my-classes");
    await expect(oldSessionPage).toHaveURL(/\/login$/);
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
});
