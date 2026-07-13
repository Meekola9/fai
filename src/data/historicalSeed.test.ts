import { describe, expect, it } from 'vitest'
import { historicalSeedData, mergeHistoricalData } from './historicalSeed'

describe('historicalSeedData', () => {
  it('loads the complete cleaned 2020-2025 history automatically', async () => {
    const data = await historicalSeedData()
    const years = [...new Set(data.events.map((event) => Number(event.startDate.slice(0, 4))))].sort()

    expect(years).toEqual([2020, 2021, 2022, 2023, 2024, 2025])
    expect(data.events).toHaveLength(18)
    expect(data.athletes).toHaveLength(126)
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
