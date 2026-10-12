import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { emptyAuthState } from "../support/auth-state";
import { seededUser } from "../support/test-data";

test.use({ storageState: emptyAuthState });

test("redirects a guest from my classes to login and returns after authentication", async ({
  page,
}) => {
  const auth = new AuthPage(page);
  await page.goto("/my-classes?status=all&page=1");
  await expect(page).toHaveURL(/\/login$/);

  await auth.submitLogin(seededUser, /\/my-classes\?status=all&page=1$/);
  await expect(
    page.getByRole("heading", { name: "Lớp của tôi" }),
  ).toBeVisible();
});

test("renders a friendly not-found page for unknown routes", async ({
  page,
}) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByText("404", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy trang" }),
  ).toBeVisible();
});
