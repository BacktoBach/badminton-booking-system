import { expect, type Page } from "@playwright/test";

type Credentials = { email: string; password: string };
type Registration = Credentials & { name: string };

export class AuthPage {
  constructor(private readonly page: Page) {}

  async register(user: Registration): Promise<void> {
    await this.page.goto("/register");
    await this.page.getByLabel("Họ tên học viên").fill(user.name);
    await this.page.getByLabel("Email đăng ký").fill(user.email);
    await this.page.getByLabel("Mật khẩu", { exact: true }).fill(user.password);
    await this.page
      .getByRole("button", { name: "Tạo tài khoản học viên" })
      .click();
    await expect(this.page).toHaveURL(/\/login$/);
    await expect(
      this.page.getByRole("status").filter({ hasText: "Đăng ký thành công" }),
    ).toBeVisible();
  }

  async login(
    credentials: Credentials,
    expectedPath: RegExp = /\/classes$/,
  ): Promise<void> {
    await this.page.goto("/login");
    await this.page.getByLabel("Email đăng ký").fill(credentials.email);
    await this.page
      .getByLabel("Mật khẩu", { exact: true })
      .fill(credentials.password);
    await this.page
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .click();
    await expect(this.page).toHaveURL(expectedPath);
  }

  async expectInvalidCredentials(): Promise<void> {
    await expect(
      this.page
        .getByRole("alert")
        .filter({ hasText: "Email hoặc mật khẩu không chính xác" }),
    ).toBeVisible();
  }

  async logout(userName: string): Promise<void> {
    await this.page.getByText(userName, { exact: true }).click();
    await this.page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(this.page).toHaveURL(/\/login$/);
  }

  async changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.page.goto("/change-password");
    await this.page.getByLabel("Mật khẩu hiện tại").fill(oldPassword);
    await this.page
      .getByLabel("Mật khẩu mới", { exact: true })
      .fill(newPassword);
    await this.page.getByLabel("Xác nhận mật khẩu mới").fill(newPassword);
    await this.page.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
    await expect(this.page).toHaveURL(/\/login$/);
  }
}
