import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { adminAuthStatePath, userAuthStatePath } from "../support/auth-state";
import { seededAdmin, seededUser } from "../support/test-data";

test("save reusable admin authentication state", async ({ page }) => {
  await mkdir(dirname(adminAuthStatePath), { recursive: true });
  await new AuthPage(page).login(seededAdmin, /\/admin\/classes$/);
  await expect(page.getByText(seededAdmin.name, { exact: true })).toBeVisible();
  await page.context().storageState({ path: adminAuthStatePath });
});

test("save reusable student authentication state", async ({ page }) => {
  await mkdir(dirname(userAuthStatePath), { recursive: true });
  await new AuthPage(page).login(seededUser);
  await expect(page.getByText(seededUser.name, { exact: true })).toBeVisible();
  await page.context().storageState({ path: userAuthStatePath });
});
