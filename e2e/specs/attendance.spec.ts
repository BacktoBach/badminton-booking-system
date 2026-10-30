import { expect, test } from '@playwright/test'
import { adminAuthStatePath, userAuthStatePath } from '../support/auth-state'

test.use({ storageState: adminAuthStatePath })

test('an enrolled student checks in through the admin QR link', async ({ page, browser }) => {
  const origin = 'http://127.0.0.1:5173'
  const title = `E2E Check-in ${Date.now()}`
  const created = await page.request.post('/api/classes', {
    headers: { Origin: origin },
    data: {
      title,
      description: 'Lớp kiểm thử điểm danh bằng mã QR trong khung giờ hợp lệ.',
      coachName: 'Coach E2E',
      level: 'beginner',
      startDate: new Date(Date.now() + 5 * 60_000).toISOString(),
      schedule: 'Hôm nay - kiểm thử điểm danh',
      location: 'Sân E2E',
      maxStudents: 4,
      tuitionVnd: 0,
    },
  })
  expect(created.ok()).toBe(true)
  const { data: createdClass } = (await created.json()) as { data: { id: string } }
  const studentContext = await browser.newContext({ storageState: userAuthStatePath })

  try {
    const enrolled = await studentContext.request.post(
      `/api/classes/${createdClass.id}/enrollments`,
      { headers: { Origin: origin } },
    )
    expect(enrolled.ok()).toBe(true)

    const qrResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/admin/classes/${createdClass.id}/check-in-qr`),
    )
    await page.goto(`/admin/classes/${createdClass.id}/attendance`)
    const response = await qrResponse
    expect(response.ok()).toBe(true)
    await expect(page.getByLabel('Mã QR điểm danh')).toBeVisible()
    const { data: qr } = (await response.json()) as { data: { token: string } }

    const studentPage = await studentContext.newPage()
    await studentPage.goto(`/check-in/${createdClass.id}?token=${encodeURIComponent(qr.token)}`)
    await studentPage.getByRole('button', { name: 'Xác nhận có mặt' }).click()
    await expect(studentPage.getByRole('status')).toContainText('Đã điểm danh lúc')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Học viên đã điểm danh: 1/1' })).toBeVisible()
  } finally {
    await studentContext.close()
    await page.request.delete(`/api/classes/${createdClass.id}`, { headers: { Origin: origin } })
  }
})
