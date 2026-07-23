import { describe, expect, it } from 'vitest'
import type { AppData, Athlete, TestSession, TestingEvent } from '../types'
import { computeAll, positionScoreBreakdown } from './compute'
import { playerUsageDefinition } from './playerUsage'

const event: TestingEvent = {
  id: 'season-2026',
  name: '2026 Season',
  phase: 'Summer',
  startDate: '2026-06-01',
}

const baseAthlete: Athlete = {
  id: 'two-way-1',
  name: 'Two Way Athlete',
  grade: 11,
  position: 'RB',
  positionGroup: 'RB',
  secondaryPosition: 'Mike',
  secondaryPositionGroup: 'LB',
  heightIn: 71,
  weightLbs: 190,
}

const completeSession: TestSession = {
  id: 'session-1',
  athleteId: baseAthlete.id,
  eventId: event.id,
  date: '2026-06-01',
  phase: 'Summer',
  positionSnapshot: 'RB',
  positionGroupSnapshot: 'RB',
  weightLbsSnapshot: 190,
  benchMax: 225,
  dash40_1: 4.55,
  dash40_2: 4.58,
  fly10_1: 1.1,
  fly10_2: 1.12,
  powerCleanMax: 240,
  shuttle20_1: 4.35,
  shuttle20_2: 4.4,
  latShuttle_1: 2.72,
  latShuttle_2: 2.75,
  illinois: 15.7,
  squatMax: 365,
  broadJump: 116,
  verticalJump: 32,
  cond51015: 150,
}

function dataFor(athlete: Athlete): AppData {
  return { athletes: [athlete], events: [event], sessions: [completeSession] }
}

describe('player usage scoring', () => {
  it('defines Two Way as 50/50 and Iron Man as 70/30', () => {
    expect(playerUsageDefinition('two-way')).toMatchObject({ primaryPct: 50, secondaryPct: 50 })
    expect(playerUsageDefinition('iron-man')).toMatchObject({ primaryPct: 70, secondaryPct: 30 })
    expect(playerUsageDefinition('one-way')).toMatchObject({ primaryPct: 100, secondaryPct: 0 })
  })

  it('blends a Two Way athlete evenly across both position scores', () => {
    const athlete = { ...baseAthlete, usage: 'two-way' as const }
    const result = computeAll(dataFor(athlete))[0]
    const breakdown = positionScoreBreakdown(result.session, athlete, result.event)

    expect(breakdown.secondaryGroup).toBe('LB')
    expect(breakdown.primaryPct).toBe(50)
    expect(breakdown.secondaryPct).toBe(50)
    expect(result.fai).toBeCloseTo((breakdown.primaryScore + breakdown.secondaryScore!) / 2, 1)
  })

  it('weights an Iron Man athlete 70 percent primary and 30 percent secondary', () => {
    const athlete = { ...baseAthlete, usage: 'iron-man' as const }
    const result = computeAll(dataFor(athlete))[0]
    const breakdown = positionScoreBreakdown(result.session, athlete, result.event)
    const expected = breakdown.primaryScore * 0.7 + breakdown.secondaryScore! * 0.3

    expect(breakdown.primaryPct).toBe(70)
    expect(breakdown.secondaryPct).toBe(30)
    expect(result.fai).toBeCloseTo(expected, 1)
  })

  it('keeps One Way athletes on the primary-position score only', () => {
    const athlete = { ...baseAthlete, usage: 'one-way' as const }
    const result = computeAll(dataFor(athlete))[0]
    const breakdown = positionScoreBreakdown(result.session, athlete, result.event)

    expect(breakdown.secondaryGroup).toBeUndefined()
    expect(result.fai).toBe(breakdown.primaryScore)
  })
})
