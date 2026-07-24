import { test, expect } from '@playwright/test'

test('bulk import: paste, map, review, and commit a new athlete + result', async ({ page }) => {
  await page.goto('/#/import')
  await expect(page.getByRole('heading', { name: 'Bulk Import' })).toBeVisible({ timeout: 15000 })

  // Combined mode is the default. Paste a header row + one new athlete with results.
  const csv = 'name,pos,grade,testing date,bench,40 time\nZzTest Importer,WR,11,2026-07-15,225,4.70'
  await page.getByPlaceholder(/Paste rows/).fill(csv)
  await page.getByRole('button', { name: 'Parse data' }).click()

  // Mapping + review steps render, and the athlete shows as a ready new-athlete row.
  await expect(page.getByRole('heading', { name: /Map columns/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'ZzTest Importer', exact: true })).toBeVisible()
  await expect(page.getByText('New athlete', { exact: true })).toBeVisible()

  // Combined mode needs a named event.
  await page.getByPlaceholder(/Event name/).fill('E2E Import Testing')
  await page.getByRole('button', { name: /Import 1 row/ }).click()

  await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible()
  await expect(page.getByText('Athletes created')).toBeVisible()

  // The new athlete is now on the roster.
  await page.goto('/#/athletes')
  await expect(page.getByText('ZzTest Importer').first()).toBeVisible({ timeout: 10000 })
})
