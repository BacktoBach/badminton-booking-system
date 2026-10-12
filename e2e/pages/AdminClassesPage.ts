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
  private readonly weekdays = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];

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
    await this.setSchedule(changes.schedule);
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

  async rejectCapacityBelowEnrollmentCount(
    title: string,
    maxStudents: number,
  ): Promise<void> {
    await this.row(title)
      .getByRole("link", { name: `Chỉnh sửa lớp ${title}` })
      .click();
    await this.page.getByLabel("Số học viên tối đa").fill(String(maxStudents));
    await this.page.getByRole("button", { name: "Lưu lớp học" }).click();
    await expect(
      this.page.getByRole("alert").filter({
        hasText: "Sức chứa không thể thấp hơn số học viên hiện tại",
      }),
    ).toBeVisible();
    await expect(this.page).toHaveURL(/\/edit$/);
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
    await this.setStartDate(data.startDate);
    await this.page
      .getByLabel("Số học viên tối đa")
      .fill(String(data.maxStudents));
    await this.setSchedule(data.schedule);
    await this.page.getByLabel("Địa điểm").fill(data.location);
    const titleInput = this.page.getByLabel("Tên lớp");
    await titleInput.fill(data.title);
    await expect(titleInput).toHaveValue(data.title);
  }

  async setStartDate(dateTime: string): Promise<void> {
    const [datePart, timePart = "19:00"] = dateTime.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":");
    await this.page
      .getByRole("button", { name: "Ngày khai giảng (giờ VN)" })
      .click();

    const displayedMonth = await this.page
      .getByTestId("startDate-picker-month")
      .getAttribute("data-month");
    const [currentYear, currentMonth] = displayedMonth!.split("-").map(Number);
    const monthDelta = (year - currentYear) * 12 + month - currentMonth;
    const monthButton = monthDelta < 0 ? "Tháng trước" : "Tháng sau";
    for (let index = 0; index < Math.abs(monthDelta); index += 1) {
      await this.page.getByRole("button", { name: monthButton }).click();
    }

    await this.page
      .getByRole("button", { name: `Chọn ngày ${day}/${month}/${year}` })
      .click();
    await this.page.getByLabel("Giờ", { exact: true }).selectOption(hour);
    await this.page.getByLabel("Phút", { exact: true }).selectOption(minute);
    await this.page.getByRole("button", { name: "Xong" }).click();
  }

  async setSchedule(schedule: string): Promise<void> {
    const selectedDays = this.weekdays.filter((weekday) =>
      schedule.includes(weekday),
    );
    const time = schedule.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
    for (const weekday of this.weekdays) {
      const button = this.page.getByRole("button", {
        name: weekday,
        exact: true,
      });
      const selected = (await button.getAttribute("aria-pressed")) === "true";
      if (selected !== selectedDays.includes(weekday)) await button.click();
    }
    if (selectedDays.length && time) {
      await this.page.getByLabel("Giờ học").selectOption(time[1]);
      await this.page.getByLabel("Phút học").selectOption(time[2]);
    }
  }
}
