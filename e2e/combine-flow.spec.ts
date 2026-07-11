import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('fai:data:v1')
    localStorage.setItem(
      'fai:data:v2',
      JSON.stringify({ athletes: [], events: [], sessions: [] }),
    )
  })
})

async function fillPlaceholder(page: Parameters<typeof test>[0] extends never ? never : any, placeholder: string, value: string) {
  await page.getByPlaceholder(placeholder, { exact: true }).fill(value)
}

test('coach completes a three-day combine and publishes an official FAI result', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Football Athlete Index', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Athletes', exact: true }).click()
  await page.getByRole('link', { name: '+ Add Athlete', exact: true }).click()

  await page.getByPlaceholder('Athlete name').fill('QA Athlete')
  await page.locator('select').nth(0).selectOption('11')
  await page.locator('select').nth(1).selectOption('WR')
  await page.getByPlaceholder('e.g. Slot WR').fill('Slot WR')
  await page.getByPlaceholder(`6'2"`).fill(`6'0"`)
  await page.getByPlaceholder('185').fill('185')
  await page.getByRole('button', { name: 'Create Athlete' }).click()

  await expect(page.getByRole('heading', { name: 'QA Athlete' })).toBeVisible()
  await page.getByRole('link', { name: 'Enter Testing', exact: true }).click()

  await page.getByRole('button', { name: '+ New Event' }).click()
  await page.getByPlaceholder('Summer Combine 2026').fill('QA Summer Combine 2026')
  await page.locator('select').first().selectOption('Baseline')
  await page.locator('input[type="date"]').first().fill('2026-07-06')
  await page.getByRole('button', { name: 'Create Event' }).click()

  // Monday — speed and bench.
  await page.locator('input[type="date"]').fill('2026-07-06')
  await fillPlaceholder(page, '225', '225')
  await fillPlaceholder(page, '4.98', '4.70')
  await fillPlaceholder(page, '5.02', '4.66')
  await fillPlaceholder(page, '1.55', '1.54')
  await fillPlaceholder(page, '1.58', '1.51')
  await page.getByRole('button', { name: 'Save Event Entry' }).click()
  await expect(page.getByText('✓ Saved locally')).toBeVisible()

  // Tuesday — clean endurance and change of direction.
  await page.locator('input[type="date"]').fill('2026-07-07')
  await fillPlaceholder(page, '8', '10')
  await fillPlaceholder(page, '4.35', '4.35')
  await fillPlaceholder(page, '4.41', '4.31')
  await fillPlaceholder(page, '2.80', '2.85')
  await fillPlaceholder(page, '2.85', '2.80')
  await fillPlaceholder(page, '16.20', '16.00')
  await page.getByRole('button', { name: 'Save Event Entry' }).click()
  await expect(page.getByText('✓ Saved locally')).toBeVisible()

  // Wednesday — lower-body strength, jumps, and optional conditioning.
  await page.locator('input[type="date"]').fill('2026-07-08')
  await fillPlaceholder(page, '405', '365')
  await fillPlaceholder(page, '108', '118')
  await fillPlaceholder(page, '32', '34')
  await fillPlaceholder(page, '150', '160')
  await page.getByRole('button', { name: 'Save Event Entry' }).click()
  await expect(page.getByText('✓ Saved locally')).toBeVisible()

  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) throw new Error('FAI data was not persisted')
    return JSON.parse(raw) as {
      athletes: unknown[]
      events: unknown[]
      sessions: unknown[]
    }
  })
  expect(persisted.athletes).toHaveLength(1)
  expect(persisted.events).toHaveLength(1)
  expect(persisted.sessions).toHaveLength(3)

  await page.getByRole('link', { name: 'Athletes', exact: true }).click()
  await page.getByRole('link', { name: 'QA Athlete', exact: true }).click()
  await expect(page.getByText('Official score')).toBeVisible()
  await expect(page.getByText('Team Rank #1 / 1')).toBeVisible()
  await expect(page.getByText(/QA Summer Combine 2026/)).toBeVisible()

  await page.getByRole('link', { name: 'Leaderboards', exact: true }).click()
  await expect(page.getByRole('link', { name: 'QA Athlete', exact: true })).toBeVisible()

  await page.getByRole('link', { name: /TV Mode/ }).click()
  await expect(page.getByText('Overall FAI', { exact: true })).toBeVisible()
  await expect(page.getByText('QA Athlete', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '✕ Exit' }).click()

  await page.getByRole('link', { name: 'Data', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export All Data (CSV)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^fai-export-.*\.csv$/)
})
