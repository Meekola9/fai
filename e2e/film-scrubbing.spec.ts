import { test, expect } from '@playwright/test'

test('coach can scrub Film Room video with the external timeline', async ({ page }) => {
  await page.goto('/#/film')
  await expect(page.getByRole('heading', { name: /Film Room/i })).toBeVisible({ timeout: 15000 })

  const video = page.locator('video').first()
  await video.evaluate((element) => {
    Object.defineProperty(element, 'duration', { configurable: true, value: 20 })
    Object.defineProperty(element, 'currentTime', { configurable: true, writable: true, value: 0 })
    element.dispatchEvent(new Event('loadedmetadata'))
  })

  const scrubber = page.getByLabel('Scrub video')
  await expect(scrubber).toBeEnabled()
  await scrubber.fill('12.5')

  await expect(page.getByTestId('video-time-display')).toContainText('0:12.50 / 0:20.00')
  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeCloseTo(12.5, 2)

  await page.getByRole('button', { name: 'Back 5 seconds' }).click()
  await expect(page.getByTestId('video-time-display')).toContainText('0:07.50 / 0:20.00')
})
