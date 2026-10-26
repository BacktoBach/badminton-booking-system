import { describe, expect, it } from 'vitest'
import { parseVietQR } from '@viet-qr/core'
import { createPaymentQrPayload } from '../../../src/utils/payment-qr'

describe('createPaymentQrPayload', () => {
  it('prefills the exact bank transfer details for the pending payment', () => {
    const payload = createPaymentQrPayload({
      bankCode: 'MB',
      accountNumber: '599888889999',
      accountName: 'LE VAN BACH',
      amountVnd: 5000,
      paymentCode: 'BC9298D4609B7B5168',
    })

    expect(parseVietQR(payload)).toMatchObject({
      isValid: true,
      isDynamic: true,
      beneficiary: {
        bankBin: '970422',
        accountNo: '599888889999',
        accountName: 'LE VAN BACH',
      },
      transaction: { amount: 5000, content: 'BC9298D4609B7B5168' },
    })
  })
})
