import { describe, expect, it } from 'vitest'
import type {
  Athlete,
  AthleteResult,
  CategoryScores,
  ComputedSession,
  PositionGroup,
} from '../types'
import {
  PLAYER_BADGE_CATALOG,
  SIGNATURE_BADGE_CATALOG,
  SIGNATURE_BADGE_PREFIX,
  playerBadgesFor,
} from './badges'

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

function computed(
  group: PositionGroup,
  categories: Partial<CategoryScores>,
  options: {
    fai?: number
    complete?: boolean
    metrics?: Record<string, number>
    eventId?: string
    date?: string
  } = {},
): ComputedSession {
  const athlete: Athlete = {
    id: 'athlete-1',
    name: 'Badge Athlete',
    grade: 11,
    position: group,
    positionGroup: group,
    heightIn: 72,
    weightLbs: 185,
  }
  const categoryScores: CategoryScores = {
    Speed: 0,
    Acceleration: 0,
    Jump: 0,
    Power: 0,
    Pursuit: 0,
    'Change of Direction': 0,
    Conditioning: 0,
    Strength: 0,
    ...categories,
  }
  const normalized: Record<string, number | undefined> = {}
  for (const [category, score] of Object.entries(categories)) {
    normalized[metricByCategory[category as keyof typeof metricByCategory]] = score
  }
  const completionPct = options.complete === false ? 70 : 100
  return {
    athlete,
    event: {
      id: options.eventId ?? 'event-1',
      name: options.eventId ?? '2026',
      phase: 'Summer',
      startDate: options.date ?? '2026-07-01',
    },
    session: {
      id: `session-${options.eventId ?? '1'}`,
      athleteId: athlete.id,
      eventId: options.eventId ?? 'event-1',
      date: options.date ?? '2026-07-01',
      phase: 'Summer',
      positionGroupSnapshot: group,
      weightLbsSnapshot: athlete.weightLbs,
    },
    metrics: { ...options.metrics },
    normalized,
    categories: categoryScores,
    fai: options.fai ?? 75,
    completionPct,
    scoreStatus: completionPct === 100 ? 'complete' : 'provisional',
  }
}

function resultFor(
  current: ComputedSession,
  options: {
    previous?: ComputedSession
    teamRank?: number
    teamCount?: number
    groupRank?: number
    groupCount?: number
  } = {},
): AthleteResult {
  const previous = options.previous
  return {
    athlete: current.athlete,
    current,
    previous,
    faiImprovement: previous ? Math.round((current.fai - previous.fai) * 10) / 10 : 0,
    faiImprovementPct: previous && previous.fai > 0
      ? Math.round((((current.fai - previous.fai) / previous.fai) * 100) * 10) / 10
      : 0,
    teamRank: options.teamRank ?? 0,
    teamCount: options.teamCount ?? 0,
    groupRank: options.groupRank ?? 0,
    groupCount: options.groupCount ?? 0,
    rankEligible: current.scoreStatus === 'complete',
    baseFai: current.fai,
    impactBoostPct: 0,
    awarenessBoostPct: 0,
  }
}

function ids(result: AthleteResult, timeline: ComputedSession[] = [result.current]): string[] {
  return playerBadgesFor({ result, timeline }).map((badge) => badge.id)
}

describe('player badges', () => {
  it('ships a substantial unique badge catalog', () => {
    expect(PLAYER_BADGE_CATALOG.length).toBeGreaterThanOrEqual(30)
    expect(new Set(PLAYER_BADGE_CATALOG.map((badge) => badge.id)).size).toBe(PLAYER_BADGE_CATALOG.length)
    expect(new Set(PLAYER_BADGE_CATALOG.map((badge) => badge.name)).size).toBe(PLAYER_BADGE_CATALOG.length)
  })

  it('gives every archetype a unique signature badge in the reference catalog', () => {
    expect(SIGNATURE_BADGE_CATALOG.length).toBeGreaterThanOrEqual(60)
    const ids = SIGNATURE_BADGE_CATALOG.map((badge) => badge.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith(SIGNATURE_BADGE_PREFIX))).toBe(true)
    expect(SIGNATURE_BADGE_CATALOG.every((badge) => badge.group === 'signature')).toBe(true)
  })

  it('awards each athlete exactly one signature badge tied to their archetype', () => {
    const speedCurrent = computed('WR', { Speed: 92, Acceleration: 88, Jump: 84, 'Change of Direction': 70 })
    const shiftyCurrent = computed('WR', { Speed: 70, Acceleration: 82, Jump: 62, 'Change of Direction': 92 })
    const speedWr = playerBadgesFor({ result: resultFor(speedCurrent), timeline: [speedCurrent] })
    const shiftyWr = playerBadgesFor({ result: resultFor(shiftyCurrent), timeline: [shiftyCurrent] })
    const speedSig = speedWr.filter((badge) => badge.group === 'signature')
    const shiftySig = shiftyWr.filter((badge) => badge.group === 'signature')
    expect(speedSig).toHaveLength(1)
    expect(shiftySig).toHaveLength(1)
    // Two receivers with different standout traits carry different signatures.
    expect(speedSig[0].id).not.toBe(shiftySig[0].id)
  })

  it('awards elite category and absolute performance badges without stacking lower clubs', () => {
    const current = computed('WR', {
      Speed: 92,
      Acceleration: 91,
      Jump: 88,
      Power: 86,
      Pursuit: 70,
      'Change of Direction': 90,
      Conditioning: 68,
      Strength: 100,
    }, {
      fai: 91,
      metrics: {
        bestFly: 1.0,
        best40: 4.45,
        verticalJump: 36,
        broadJump: 122,
        best20Shuttle: 4.2,
        bestLatShuttle: 2.7,
      },
    })
    const earned = ids(resultFor(current, { teamRank: 1, teamCount: 20, groupRank: 1, groupCount: 5 }))

    expect(earned).toContain('speed-demon')
    expect(earned).toContain('triple-threat')
    expect(earned).toContain('twenty-mph-club')
    expect(earned).not.toContain('nineteen-mph-club')
    expect(earned).toContain('four-fifty-club')
    expect(earned).not.toContain('four-seventy-five-club')
    expect(earned).toContain('fai-ninety-club')
    expect(earned).toContain('team-number-one')
  })

  it('does not award the relative-strength badge to speed-skill groups', () => {
    const receiver = computed('WR', { Strength: 100 })
    const lineman = computed('OL', { Strength: 100 })

    expect(ids(resultFor(receiver))).not.toContain('trench-strong')
    expect(ids(resultFor(lineman))).toContain('trench-strong')
  })

  it('keeps official score and ranking badges behind complete testing', () => {
    const current = computed('RB', { Speed: 90, Acceleration: 90 }, { fai: 95, complete: false })
    const earned = ids(resultFor(current, { teamRank: 1, teamCount: 10, groupRank: 1, groupCount: 3 }))

    expect(earned).not.toContain('fai-ninety-club')
    expect(earned).not.toContain('team-number-one')
    expect(earned).not.toContain('position-leader')
    expect(earned).not.toContain('combine-complete')
  })

  it('awards progress badges from real event-to-event comparisons', () => {
    const previous = computed('LB', {
      Speed: 55,
      Acceleration: 55,
      Jump: 55,
      Power: 55,
      Pursuit: 55,
      'Change of Direction': 55,
      Conditioning: 55,
      Strength: 55,
    }, {
      fai: 62,
      eventId: 'event-1',
      date: '2025-07-01',
      metrics: {
        bestFly: 1.35,
        best40: 5.1,
        verticalJump: 24,
        broadJump: 92,
        illinois: 18,
        best20Shuttle: 5.1,
        bestLatShuttle: 3.3,
        cond51015: 100,
      },
    })
    const current = computed('LB', {
      Speed: 70,
      Acceleration: 70,
      Jump: 70,
      Power: 70,
      Pursuit: 70,
      'Change of Direction': 70,
      Conditioning: 70,
      Strength: 70,
    }, {
      fai: 72,
      eventId: 'event-2',
      date: '2026-07-01',
      metrics: {
        bestFly: 1.2,
        best40: 4.9,
        verticalJump: 28,
        broadJump: 100,
        illinois: 17,
        best20Shuttle: 4.8,
        bestLatShuttle: 3.0,
        cond51015: 125,
      },
    })
    const result = resultFor(current, { previous })
    const earned = ids(result, [previous, current])

    expect(earned).toContain('breakout-year')
    expect(earned).toContain('all-around-growth')
    expect(earned).toContain('personal-best-parade')
  })
})
