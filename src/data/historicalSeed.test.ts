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

  it('contains 158 consolidated athlete identities', async () => {
    const data = await historicalSeedData()
    expect(data.athletes).toHaveLength(158)
  })

  it('contains all 762 historical testing sessions', async () => {
    const data = await historicalSeedData()
    expect(data.sessions).toHaveLength(762)
  })

  it('contains no sessions whose athlete or event is missing', async () => {
    const data = await historicalSeedData()
    const athleteIds = new Set(data.athletes.map((athlete) => athlete.id))
    const eventIds = new Set(data.events.map((event) => event.id))
    const orphanSessions = data.sessions
      .filter(
        (session) =>
          !athleteIds.has(session.athleteId) || !eventIds.has(session.eventId),
      )
      .map((session) => ({
        id: session.id,
        athleteId: session.athleteId,
        eventId: session.eventId,
        missingAthlete: !athleteIds.has(session.athleteId),
        missingEvent: !eventIds.has(session.eventId),
      }))

    expect(orphanSessions).toEqual([])
  })

  it('contains the recorded 2026 vertical, broad-jump, and squat results', async () => {
    const data = await historicalSeedData()

    const ajSummer = data.sessions.find(
      (session) =>
        session.athleteId === 'athlete-404779f150e831'
        && session.id === 'session-51c7ae5c71707b',
    )
    expect(ajSummer).toMatchObject({
      date: '2026-06-15',
      weightLbsSnapshot: 184,
      squatMax: 410,
      broadJump: 108,
      verticalJump: 36,
    })

    // The two K. Crump records remain separated by their stable athlete IDs.
    const crump2030 = data.sessions.find(
      (session) => session.id === 'session-9039e5408d6d7f',
    )
    expect(crump2030).toMatchObject({
      athleteId: 'athlete-ea323b307d8f51',
      squatMax: 235,
      broadJump: 86,
      verticalJump: 24,
    })

    const crump2028Spring = data.sessions.find(
      (session) => session.id === 'session-e08561c56a066e',
    )
    const crump2028Summer = data.sessions.find(
      (session) => session.id === 'session-8ecde7be11646f',
    )
    expect(crump2028Spring).toMatchObject({
      athleteId: 'athlete-ab232d66c6da60',
      squatMax: 390,
    })
    expect(crump2028Summer).toMatchObject({
      athleteId: 'athlete-ab232d66c6da60',
      squatMax: 460,
      broadJump: 118,
      verticalJump: 27,
    })
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
    // Lu. Cross (class of 2025) is a different athlete from Logan Cross
    // (class of 2023), kept separate under a disambiguated name.
    expect(names.has('Lu. Cross')).toBe(false)
    expect(names.has('Lu. Cross (2025)')).toBe(true)
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
