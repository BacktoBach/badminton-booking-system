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
    return this.page.getByRole("article").filter({
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
}
