type PaymentQrDetails = {
  bankCode: string
  accountNumber: string
  accountName: string
  amountVnd: number
  paymentCode: string
}

export function createPaymentQrPayload(details: PaymentQrDetails): string {
  return generateVietQR({
    bankId: details.bankCode,
    accountNo: details.accountNumber,
    accountName: details.accountName,
    amount: details.amountVnd,
    content: details.paymentCode,
  })
}
import { generateVietQR } from '@viet-qr/core'
