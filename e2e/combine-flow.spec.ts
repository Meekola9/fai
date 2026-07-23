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
    return data.athletes?.length === 159 && data.events?.length === 20 && data.sessions?.length === 762
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

  expect(seeded.athletes).toHaveLength(159)
  expect(seeded.events).toHaveLength(20)
  expect(seeded.sessions).toHaveLength(762)
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

test('athlete pages show 2026 only while Rankings retains historical seasons', async ({ page }) => {
  await page.goto('/')
  await waitForHistoricalSeed(page)

  await page.getByRole('link', { name: 'Athletes', exact: true }).click()
  await expect(page.getByText('2026 season only', { exact: true })).toBeVisible()
  await expect(page.getByRole('option', { name: '2025 season' })).toHaveCount(0)

  await page.getByRole('link', { name: 'AJ Bailey', exact: true }).click()
  await expect(page.getByText('2026 Category Profile', { exact: true })).toBeVisible()
  await expect(page.getByText('2026 Test Results', { exact: true })).toBeVisible()
  await expect(page.getByText('FAI Progress by Year', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Testing History by Year', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Test-by-Test · Current vs Previous Year', { exact: true })).toHaveCount(0)

  await page.getByRole('link', { name: 'Leaderboards', exact: true }).click()
  await expect(page.getByRole('option', { name: '2025 season' })).toBeVisible()
})

test('coach awards a weekly game-day badge and the overall-name scale is documented', async ({ page }) => {
  await page.goto('/')
  await waitForHistoricalSeed(page)

  await page.getByRole('link', { name: 'Stats Guide', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Overall FAI names', exact: true })).toBeVisible()
  await expect(page.getByText('One of a Kind', { exact: true })).toBeVisible()
  await expect(page.getByText('DAWG', { exact: true })).toBeVisible()
  await expect(page.getByText('Difference Maker', { exact: true })).toBeVisible()
  await expect(page.getByText('Developing Talent', { exact: true })).toBeVisible()
  await expect(page.getByText('Building Block', { exact: true })).toBeVisible()
  await expect(page.getByText('Needs Work', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Playmakers', exact: true }).click()
  await expect(page.getByText('Log a Play or Award a Badge', { exact: true })).toBeVisible()

  const selects = page.locator('select')
  await selects.nth(0).selectOption({ label: 'AJ Bailey' })
  await selects.nth(1).selectOption('badge_journeyman')
  const today = await page.evaluate(() => new Date().toISOString().slice(0, 10))
  await page.locator('input[type="date"]').fill(today)
  await page.getByPlaceholder('Opponent (optional)').fill('Central')
  await page.getByRole('button', { name: '+ Award Game-Day Badge', exact: true }).click()

  await expect(page.getByText('Active Game-Day Badges · This Week', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Journeyman game-day badge' }).first()).toBeVisible()
  await expect(page.getByText('2026 Game-Day Badge Totals', { exact: true })).toBeVisible()

  const savedBadge = await page.evaluate(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) return null
    const data = JSON.parse(raw) as {
      athletes: Array<{ id: string; name: string }>
      plays: Array<{ athleteId: string; type: string; date: string; opponent?: string }>
    }
    const athlete = data.athletes.find((item) => item.name === 'AJ Bailey')
    return data.plays.find((play) => play.athleteId === athlete?.id && play.type === 'badge_journeyman') ?? null
  })
  expect(savedBadge).toMatchObject({ type: 'badge_journeyman', date: today, opponent: 'Central' })

  await page.getByRole('link', { name: 'Athletes', exact: true }).click()
  await page.getByRole('link', { name: 'AJ Bailey', exact: true }).click()
  await expect(page.getByText('2026 Game-Day Badges · 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Season × 1', { exact: true })).toBeVisible()
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

  // Second partial entry: Power Clean and change of direction.
  await page.locator('input[type="date"]').fill('2026-07-07')
  await fillPlaceholder(page, '235', '245')
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
  expect(persisted.athletes).toHaveLength(160)
  expect(persisted.events).toHaveLength(21)
  expect(persisted.sessions).toHaveLength(765)

  await page.getByRole('link', { name: 'Athletes', exact: true }).click()
  await page.getByRole('link', { name: 'QA Athlete', exact: true }).click()
  await expect(page.getByText('Official score')).toBeVisible()
  await expect(page.getByText('2026 season', { exact: true })).toBeVisible()
  await expect(page.getByText('Testing History by Year', { exact: true })).toHaveCount(0)

  await page.getByRole('link', { name: 'Leaderboards', exact: true }).click()
  await expect(page.getByRole('main').getByText('QA Athlete', { exact: true }).first()).toBeVisible()

  // Verify backup export and the TV route without entering the full-screen shell.
  await page.getByRole('link', { name: 'Data', exact: true }).click()
  const exportButton = page.getByRole('button', { name: 'Export All Data (CSV)' })
  await expect(exportButton).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportButton.click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^fai-export-.*\.csv$/)

  const tvLink = page.getByRole('link', { name: /TV Mode/ })
  await expect(tvLink).toBeVisible()
  await expect(tvLink).toHaveAttribute('href', '#/tv')
})
