import { expect, test } from '@playwright/test'

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

async function waitForHistoricalSeed(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) return false
    const data = JSON.parse(raw) as { athletes?: unknown[]; events?: unknown[]; sessions?: unknown[] }
    return data.athletes?.length === 158 && data.events?.length === 20 && data.sessions?.length === 669
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

test('installs a touch-first offline shell and recovers from the IndexedDB safety mirror', async ({ page, context }) => {
  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' })
  await expect(mobileNav).toBeVisible()
  await expect(mobileNav.getByText('Dashboard', { exact: true })).toBeVisible()
  await expect(mobileNav.getByText('Athletes', { exact: true })).toBeVisible()
  await expect(mobileNav.getByText('Test', { exact: true })).toBeVisible()
  await expect(mobileNav.getByText('Rankings', { exact: true })).toBeVisible()
  await expect(mobileNav.getByText('More', { exact: true })).toBeVisible()

  await mobileNav.getByText('Test', { exact: true }).click()
  await expect(page.getByText('Testing Exercises', { exact: true })).toBeVisible()
  const firstControl = page.locator('input, select, textarea').first()
  await expect(firstControl).toBeVisible()
  expect(await firstControl.evaluate((element) => getComputedStyle(element).fontSize)).toBe('16px')

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBe('./manifest.webmanifest')
  const manifest = await page.evaluate(async () => {
    const response = await fetch('./manifest.webmanifest')
    return response.json() as Promise<{ display: string; name: string; icons: unknown[] }>
  })
  expect(manifest.display).toBe('standalone')
  expect(manifest.name).toContain('Football Athlete Index')
  expect(manifest.icons.length).toBeGreaterThan(0)

  const backup = await page.evaluate(async () => {
    return new Promise<{ athletes: number; events: number; sessions: number }>((resolve, reject) => {
      const request = indexedDB.open('fai-mobile-backup', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('snapshots', 'readonly')
        const getRequest = transaction.objectStore('snapshots').get('latest')
        getRequest.onerror = () => reject(getRequest.error)
        getRequest.onsuccess = () => {
          const data = getRequest.result as {
            athletes: unknown[]
            events: unknown[]
            sessions: unknown[]
          }
          resolve({
            athletes: data.athletes.length,
            events: data.events.length,
            sessions: data.sessions.length,
          })
          db.close()
        }
      }
    })
  })
  expect(backup).toEqual({ athletes: 158, events: 20, sessions: 669 })

  await page.evaluate(() => localStorage.removeItem('fai:data:v2'))
  await page.reload()
  await waitForHistoricalSeed(page)
  expect(
    await page.evaluate(() => {
      const raw = localStorage.getItem('fai:data:v2')
      if (!raw) return null
      const data = JSON.parse(raw) as { athletes: unknown[]; events: unknown[]; sessions: unknown[] }
      return [data.athletes.length, data.events.length, data.sessions.length]
    }),
  ).toEqual([158, 20, 669])

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect(page.getByText('Football Athlete Index', { exact: true })).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Football Athlete Index', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('banner').getByText('Offline', { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await context.setOffline(false)
})
