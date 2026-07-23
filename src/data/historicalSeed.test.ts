import { describe, expect, it } from 'vitest'
import { historicalSeedData, mergeHistoricalData } from './historicalSeed'

describe('historicalSeedData', () => {
  it('decodes the bundled historical seed', async () => {
    const data = await historicalSeedData()
    expect(data).toBeDefined()
    expect(Array.isArray(data.events)).toBe(true)
    expect(Array.isArray(data.athletes)).toBe(true)
    expect(Array.isArray(data.sessions)).toBe(true)
  })

  it('contains testing events from every historical year', async () => {
    const data = await historicalSeedData()
    const years = [
      ...new Set(
        data.events
          .map((event) => Number(event.startDate.slice(0, 4)))
          .filter(Number.isFinite),
      ),
    ].sort((a, b) => a - b)
    expect(years).toEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026])
  })

  it('contains all 20 historical testing events', async () => {
    const data = await historicalSeedData()
    expect(data.events).toHaveLength(20)
  })

  it('contains 159 consolidated athlete identities', async () => {
    const data = await historicalSeedData()
    expect(data.athletes).toHaveLength(159)
  })

  it('enriches the existing 762 sessions instead of creating duplicate 2026 cards', async () => {
    const data = await historicalSeedData()
    expect(data.sessions).toHaveLength(762)
    expect(data.sessions.some((session) => session.id.startsWith('session-sheet26-'))).toBe(false)
  })

  it('contains no sessions whose athlete or event is missing', async () => {
    const data = await historicalSeedData()
    const athleteIds = new Set(data.athletes.map((athlete) => athlete.id))
    const eventIds = new Set(data.events.map((event) => event.id))
    const orphanSessions = data.sessions
      .filter(
        (session) =>
          !athleteIds.has(session.athleteId)
          || !session.eventId
          || !eventIds.has(session.eventId),
      )
      .map((session) => ({
        id: session.id,
        athleteId: session.athleteId,
        eventId: session.eventId,
        missingAthlete: !athleteIds.has(session.athleteId),
        missingEvent: !session.eventId || !eventIds.has(session.eventId),
      }))

    expect(orphanSessions).toEqual([])
  })

  it('attaches spreadsheet initials to the existing roster athletes', async () => {
    const data = await historicalSeedData()
    const easton = data.athletes.find((athlete) => athlete.name === 'Easton Reynolds')
    const eastonSummer = data.sessions.find(
      (session) => session.id === 'session-57ea7998399026',
    )

    expect(easton?.id).toBe('athlete-31f3ca620f838f')
    expect(eastonSummer).toMatchObject({
      athleteId: 'athlete-31f3ca620f838f',
      benchMax: 135,
      dash40_1: 5.79,
      fly10_1: 1.34,
      powerCleanMax: 125,
      shuttle20_1: 4.87,
      illinois: 17.31,
      squatMax: 240,
      broadJump: 81.6,
      verticalJump: 17,
    })
  })

  it('contains the complete updated 2026 measurements', async () => {
    const data = await historicalSeedData()
    const summerEvent = 'event-7badc8422c3808'

    const aj = data.athletes.find((athlete) => athlete.name === 'AJ Bailey')
    const ajSummer = data.sessions.find(
      (session) => session.athleteId === aj?.id && session.eventId === summerEvent,
    )
    expect(ajSummer).toMatchObject({
      date: '2026-06-15',
      weightLbsSnapshot: 184,
      benchMax: 250,
      dash40_1: 4.49,
      fly10_1: 1,
      powerCleanMax: 255,
      shuttle20_1: 4.27,
      latShuttle_1: 2.7,
      illinois: 14.66,
      squatMax: 410,
      broadJump: 108,
      verticalJump: 36,
    })

    const knCrump = data.athletes.find((athlete) => athlete.name === 'Kn. Crump')
    const crump2030 = data.sessions.find(
      (session) => session.athleteId === knCrump?.id && session.eventId === summerEvent,
    )
    expect(knCrump).toMatchObject({ grade: 9, heightIn: 73, weightLbs: 172 })
    expect(crump2030).toMatchObject({
      weightLbsSnapshot: 172,
      benchMax: 160,
      dash40_1: 5.18,
      fly10_1: 1.25,
      powerCleanMax: 155,
      shuttle20_1: 4.9,
      latShuttle_1: 2.82,
      illinois: 16.32,
      squatMax: 235,
      broadJump: 86.28,
      verticalJump: 24,
    })

    const kuCrump = data.athletes.find((athlete) => athlete.name === 'Ku. Crump')
    const crump2028Summer = data.sessions.find(
      (session) => session.athleteId === kuCrump?.id && session.eventId === summerEvent,
    )
    expect(kuCrump).toMatchObject({ grade: 10, heightIn: 75, weightLbs: 191 })
    expect(crump2028Summer).toMatchObject({
      weightLbsSnapshot: 191,
      benchMax: 200,
      powerCleanMax: 225,
      squatMax: 460,
      broadJump: 117.6,
      verticalJump: 27,
    })
    expect(knCrump?.id).not.toBe(kuCrump?.id)
  })

  it('contains canonical full-name athletes instead of known duplicate aliases', async () => {
    const data = await historicalSeedData()
    const names = new Set(data.athletes.map((athlete) => athlete.name))

    expect(names.has('Jude Nelson')).toBe(true)
    expect(names.has('Dillion Evans')).toBe(true)
    expect(names.has('Logan Cross')).toBe(true)
    expect(names.has('J. Nelson')).toBe(false)
    expect(names.has('D.Evans')).toBe(false)
    expect(names.has('Lo. Cross')).toBe(false)
    expect(names.has('Lu. Cross')).toBe(false)
    expect(names.has('Lu. Cross (2025)')).toBe(true)
  })

  it('repairs stale Summer 2026 athlete IDs without dropping film analysis', async () => {
    const seed = await historicalSeedData()
    const event = seed.events.find((item) => item.id === 'event-7badc8422c3808')
    expect(event).toBeDefined()

    const merged = mergeHistoricalData(seed, {
      athletes: [],
      events: [],
      sessions: [
        {
          id: 'stale-device-session',
          athleteId: 'athlete-14721a441f4e09',
          eventId: event!.id,
          date: '2026-07-22',
          phase: 'Summer',
          squatMax: 250,
        },
      ],
      filmPlays: [
        {
          id: 'film-play-1',
          ballCarrierId: 'athlete-14721a441f4e09',
          targetId: 'athlete-14721a441f4e09',
          annotations: [
            {
              id: 'annotation-1',
              kind: 'trail',
              athleteId: 'athlete-14721a441f4e09',
              points: [],
            },
          ],
        },
      ],
    })

    expect(
      merged.sessions.find((session) => session.id === 'stale-device-session'),
    ).toMatchObject({ athleteId: 'athlete-31f3ca620f838f' })
    expect(merged.filmPlays).toEqual([
      expect.objectContaining({
        id: 'film-play-1',
        ballCarrierId: 'athlete-31f3ca620f838f',
        targetId: 'athlete-31f3ca620f838f',
        annotations: [
          expect.objectContaining({ athleteId: 'athlete-31f3ca620f838f' }),
        ],
      }),
    ])
  })

  it('overlays coach-entered records without removing historical sessions', async () => {
    const seed = await historicalSeedData()
    const custom = {
      athletes: [
        {
          id: 'custom-athlete',
          name: 'New Athlete',
          grade: 9,
          position: 'RB',
          positionGroup: 'RB' as const,
          heightIn: 69,
          weightLbs: 180,
        },
      ],
      events: [],
      sessions: [],
    }

    const merged = mergeHistoricalData(seed, custom)
    expect(merged.athletes.some((athlete) => athlete.id === 'custom-athlete')).toBe(true)
    expect(merged.sessions).toHaveLength(seed.sessions.length)
  })
})
