import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const TEAM_ID = process.env.FAI_CLOUD_SMOKE_TEAM_ID ?? ''
const TEAM_NAME = process.env.FAI_CLOUD_SMOKE_TEAM_NAME ?? ''
const EMAIL_A = process.env.FAI_CLOUD_SMOKE_EMAIL_A ?? ''
const EMAIL_B = process.env.FAI_CLOUD_SMOKE_EMAIL_B ?? ''
const PASSWORD = process.env.FAI_CLOUD_SMOKE_PASSWORD ?? ''
const ATHLETE_ID = process.env.FAI_CLOUD_SMOKE_ATHLETE_ID ?? 'cloud-smoke-athlete'
const SEED_VERSION = '2026-07-sheet26-complete'

const configured = Boolean(TEAM_ID && TEAM_NAME && EMAIL_A && EMAIL_B && PASSWORD)

test.skip(!configured, 'Authenticated cloud smoke credentials are not configured.')
test.setTimeout(120_000)

async function prepareContext(context: BrowserContext) {
  await context.addInitScript(({ teamId, seedVersion }) => {
    localStorage.setItem(`fai:seed-sync:${seedVersion}:${teamId}`, 'true')
    localStorage.setItem(`fai:cloud-import:done:${teamId}`, 'true')
  }, { teamId: TEAM_ID, seedVersion: SEED_VERSION })
}

async function signIn(page: Page, email: string) {
  await page.goto('/#/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in to FAI', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Athletes', exact: true }).first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(TEAM_NAME, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
}

async function waitForCloudSave(page: Page) {
  await page.goto('/#/data')
  await expect(page.getByText('Cloud storage connected', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Saved to cloud', { exact: true })).toBeVisible({ timeout: 30_000 })
}

async function syncNow(page: Page) {
  await page.goto('/#/data')
  await page.getByRole('button', { name: 'Sync now', exact: true }).click()
  await expect(page.getByText('Cloud data synchronized', { exact: false })).toBeVisible({ timeout: 30_000 })
}

test('two independent authenticated sessions round-trip an Iron Man package through Supabase', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  await prepareContext(contextA)
  await prepareContext(contextB)

  const deviceA = await contextA.newPage()
  const deviceB = await contextB.newPage()

  await signIn(deviceA, EMAIL_A)
  await signIn(deviceB, EMAIL_B)

  await deviceA.goto(`/#/athletes/${ATHLETE_ID}/edit`)
  await expect(deviceA.getByRole('heading', { name: 'Edit athlete' })).toBeVisible()
  const ironManRole = deviceA.getByRole('button', { name: /Iron Man/ }).first()
  await ironManRole.click()
  await expect(ironManRole).toHaveAttribute('aria-pressed', 'true')
  await deviceA.getByPlaceholder('e.g. Star').fill('Boundary Corner')
  await deviceA.getByText('Secondary Group', { exact: true }).locator('..').getByRole('combobox').selectOption('DB')
  await deviceA.getByLabel('Roster need').selectOption('rotation')
  await deviceA.getByLabel('Mental readiness').selectOption('3')
  await deviceA.getByPlaceholder('0-100').fill('74')
  await deviceA.locator('select').filter({ has: deviceA.locator('option[value="ready"]') }).selectOption('ready')
  await deviceA.getByPlaceholder('Doubles\nTrips').fill('Doubles\nTrips')
  await deviceA.getByPlaceholder('Cloud\nSky\nBoundary pressure').fill('Cloud\nSky\nBoundary pressure')
  await deviceA.getByLabel('Secondary snap ceiling').fill('30')
  await deviceA.getByLabel('Package review date').fill('2026-08-20')
  await deviceA.getByPlaceholder('Example: field-side only; no motion checks; play Cloud unless the formation is empty.').fill('Field-side only. Keep the check family fixed.')
  await deviceA.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await expect(deviceA.getByText('Doubles, Trips', { exact: true })).toBeVisible()
  await waitForCloudSave(deviceA)

  await syncNow(deviceB)
  await deviceB.goto(`/#/athletes/${ATHLETE_ID}`)
  await expect(deviceB.getByText('Restricted package', { exact: true })).toBeVisible()
  await expect(deviceB.getByText('Doubles, Trips', { exact: true })).toBeVisible()
  await expect(deviceB.getByText('3/10 installed', { exact: true })).toBeVisible()
  await expect(deviceB.getByText('30% snap ceiling', { exact: true })).toBeVisible()
  await expect(deviceB.getByText('Field-side only. Keep the check family fixed.', { exact: true })).toBeVisible()

  await deviceB.goto(`/#/athletes/${ATHLETE_ID}/edit`)
  await deviceB.getByPlaceholder('Cloud\nSky\nBoundary pressure').fill('Cloud\nSky\nBoundary pressure\nBoundary lock')
  await deviceB.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await expect(deviceB.getByText('4/10 installed', { exact: true })).toBeVisible()
  await waitForCloudSave(deviceB)

  await syncNow(deviceA)
  await deviceA.goto(`/#/athletes/${ATHLETE_ID}`)
  await expect(deviceA.getByText('4/10 installed', { exact: true })).toBeVisible()

  const deviceAStored = await deviceA.evaluate((athleteId) => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) return null
    const data = JSON.parse(raw) as {
      athletes: Array<{
        id: string
        usage?: string
        secondaryPosition?: string
        ironManPackage?: { calls?: string[]; formations?: string[]; status?: string }
      }>
    }
    return data.athletes.find((athlete) => athlete.id === athleteId) ?? null
  }, ATHLETE_ID)

  expect(deviceAStored).toMatchObject({
    usage: 'iron-man',
    secondaryPosition: 'Boundary Corner',
    ironManPackage: {
      status: 'ready',
      formations: ['Doubles', 'Trips'],
      calls: ['Cloud', 'Sky', 'Boundary pressure', 'Boundary lock'],
    },
  })

  await contextA.close()
  await contextB.close()
})
