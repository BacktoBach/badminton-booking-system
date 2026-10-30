import { expect, type Locator, type Page } from "@playwright/test";

export class ClassListPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto("/classes");
    await expect(
      this.page.getByRole("heading", { name: /Tìm lớp cầu lông/ }),
    ).toBeVisible();
  }

  card(title: string): Locator {
    return this.page.getByTestId("class-card").filter({
      has: this.page.getByRole("heading", { name: title, exact: true }),
    });
  }

  async search(title: string): Promise<void> {
    await this.page.getByPlaceholder("Tìm theo tên lớp...").fill(title);
    await expect
      .poll(() => new URL(this.page.url()).searchParams.get("search"))
      .toBe(title);
  }

  async filterByLevel(
    label: "Cơ bản" | "Trung cấp" | "Nâng cao",
  ): Promise<void> {
    await this.page.getByLabel("Lọc trình độ").selectOption({ label });
    await expect(this.page).toHaveURL(/level=/);
  }

  async openClass(title: string): Promise<void> {
    const card = this.card(title);
    await expect(card).toBeVisible();
    await card.getByRole("link", { name: "Xem chi tiết" }).click();
    await expect(
      this.page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }

  async cancelEnrollment(title: string): Promise<void> {
    const enrollment = this.card(title).locator("..");
    await enrollment.getByRole("button", { name: "Hủy đăng ký" }).click();
    await this.page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Xác nhận" })
      .click();
    await expect(
      this.page.getByRole("status").filter({ hasText: "Đã hủy đăng ký lớp" }),
    ).toBeVisible();
    await expect(this.card(title)).toHaveCount(0);
  }
}
