import { expect, test } from "@playwright/test";
import { emptyAuthState } from "../support/auth-state";
import { seededClasses } from "../support/test-data";

test.use({ storageState: emptyAuthState });

test("class discovery and detail remain usable at a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/classes");
  await expect(
    page.getByRole("heading", { name: /Tìm lớp cầu lông/ }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Tìm theo tên lớp...")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  await page.goto(`/classes/${seededClasses.booking.id}`);
  await expect(
    page.getByRole("heading", {
      name: seededClasses.booking.title,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đăng nhập để đăng ký" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
