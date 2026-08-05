import { expect, test } from '@playwright/test'

const trackingJson = JSON.stringify({
  meta: {
    source: 'scrimmage-tracker.mp4',
    fps: 30,
    angle: 'sideline',
    createdWith: 'fai-football-cv v0.1',
  },
  frames: [
    {
      t: 1.2,
      players: [
        { trackId: 3, team: 'A', number: 7, img: { x: 0.42, y: 0.61 } },
        { trackId: 8, team: 'B', number: null, img: { x: 0.72, y: 0.48 } },
      ],
    },
    {
      t: 1.3,
      players: [
        { trackId: 3, team: 'A', number: 7, img: { x: 0.44, y: 0.60 } },
        { trackId: 8, team: 'B', number: null, img: { x: 0.70, y: 0.49 } },
      ],
    },
  ],
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('fai:data:v1')
    localStorage.setItem('fai:data:v2', JSON.stringify({
      athletes: [{
        id: 'athlete-cv',
        name: 'CV Roster Athlete',
        grade: 11,
        position: 'Corner',
        positionGroup: 'DB',
        heightIn: 70,
        weightLbs: 170,
      }],
      events: [],
      sessions: [],
      plays: [],
      filmSources: [],
      filmCatalog: [],
      chiefKingPlans: [],
      filmPlays: [],
      awarenessResults: [],
    }))
  })
})

test('imports Claude Football CV JSON into editable Film Room tracks and persists the play', async ({ page }) => {
  await page.goto('/#/film')
  await expect(page.getByRole('heading', { name: /Film Room/i })).toBeVisible()
  await page.getByRole('button', { name: '◎ Track players', exact: true }).click()

  await page.getByLabel('Choose Football CV tracking JSON').setInputFiles({
    name: 'fai_tracking.json',
    mimeType: 'application/json',
    buffer: Buffer.from(trackingJson),
  })

  await expect(page.getByTestId('football-cv-importer')).toContainText('fai_tracking.json')
  await expect(page.getByText('2 identities', { exact: true })).toBeVisible()
  await expect(page.getByText(/Suggested formation frame:/)).toContainText('0:01.20')

  await page.getByLabel('Roster athlete team B track 8').selectOption('athlete-cv')
  await page.getByRole('button', { name: 'Import 2 selected tracks', exact: true }).click()

  await expect(page.getByText('Imported 2 CV tracks into this unsaved play.', { exact: true })).toBeVisible()
  await expect(page.getByText('2 tracked', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '+ Log Play', exact: true }).click()
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) return null
    const data = JSON.parse(raw) as {
      filmPlays: Array<{
        filmLabel?: string
        annotations?: Array<{
          id: string
          athleteId?: string
          tracking?: boolean
          trackingTeam?: string
          trackingSide?: string
          points: Array<{ x: number; y: number; t?: number; source?: string }>
        }>
      }>
    }
    return data.filmPlays[0] ?? null
  })

  expect(saved?.filmLabel).toBe('scrimmage-tracker.mp4')
  expect(saved?.annotations).toHaveLength(2)
  expect(saved?.annotations?.find((track) => track.id === 'track-cv-a-3')).toMatchObject({
    tracking: true,
    trackingTeam: 'opponent',
    trackingSide: 'offense',
    points: [{ t: 1.2, source: 'auto' }, { t: 1.3, source: 'auto' }],
  })
  expect(saved?.annotations?.find((track) => track.id === 'track-cv-b-8')).toMatchObject({
    athleteId: 'athlete-cv',
    trackingTeam: 'ours',
    trackingSide: 'defense',
  })
})
