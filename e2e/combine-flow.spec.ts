import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('fai:data:v1')
    localStorage.removeItem('fai:data:v2')
  })
})

async function waitForHistoricalSeed(page: Page) {
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) return false
    const data = JSON.parse(raw) as { athletes?: unknown[]; events?: unknown[]; sessions?: unknown[] }
    return data.athletes?.length === 158 && data.events?.length === 20 && data.sessions?.length === 670
  })
}

async function fillPlaceholder(page: Page, placeholder: string, value: string) {
  await page.getByPlaceholder(placeholder, { exact: true }).fill(value)
}

test('fresh browser automatically loads 2020–2026 history and shows one exercise list', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Football Athlete Index', { exact: true })).toBeVisible()
  await waitForHistoricalSeed(page)

  const seeded = await page.evaluate(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) throw new Error('Historical FAI data was not persisted')
    return JSON.parse(raw) as {
      athletes: { name: string }[]
      events: { startDate: string }[]
      sessions: unknown[]
    }
  })

  expect(seeded.athletes).toHaveLength(158)
  expect(seeded.events).toHaveLength(20)
  expect(seeded.sessions).toHaveLength(670)
  expect(
    [...new Set(seeded.events.map((event) => Number(event.startDate.slice(0, 4))))].sort(
      (a, b) => a - b,
    ),
  ).toEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026])

  const names = new Set(seeded.athletes.map((athlete) => athlete.name))
  expect(names.has('Jude Nelson')).toBe(true)
  expect(names.has('Dillion Evans')).toBe(true)
  expect(names.has('Logan Cross')).toBe(true)
  expect(names.has('J. Nelson')).toBe(false)
  expect(names.has('D.Evans')).toBe(false)
  expect(names.has('Lu. Cross')).toBe(false)
  expect(names.has('Lo. Cross')).toBe(false)

  await page.getByRole('link', { name: 'Enter Testing', exact: true }).click()
  await expect(page.getByText('Testing Exercises', { exact: true })).toBeVisible()
  await expect(page.getByText('Exercises are no longer tied to a weekday.')).toBeVisible()
  await expect(page.getByText('Monday', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Tuesday', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Wednesday', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Thursday', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Friday', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Optional', { exact: true })).toHaveCount(0)
})

test('coach adds a complete testing event without losing historical data', async ({ page }) => {
  await page.goto('/')
  await waitForHistoricalSeed(page)

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
  await page.getByRole('link', { name: '+ Testing', exact: true }).click()

  await page.getByRole('button', { name: '+ New Event' }).click()
  await page.getByPlaceholder('Summer Combine 2026').fill('QA Summer Combine 2026')
  await page.locator('select').first().selectOption('Baseline')
  await page.locator('input[type="date"]').first().fill('2026-07-06')
  await page.getByRole('button', { name: 'Create Event' }).click()

  // First partial entry: speed and bench.
  await page.locator('input[type="date"]').fill('2026-07-06')
  await fillPlaceholder(page, '225', '225')
  await fillPlaceholder(page, '4.98', '4.70')
  await fillPlaceholder(page, '5.02', '4.66')
  await fillPlaceholder(page, '1.55', '1.54')
  await fillPlaceholder(page, '1.58', '1.51')
  await page.getByRole('button', { name: 'Save Event Entry' }).click()
  await expect(page.getByText('✓ Saved locally')).toBeVisible()

  // Second partial entry: clean endurance and change of direction.
  await page.locator('input[type="date"]').fill('2026-07-07')
  await fillPlaceholder(page, '8', '10')
  await fillPlaceholder(page, '4.35', '4.35')
  await fillPlaceholder(page, '4.41', '4.31')
  await fillPlaceholder(page, '2.80', '2.85')
  await fillPlaceholder(page, '2.85', '2.80')
  await fillPlaceholder(page, '16.20', '16.00')
  await page.getByRole('button', { name: 'Save Event Entry' }).click()
  await expect(page.getByText('✓ Saved locally')).toBeVisible()

  // Third partial entry: lower-body strength, jumps, and conditioning.
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
  expect(persisted.athletes).toHaveLength(159)
  expect(persisted.events).toHaveLength(21)
  expect(persisted.sessions).toHaveLength(673)

  await page.getByRole('link', { name: 'Athletes', exact: true }).click()
  await page.getByRole('link', { name: 'QA Athlete', exact: true }).click()
  await expect(page.getByText('Official score')).toBeVisible()
  await expect(page.getByText('QA Summer Combine 2026 · 2026-07-06', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Leaderboards', exact: true }).click()
  await expect(page.getByRole('main').getByText('QA Athlete', { exact: true }).first()).toBeVisible()

  await page.getByRole('link', { name: /TV Mode/ }).click()
  await expect(page.getByRole('button', { name: 'Overall FAI', exact: true })).toBeVisible()
  await expect(page.getByText('QA Athlete', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: '✕ Exit' }).click()

  await page.getByRole('link', { name: 'Data', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export All Data (CSV)' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^fai-export-.*\.csv$/)
})
