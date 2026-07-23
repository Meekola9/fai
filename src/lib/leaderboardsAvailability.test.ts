import { describe, expect, it } from 'vitest'
import type { AthleteResult, CategoryScores, ComputedSession } from '../types'
import {
  ALL_LEADERBOARDS,
  positionGroupBoards,
  teamStats,
} from './leaderboards'

const categories: CategoryScores = {
  Speed: 78,
  Acceleration: 74,
  Jump: 58,
  Power: 61,
  Pursuit: 65,
  'Change of Direction': 70,
  Conditioning: 0,
  Strength: 66,
}

function result(id: string, rankEligible: boolean, dash40: number): AthleteResult {
  const athlete = {
    id,
    name: rankEligible ? 'Complete Athlete' : 'Partial Athlete',
    grade: 10,
    position: 'WR',
    positionGroup: 'WR' as const,
    heightIn: 70,
    weightLbs: 170,
  }
  const current: ComputedSession = {
    athlete,
    event: {
      id: 'event-1',
      name: 'Test Event',
      phase: 'Summer',
      startDate: '2025-06-15',
    },
    session: {
      id: `session-${id}`,
      athleteId: id,
      eventId: 'event-1',
      date: '2025-06-15',
      phase: 'Summer',
      gradeSnapshot: 10,
      positionSnapshot: 'WR',
      positionGroupSnapshot: 'WR',
      weightLbsSnapshot: 170,
      dash40_1: dash40,
      benchMax: 225,
    },
    metrics: {
      best40: dash40,
      benchRatio: 225 / 170,
    },
    normalized: {
      best40: 78,
      benchRatio: 66,
    },
    categories,
    fai: rankEligible ? 72 : 43,
    completionPct: rankEligible ? 100 : 20,
    scoreStatus: rankEligible ? 'complete' : 'insufficient',
  }
  return {
    athlete,
    current,
    faiImprovement: 0,
    faiImprovementPct: 0,
    teamRank: rankEligible ? 1 : 0,
    teamCount: rankEligible ? 1 : 0,
    groupRank: rankEligible ? 1 : 0,
    groupCount: rankEligible ? 1 : 0,
    rankEligible,
    baseFai: current.fai,
    impactBoostPct: 0,
    awarenessBoostPct: 0,
  }
}

describe('official and available-data rankings', () => {
  const complete = result('complete', true, 4.9)
  const partial = result('partial', false, 4.6)
  const results = [complete, partial]

  it('keeps incomplete batteries out of official FAI and position-group rankings', () => {
    const official = ALL_LEADERBOARDS.find((board) => board.id === 'fai')!
    expect(official.scope).toBe('official')
    expect(official.rows(results).map((row) => row.result.athlete.id)).toEqual(['complete'])

    const groups = positionGroupBoards(results)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.rows.map((row) => row.result.athlete.id)).toEqual(['complete'])
  })

  it('includes verified partial records in raw-test and category rankings', () => {
    const dash = ALL_LEADERBOARDS.find((board) => board.id === 'test-best40')!
    // best40 now feeds the Acceleration rating (Speed is strictly the 10-fly).
    const acceleration = ALL_LEADERBOARDS.find((board) => board.id === 'acceleration')!

    expect(dash.scope).toBe('available')
    expect(dash.rows(results).map((row) => row.result.athlete.id)).toEqual(['partial', 'complete'])
    expect(dash.rows(results)[0]?.display).toBe('4.60s')
    expect(acceleration.rows(results).map((row) => row.result.athlete.id)).toEqual(['complete', 'partial'])
  })

  it('populates dashboard leaders from the strongest verified measurement', () => {
    const stats = teamStats(results)
    expect(stats.completeCount).toBe(1)
    expect(stats.provisionalCount).toBe(1)
    expect(stats.fastest?.result.athlete.id).toBe('partial')
  })
})
