import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { userAuthStatePath } from "../support/auth-state";
import { seededClasses } from "../support/test-data";

const webhookSecret = "e2e-only-sepay-webhook-secret-32-characters";

test.use({ storageState: userAuthStatePath });

test("holds a paid seat and confirms enrollment after a signed SePay event", async ({
  page,
  request,
}) => {
  await page.goto(`/classes/${seededClasses.paid.id}`);
  await page.getByRole("button", { name: "Đăng ký lớp học" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/payments/${seededClasses.paid.id}$`),
  );
  await expect(
    page.getByRole("heading", { name: "Thanh toán học phí" }),
  ).toBeVisible();

  const paymentResponse = await page.request.get(
    `http://127.0.0.1:4000/api/payments/${seededClasses.paid.id}`,
  );
  expect(paymentResponse.ok()).toBeTruthy();
  const { data: payment } = (await paymentResponse.json()) as {
    data: { paymentCode: string; amountVnd: number; status: string };
  };
  expect(payment.status).toBe("pending");
  expect(payment.amountVnd).toBe(120000);
  await expect(
    page.getByText(payment.paymentCode, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("120.000 ₫", { exact: true })).toBeVisible();

  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify({
    id: 750001,
    accountNumber: "0000000000",
    transferType: "in",
    transferAmount: payment.amountVnd,
    content: payment.paymentCode,
    code: payment.paymentCode,
    referenceCode: "E2E-750001",
  });
  const signature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const webhookResponse = await request.post(
    "http://127.0.0.1:4000/api/payments/webhooks/sepay",
    {
      data: body,
      headers: {
        "Content-Type": "application/json",
        "X-SePay-Timestamp": timestamp,
        "X-SePay-Signature": `sha256=${signature}`,
      },
    },
  );
  expect(webhookResponse.status()).toBe(200);
  await expect(
    page.getByText("Đã nhận thanh toán và ghi danh thành công."),
  ).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("link", { name: "Về lớp học" }).click();
  await expect(
    page.getByText("Bạn đã thanh toán và ghi danh.", { exact: false }),
  ).toBeVisible();
});
