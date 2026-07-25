import { test, expect } from '@playwright/test'

test('bulk import lets a coach resolve an unmatched name before importing', async ({ page }) => {
  await page.goto('/#/import')
  await expect(page.getByRole('heading', { name: 'Bulk Import' })).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: 'Results only' }).click()
  await page.getByPlaceholder(/Paste rows/).fill(
    'athlete,testing date,bench\nUnknown Alias,2026-07-15,225',
  )
  await page.getByRole('button', { name: 'Parse data' }).click()

  const selector = page.getByRole('combobox', { name: 'Match Unknown Alias' })
  await expect(selector).toBeVisible()
  const values = await selector.locator('option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
  )
  expect(values.length).toBeGreaterThan(0)
  await selector.selectOption(values[0])

  await expect(page.getByText(/Match applied to this import|Saved .* as an alias/)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Include Unknown Alias' })).toBeEnabled()
  const reviewRow = page.getByRole('row').filter({ hasText: 'Unknown Alias' })
  await expect(reviewRow.getByText('Ready', { exact: true })).toBeVisible()
})
