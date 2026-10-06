import { expect, type Page } from "@playwright/test";

export class ClassDetailPage {
  constructor(private readonly page: Page) {}

  async expectStudentCount(current: number, maximum: number): Promise<void> {
    await expect(
      this.page.getByText(`${current}/${maximum} học viên`, { exact: true }),
    ).toBeVisible();
  }

  async enroll(): Promise<void> {
    await this.page.getByRole("button", { name: "Đăng ký lớp học" }).click();
    await expect(
      this.page
        .getByRole("status")
        .filter({ hasText: "Bạn đã đăng ký lớp học" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Hủy đăng ký" }),
    ).toBeVisible();
  }

  async cancel(): Promise<void> {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.page.getByRole("button", { name: "Hủy đăng ký" }).click();
    await expect(
      this.page.getByRole("status").filter({ hasText: "Đã hủy đăng ký lớp" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Đăng ký lớp học" }),
    ).toBeVisible();
  }
}
