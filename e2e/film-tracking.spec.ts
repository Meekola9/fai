import { test, expect } from '@playwright/test'

test('coach can create a player track and place a timed keyframe', async ({ page }) => {
  await page.goto('/#/film')
  await expect(page.getByRole('heading', { name: /Film Room/i })).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: /Track players/i }).click()
  await expect(page.getByText('11-player auto-follow and formation builder')).toBeVisible()

  await page.getByLabel('Player track label').fill('Boundary WR')
  await page.getByRole('button', { name: 'Add player 1/11' }).click()
  await expect(page.getByRole('button', { name: 'Select track Boundary WR' })).toBeVisible()
  await expect(page.getByText(/Active: Boundary WR · 0 confirmed/)).toBeVisible()

  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await canvas.click({ position: { x: 160, y: 100 } })

  await expect(page.getByText(/Active: Boundary WR · 1 confirmed/)).toBeVisible()
  await expect(page.getByText(/Manual point saved at/)).toBeVisible()
})
