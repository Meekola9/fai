import { describe, expect, it } from 'vitest'
import { ARCHETYPE_CATALOG, archetypeFor } from './archetypes'
import type { CategoryScores, ComputedSession, PositionGroup } from '../types'

const metricByCategory = {
  Speed: 'bestFly',
  Acceleration: 'best40',
  Jump: 'verticalJump',
  Power: 'broadJump',
  Pursuit: 'illinois',
  'Change of Direction': 'best20Shuttle',
  Conditioning: 'cond51015',
  Strength: 'benchRatio',
} as const

function resultFor(
  group: PositionGroup,
  scores: Partial<CategoryScores>,
  weight = 185,
): ComputedSession {
  const categories: CategoryScores = {
    Speed: 0,
    Acceleration: 0,
    Jump: 0,
    Power: 0,
    Pursuit: 0,
    'Change of Direction': 0,
    Conditioning: 0,
    Strength: 0,
    ...scores,
  }
  const normalized: Record<string, number | undefined> = {}
  for (const [category, value] of Object.entries(scores)) {
    normalized[metricByCategory[category as keyof typeof metricByCategory]] = value
  }
  const availableCount = Object.keys(scores).length
  const completionPct = Math.round((availableCount / 8) * 100)

  return {
    athlete: {
      id: 'athlete-1',
      name: 'Test Athlete',
      grade: 11,
      position: group,
      positionGroup: group,
      heightIn: 72,
      weightLbs: weight,
    },
    event: {
      id: 'season-2026',
      name: '2026',
      phase: 'Summer',
      startDate: '2026-01-01',
    },
    session: {
      id: 'session-1',
      athleteId: 'athlete-1',
      eventId: 'season-2026',
      date: '2026-07-01',
      phase: 'Summer',
      positionGroupSnapshot: group,
      weightLbsSnapshot: weight,
    },
    metrics: {},
    normalized,
    categories,
    fai: 70,
    completionPct,
    scoreStatus: completionPct >= 100 ? 'complete' : completionPct >= 60 ? 'provisional' : 'insufficient',
  }
}

describe('player archetypes', () => {
  it('ships at least 40 unique archetype names with coverage for every position group', () => {
    const names = ARCHETYPE_CATALOG.map((archetype) => archetype.name)
    expect(ARCHETYPE_CATALOG.length).toBeGreaterThanOrEqual(40)
    expect(new Set(names).size).toBe(names.length)

    const groups: PositionGroup[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K/P', 'ATH']
    for (const group of groups) {
      expect(ARCHETYPE_CATALOG.filter((archetype) => archetype.group === group).length).toBeGreaterThanOrEqual(5)
    }
  })

  it('uses position when assigning the same athletic profile', () => {
    const scores = {
      Speed: 92,
      Acceleration: 88,
      Jump: 72,
      Power: 68,
      Pursuit: 75,
      'Change of Direction': 84,
      Conditioning: 60,
      Strength: 52,
    }
    const receiver = archetypeFor(resultFor('WR', scores, 170))
    const defensiveBack = archetypeFor(resultFor('DB', scores, 170))

    expect(receiver?.positionGroup).toBe('WR')
    expect(defensiveBack?.positionGroup).toBe('DB')
    expect(receiver?.name).not.toBe(defensiveBack?.name)
  })

  it('distinguishes speed-led and power-led athletes within a position', () => {
    const speedBack = archetypeFor(resultFor('RB', {
      Speed: 96,
      Acceleration: 92,
      Power: 55,
      Jump: 50,
      'Change of Direction': 80,
      Strength: 48,
    }, 165))
    const powerBack = archetypeFor(resultFor('RB', {
      Speed: 48,
      Acceleration: 74,
      Power: 94,
      Jump: 82,
      'Change of Direction': 55,
      Strength: 91,
    }, 205))

    expect(speedBack?.name).not.toBe(powerBack?.name)
    expect(speedBack?.evidence[0]).toContain('Speed')
    expect(powerBack?.evidence[0]).toContain('Power')
  })

  it('marks sparse testing profiles as low confidence', () => {
    const archetype = archetypeFor(resultFor('ATH', { Acceleration: 80 }))
    expect(archetype?.confidence).toBe('low')
  })
})
