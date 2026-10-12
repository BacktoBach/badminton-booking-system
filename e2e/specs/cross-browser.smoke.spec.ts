import { expect, test } from "@playwright/test";
import { emptyAuthState } from "../support/auth-state";
import { seededClasses } from "../support/test-data";

test.use({ storageState: emptyAuthState });

test("loads class discovery and a class detail page for a guest", async ({
  page,
}) => {
  await page.goto("/classes");
  await expect(
    page.getByRole("heading", { name: /Tìm lớp cầu lông/ }),
  ).toBeVisible();
  await page.goto(`/classes/${seededClasses.booking.id}`);
  await expect(
    page.getByRole("heading", {
      name: seededClasses.booking.title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("class-capacity")).toContainText("/4 học viên");
});
