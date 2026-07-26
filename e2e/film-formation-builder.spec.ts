import { test, expect } from '@playwright/test'

test('coach can locate 11 players one route at a time and generate a formation map', async ({ page }) => {
  await page.goto('/#/film')
  await expect(page.getByRole('heading', { name: /Film Room/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Track players/i }).click()
  await page.getByRole('button', { name: 'Set formation start' }).click()

  const canvas = page.locator('canvas').first()
  const positions = [
    [60, 90], [90, 90], [120, 90], [150, 90], [180, 90],
    [210, 90], [240, 90], [80, 130], [140, 130], [200, 130], [260, 130],
  ]
  for (let index = 0; index < 11; index += 1) {
    await page.getByLabel('Formation position').fill(`P${index + 1}`)
    await page.getByLabel('Player track label').fill(`Player ${index + 1}`)
    await page.getByRole('button', { name: new RegExp(`Add player ${index + 1}/11`) }).click()
    await canvas.click({ position: { x: positions[index][0], y: positions[index][1] } })
    await page.getByRole('button', { name: 'Finish & save route' }).click()
  }

  await expect(page.getByTestId('formation-board').getByText('11/11 located')).toBeVisible()
  await expect(page.getByText('Formation ready ✓')).toBeVisible()
  await expect(page.getByTestId('formation-player')).toHaveCount(11)
})
