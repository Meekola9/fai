import { test, expect } from '@playwright/test'

test('tag a film play and the tendency report updates', async ({ page }) => {
  await page.goto('/#/film')
  await expect(page.getByRole('heading', { name: /Film Room/ })).toBeVisible({ timeout: 15000 })

  // Empty state until the first play is charted.
  await expect(page.getByText(/No plays charted yet/)).toBeVisible()

  // Tag a 3rd & short run vs an opponent.
  await page.getByPlaceholder('Opponent').fill('Central')
  await page.locator('select').filter({ hasText: 'Down…' }).selectOption('3')
  await page.getByPlaceholder('Distance (yds)').fill('2')
  await page.locator('select').filter({ hasText: 'Play type…' }).selectOption('run')
  await page.getByRole('button', { name: /Log Play/ }).click()

  // Scouting report replaces the empty state and shows the down & distance group.
  await expect(page.getByText(/No plays charted yet/)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /By Down & Distance/ })).toBeVisible()
  await expect(page.getByText('3rd & Short (1–3)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Charted Plays' })).toBeVisible()
})
