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
    expect(years).toEqual([2020, 2021, 2022, 2023, 2024, 2025])
  })

  it('contains all 18 historical testing events', async () => {
    const data = await historicalSeedData()
    expect(data.events).toHaveLength(18)
  })

  it('contains 126 consolidated athlete identities', async () => {
    const data = await historicalSeedData()
    expect(data.athletes).toHaveLength(126)
  })

  it('contains all 562 historical testing sessions', async () => {
    const data = await historicalSeedData()
    expect(data.sessions).toHaveLength(562)
  })

  it('contains canonical full-name athletes instead of known duplicate aliases', async () => {
    const data = await historicalSeedData()
    const names = new Set(data.athletes.map((athlete) => athlete.name))

    expect(names.has('Jude Nelson')).toBe(true)
    expect(names.has('Dillion Evans')).toBe(true)
    expect(names.has('Logan Cross')).toBe(true)
    expect(names.has('J. Nelson')).toBe(false)
    expect(names.has('D.Evans')).toBe(false)
    expect(names.has('Lu. Cross')).toBe(false)
    expect(names.has('Lo. Cross')).toBe(false)
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
