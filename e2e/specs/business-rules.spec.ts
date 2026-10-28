import { expect, test } from "@playwright/test";
import { seededClasses } from "../support/test-data";
import { userAuthStatePath } from "../support/auth-state";

test.use({ storageState: userAuthStatePath });

test.describe("Booking business rules", () => {
  test("disables enrollment when a class is full", async ({ page }) => {
    await page.goto(`/classes/${seededClasses.full.id}`);

    await expect(
      page.getByText("Lớp đã đủ chỗ", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("1/1 học viên", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Đăng ký lớp học" }),
    ).toBeDisabled();
  });

  test("does not allow cancellation after a class has started", async ({
    page,
  }) => {
    await page.goto(`/classes/${seededClasses.past.id}`);

    await expect(
      page.getByText("Lớp đã bắt đầu", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Hủy đăng ký" })).toHaveCount(0);
    await page.goto("/my-classes?status=past&page=1");
    await expect(
      page.getByRole("heading", { name: seededClasses.past.title }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Hủy đăng ký" })).toHaveCount(
      0,
    );
  });
});
