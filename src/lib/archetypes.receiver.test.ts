import { describe, expect, it } from 'vitest'
import { archetypeFor } from './archetypes'
import type { CategoryScores, ComputedSession } from '../types'

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

interface ReceiverCase {
  expected: string
  weight: number
  height: number
  scores: CategoryScores
}

function receiverResult(testCase: ReceiverCase): ComputedSession {
  const normalized: Record<string, number> = {}
  for (const [category, value] of Object.entries(testCase.scores)) {
    normalized[metricByCategory[category as keyof typeof metricByCategory]] = value
  }

  return {
    athlete: {
      id: `receiver-${testCase.expected.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: testCase.expected,
      grade: 11,
      position: 'WR',
      positionGroup: 'WR',
      heightIn: testCase.height,
      weightLbs: testCase.weight,
    },
    event: {
      id: 'season-2026',
      name: '2026',
      phase: 'Summer',
      startDate: '2026-01-01',
    },
    session: {
      id: `session-${testCase.expected.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      athleteId: 'receiver',
      eventId: 'season-2026',
      date: '2026-07-01',
      phase: 'Summer',
      positionSnapshot: 'WR',
      positionGroupSnapshot: 'WR',
      weightLbsSnapshot: testCase.weight,
    },
    metrics: {},
    normalized,
    categories: testCase.scores,
    fai: 75,
    completionPct: 100,
    scoreStatus: 'complete',
  }
}

const receiverCases: ReceiverCase[] = [
  {
    expected: 'Field Stretcher',
    weight: 160,
    height: 70,
    scores: { Speed: 94, Acceleration: 89, Jump: 84, Power: 68, Pursuit: 65, 'Change of Direction': 72, Conditioning: 67, Strength: 55 },
  },
  {
    expected: 'Straight Line Blur',
    weight: 160,
    height: 70,
    scores: { Speed: 98, Acceleration: 90, Jump: 66, Power: 72, Pursuit: 60, 'Change of Direction': 65, Conditioning: 65, Strength: 50 },
  },
  {
    expected: 'Route Technician',
    weight: 175,
    height: 71,
    scores: { Speed: 77, Acceleration: 88, Jump: 68, Power: 65, Pursuit: 70, 'Change of Direction': 96, Conditioning: 76, Strength: 55 },
  },
  {
    expected: 'Gadget Weapon',
    weight: 160,
    height: 69,
    scores: { Speed: 89, Acceleration: 87, Jump: 68, Power: 65, Pursuit: 70, 'Change of Direction': 91, Conditioning: 74, Strength: 52 },
  },
  {
    expected: 'Big Body Boundary',
    weight: 190,
    height: 75,
    scores: { Speed: 70, Acceleration: 72, Jump: 86, Power: 88, Pursuit: 65, 'Change of Direction': 67, Conditioning: 72, Strength: 82 },
  },
  {
    expected: 'Contested Catch Freak',
    weight: 190,
    height: 75,
    scores: { Speed: 72, Acceleration: 74, Jump: 98, Power: 78, Pursuit: 65, 'Change of Direction': 68, Conditioning: 70, Strength: 68 },
  },
  {
    expected: 'Yards-After Menace',
    weight: 190,
    height: 74,
    scores: { Speed: 78, Acceleration: 92, Jump: 76, Power: 90, Pursuit: 72, 'Change of Direction': 88, Conditioning: 74, Strength: 72 },
  },
  {
    expected: 'Chain Mover',
    weight: 175,
    height: 71,
    scores: { Speed: 74, Acceleration: 78, Jump: 64, Power: 60, Pursuit: 88, 'Change of Direction': 86, Conditioning: 94, Strength: 58 },
  },
]

describe('receiver archetype separation', () => {
  it('maps eight distinct testing shapes to all eight receiver archetypes', () => {
    const assignments = receiverCases.map((testCase) => archetypeFor(receiverResult(testCase))?.name)

    expect(assignments).toEqual(receiverCases.map((testCase) => testCase.expected))
    expect(new Set(assignments).size).toBe(receiverCases.length)
  })

  it('keeps the two speed archetypes and two tall archetypes meaningfully separate', () => {
    const byExpected = new Map(
      receiverCases.map((testCase) => [testCase.expected, archetypeFor(receiverResult(testCase))]),
    )

    expect(byExpected.get('Field Stretcher')?.primaryTraits).toContain('Jump')
    expect(byExpected.get('Straight Line Blur')?.primaryTraits[0]).toBe('Speed')
    expect(byExpected.get('Big Body Boundary')?.primaryTraits[0]).toBe('Power')
    expect(byExpected.get('Contested Catch Freak')?.primaryTraits[0]).toBe('Jump')
  })
})
