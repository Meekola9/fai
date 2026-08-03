import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('fai:data:v2')) return
    localStorage.removeItem('fai:data:v1')
    const athleteId = 'deployment-qa'
    const trackedPlay = (id: string, side: 'offense' | 'defense') => ({
      id,
      side,
      annotations: [{
        id: `track-${id}`,
        kind: 'trail',
        athleteId,
        points: [{ x: 0.4, y: 0.5 }],
      }],
    })
    localStorage.setItem('fai:data:v2', JSON.stringify({
      athletes: [{
        id: athleteId,
        name: 'Deployment QA',
        grade: 11,
        position: 'X',
        positionGroup: 'WR',
        usage: 'one-way',
        heightIn: 72,
        weightLbs: 185,
      }],
      events: [{
        id: 'deployment-event',
        name: 'Deployment QA 2026',
        phase: 'Preseason',
        startDate: '2026-08-01',
        status: 'open',
      }],
      sessions: [{
        id: 'deployment-session',
        athleteId,
        eventId: 'deployment-event',
        date: '2026-08-01',
        phase: 'Preseason',
        gradeSnapshot: 11,
        positionSnapshot: 'X',
        positionGroupSnapshot: 'WR',
        weightLbsSnapshot: 185,
        benchMax: 275,
        dash40_1: 4.35,
        dash40_2: 4.38,
        dash10_1: 1.45,
        dash10_2: 1.47,
        fly10_1: 0.95,
        fly10_2: 0.97,
        powerCleanMax: 300,
        shuttle20_1: 4.08,
        shuttle20_2: 4.12,
        latShuttle_1: 2.60,
        latShuttle_2: 2.64,
        illinois: 15.45,
        squatMax: 425,
        broadJump: 120,
        verticalJump: 36,
        cond51015: 17,
      }],
      plays: [],
      filmSources: [],
      filmPlays: [
        trackedPlay('film-1', 'offense'),
        trackedPlay('film-2', 'defense'),
        trackedPlay('film-3', 'defense'),
        trackedPlay('film-4', 'defense'),
      ],
      awarenessResults: [{
        id: 'awareness-qa',
        athleteId,
        quizId: 'fai-awareness-v1',
        score: 82,
        correct: 8,
        total: 10,
        takenAt: '2026-08-02T12:00:00.000Z',
      }],
    }))
  })
})

test('coach installs, persists, and audits an Iron Man package', async ({ page }) => {
  await page.goto('/#/athletes/deployment-qa/edit')
  await expect(page.getByRole('heading', { name: 'Edit athlete' })).toBeVisible()

  await page.getByRole('button', { name: /Iron Man/ }).first().click()
  await page.getByPlaceholder('e.g. Star').fill('Boundary Corner')
  await page.getByText('Secondary Group', { exact: true }).locator('..').getByRole('combobox').selectOption('DB')
  await page.getByLabel('Roster need').selectOption('rotation')
  await page.getByLabel('Mental readiness').selectOption('3')
  await page.getByPlaceholder('0-100').fill('74')

  await expect(page.getByText('Iron Man restricted package is recommended', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Apply Iron Man', exact: true }).click()

  await page.locator('select').filter({ has: page.locator('option[value="ready"]') }).selectOption('ready')
  await page.getByPlaceholder('Doubles\nTrips').fill('Doubles\nTrips')
  await page.getByPlaceholder('Cloud\nSky\nBoundary pressure').fill('Cloud\nSky\nBoundary pressure')
  await page.getByLabel('Secondary snap ceiling').fill('30')
  await page.getByLabel('Package review date').fill('2026-08-20')
  await page.getByPlaceholder('Example: field-side only; no motion checks; play Cloud unless the formation is empty.').fill('Field-side only. Keep the check family fixed.')
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()

  await expect(page.getByText('Restricted package', { exact: true })).toBeVisible()
  await expect(page.getByText('Doubles, Trips', { exact: true })).toBeVisible()
  await expect(page.getByText('3/10 installed', { exact: true })).toBeVisible()
  await expect(page.getByText('30% snap ceiling', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText('Doubles, Trips', { exact: true })).toBeVisible()
  await expect(page.getByText('Field-side only. Keep the check family fixed.', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Deployment', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Deployment Board', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Deployment QA', exact: true })).toBeVisible()
  await expect(page.getByText('Over snap ceiling', { exact: true })).toBeVisible()
  await expect(page.getByText('75.0%', { exact: true })).toBeVisible()

  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) throw new Error('FAI deployment data was not persisted')
    const data = JSON.parse(raw) as {
      athletes: Array<{
        id: string
        usage?: string
        deploymentAssessment?: { rosterNeed?: string; coachMentalReadiness?: number; assignmentReliability?: number }
        ironManPackage?: { status?: string; formations?: string[]; calls?: string[]; secondarySnapCapPct?: number }
      }>
    }
    return data.athletes.find((athlete) => athlete.id === 'deployment-qa')
  })

  expect(saved).toMatchObject({
    usage: 'iron-man',
    deploymentAssessment: {
      rosterNeed: 'rotation',
      coachMentalReadiness: 3,
      assignmentReliability: 74,
    },
    ironManPackage: {
      status: 'ready',
      formations: ['Doubles', 'Trips'],
      calls: ['Cloud', 'Sky', 'Boundary pressure'],
      secondarySnapCapPct: 30,
    },
  })
})
