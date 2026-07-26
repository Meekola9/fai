import { test, expect } from '@playwright/test'

test('coach can mark throw timing, calculate speed, and chart release mechanics', async ({ page }) => {
  await page.goto('/#/film')
  await expect(page.getByRole('heading', { name: /Film Room/i })).toBeVisible({ timeout: 15000 })

  const video = page.locator('video').first()
  await video.evaluate((element) => {
    Object.defineProperty(element, 'duration', { configurable: true, value: 10 })
    Object.defineProperty(element, 'currentTime', { configurable: true, writable: true, value: 0 })
    element.dispatchEvent(new Event('loadedmetadata'))
  })

  await page.getByRole('button', { name: /Throw analysis/i }).click()
  await expect(page.getByText('QB throw mechanics, speed, and type')).toBeVisible()

  const scrubber = page.getByLabel('Scrub video')
  await scrubber.fill('1')
  await page.getByRole('button', { name: 'Mark snap' }).click()
  await scrubber.fill('2.2')
  await page.getByRole('button', { name: 'Mark plant' }).click()
  await scrubber.fill('2.5')
  await page.getByRole('button', { name: 'Mark release' }).click()
  await scrubber.fill('3.5')
  await page.getByRole('button', { name: 'Mark arrival' }).click()

  await page.getByLabel('Throw distance yards').fill('30')
  await page.getByLabel('Throw family').selectOption('quick-game')
  await page.getByLabel('Throw trajectory').selectOption('bullet')
  await page.getByLabel('Throw platform').selectOption('on-platform')

  const metrics = page.getByLabel('Throw analysis metrics')
  await expect(metrics).toContainText('1.50s')
  await expect(metrics).toContainText('61.4 mph')

  await page.getByRole('button', { name: 'Throwing shoulder' }).click()
  const canvas = page.locator('canvas').first()
  await canvas.click({ position: { x: 180, y: 110 } })
  await expect(page.getByText(/Throwing shoulder marked/i)).toBeVisible()
  await expect(page.getByText('1/8 landmarks')).toBeVisible()
})
