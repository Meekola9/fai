import { expect, test, type Page } from '@playwright/test'

async function waitForHistoricalSeed(page: Page) {
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) return false
    const data = JSON.parse(raw) as { athletes?: unknown[]; events?: unknown[]; sessions?: unknown[] }
    return data.athletes?.length === 126 && data.events?.length === 18 && data.sessions?.length === 562
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    localStorage.removeItem('fai:data:v1')
    localStorage.removeItem('fai:data:v2')
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('fai-mobile-backup')
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  })
  await page.reload()
  await waitForHistoricalSeed(page)
})

test('dashboard is populated from verified historical and partial testing records', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Historical Data Coverage' })).toBeVisible()
  await expect(page.getByText('126', { exact: true })).toBeVisible()
  await expect(page.getByText('18', { exact: true })).toBeVisible()
  await expect(page.getByText('562', { exact: true })).toBeVisible()
  await expect(page.getByText('Winter 2025 Max Test', { exact: true })).toBeVisible()

  await expect(
    page.getByRole('heading', { name: 'Available-Data Leaders · Verified Measurements' }),
  ).toBeVisible()
  await expect(page.getByText('Fastest Recorded (40)', { exact: true })).toBeVisible()
  await expect(page.getByText('Strongest Available', { exact: true })).toBeVisible()
  await expect(page.getByText('Most Explosive Available', { exact: true })).toBeVisible()
  await expect(page.getByText('Best COD Available', { exact: true })).toBeVisible()

  const leaderSection = page.getByRole('heading', {
    name: 'Available-Data Leaders · Verified Measurements',
  }).locator('..')
  await expect(leaderSection.getByText('No verified measurement yet')).toHaveCount(0)

  await expect(page.getByRole('heading', { name: 'Top 5 · Available FAI Ranking' })).toBeVisible()
  await expect(
    page.getByText(/Available FAI rankings include verified partial scores/),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /Category Profile/ })).toBeVisible()

  await page.getByRole('link', { name: 'Leaderboards', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Available FAI' })).toBeVisible()
  await expect(page.getByText(/partial scores included/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Available Position Group Rankings' })).toBeVisible()
  await expect(page.getByText('% complete').first()).toBeVisible()
})
