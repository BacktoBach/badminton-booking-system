import { expect, type Locator, type Page } from "@playwright/test";

export type ClassFormData = {
  title: string;
  description: string;
  coachName: string;
  level: "Cơ bản" | "Trung cấp" | "Nâng cao";
  startDate: string;
  maxStudents: number;
  schedule: string;
  location: string;
};

export class AdminClassesPage {
  constructor(private readonly page: Page) {}

  row(title: string): Locator {
    return this.page.getByRole("row").filter({ hasText: title });
  }

  async open(): Promise<void> {
    await this.page.goto("/admin/classes");
    await expect(
      this.page.getByRole("heading", { name: "Quản lý lớp học" }),
    ).toBeVisible();
  }

  async search(title: string): Promise<void> {
    await this.page.getByPlaceholder("Tìm theo tên lớp...").fill(title);
    await expect
      .poll(() => new URL(this.page.url()).searchParams.get("search"))
      .toBe(title);
    await expect(this.row(title)).toBeVisible();
  }

  async createClass(data: ClassFormData): Promise<void> {
    await this.page.getByRole("link", { name: "Tạo lớp mới" }).click();
    await this.fillForm(data);
    await this.page.getByRole("button", { name: "Lưu lớp học" }).click();
    await expect(this.page).toHaveURL(/\/admin\/classes$/);
    await expect(
      this.page.getByRole("status").filter({ hasText: "Đã tạo lớp học" }),
    ).toBeVisible();
  }

  async editClass(
    title: string,
    changes: Pick<ClassFormData, "location" | "schedule" | "maxStudents">,
  ): Promise<void> {
    await this.row(title)
      .getByRole("link", { name: `Chỉnh sửa lớp ${title}` })
      .click();
    await this.page.getByLabel("Địa điểm").fill(changes.location);
    await this.page.getByLabel("Lịch học").fill(changes.schedule);
    await this.page
      .getByLabel("Số học viên tối đa")
      .fill(String(changes.maxStudents));
    await this.page.getByRole("button", { name: "Lưu lớp học" }).click();
    await expect(this.page).toHaveURL(/\/admin\/classes$/);
    await expect(
      this.page.getByRole("status").filter({ hasText: "Đã cập nhật lớp học" }),
    ).toBeVisible();
  }

  async openStudents(title: string): Promise<void> {
    await this.row(title)
      .getByRole("link", { name: `Xem học viên lớp ${title}` })
      .click();
    await expect(
      this.page.getByRole("heading", { name: "Danh sách học viên" }),
    ).toBeVisible();
  }

  async deleteClass(title: string): Promise<void> {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.row(title)
      .getByRole("button", { name: `Xóa lớp ${title}` })
      .click();
    await expect(
      this.page.getByRole("status").filter({ hasText: "Đã xóa lớp học" }),
    ).toBeVisible();
    await expect(this.row(title)).toHaveCount(0);
  }

  private async fillForm(data: ClassFormData): Promise<void> {
    await this.page.getByLabel("Mô tả").fill(data.description);
    await this.page.getByLabel("Huấn luyện viên").fill(data.coachName);
    await this.page.getByLabel("Trình độ").selectOption({ label: data.level });
    await this.page.getByLabel("Ngày khai giảng (giờ VN)").fill(data.startDate);
    await this.page
      .getByLabel("Số học viên tối đa")
      .fill(String(data.maxStudents));
    await this.page.getByLabel("Lịch học").fill(data.schedule);
    await this.page.getByLabel("Địa điểm").fill(data.location);
    const titleInput = this.page.getByLabel("Tên lớp");
    await titleInput.fill(data.title);
    await expect(titleInput).toHaveValue(data.title);
  }
}
