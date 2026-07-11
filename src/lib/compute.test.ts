import { describe, expect, it } from 'vitest'
import type { AppData, Athlete, TestSession, TestingEvent } from '../types'
import { benchmarkScore } from '../data/scoring'
import { computeAll } from './compute'
import { buildResults } from './progress'

const athlete: Athlete = {
  id: 'athlete-1',
  name: 'Test Athlete',
  grade: 11,
  position: 'WR',
  positionGroup: 'WR',
  heightIn: 72,
  weightLbs: 190,
}

const event: TestingEvent = {
  id: 'event-1',
  name: 'Summer Combine',
  phase: 'Summer',
  startDate: '2026-06-01',
}

function session(
  id: string,
  date: string,
  values: Partial<TestSession>,
): TestSession {
  return {
    id,
    athleteId: athlete.id,
    eventId: event.id,
    date,
    phase: event.phase,
    gradeSnapshot: athlete.grade,
    positionSnapshot: athlete.position,
    positionGroupSnapshot: athlete.positionGroup,
    weightLbsSnapshot: athlete.weightLbs,
    ...values,
  }
}

const completeData: AppData = {
  athletes: [athlete],
  events: [event],
  sessions: [
    session('monday', '2026-06-01', {
      benchMax: 225,
      dash40_1: 4.65,
      dash40_2: 4.6,
      fly10_1: 1.5,
      fly10_2: 1.48,
    }),
    session('tuesday', '2026-06-02', {
      hangCleanReps: 10,
      shuttle20_1: 4.35,
      shuttle20_2: 4.3,
      latShuttle_1: 2.75,
      latShuttle_2: 2.72,
      illinois: 15.8,
    }),
    session('wednesday', '2026-06-03', {
      squatMax: 365,
      broadJump: 116,
      verticalJump: 34,
    }),
  ],
}

describe('FAI computation', () => {
  it('merges three testing days into one complete event result', () => {
    const computed = computeAll(completeData)
    expect(computed).toHaveLength(1)
    expect(computed[0].session.benchMax).toBe(225)
    expect(computed[0].session.illinois).toBe(15.8)
    expect(computed[0].session.verticalJump).toBe(34)
    expect(computed[0].completionPct).toBe(100)
    expect(computed[0].scoreStatus).toBe('complete')
  })

  it('keeps an athlete score stable when another athlete joins the roster', () => {
    const original = computeAll(completeData)[0].fai
    const second: Athlete = { ...athlete, id: 'athlete-2', name: 'Elite Athlete' }
    const extraSessions = completeData.sessions.map((item, index) => ({
      ...item,
      id: `elite-${index}`,
      athleteId: second.id,
      dash40_1: item.dash40_1 ? 4.4 : undefined,
      dash40_2: item.dash40_2 ? 4.42 : undefined,
    }))
    const expanded = computeAll({
      athletes: [athlete, second],
      events: [event],
      sessions: [...completeData.sessions, ...extraSessions],
    }).find((item) => item.athlete.id === athlete.id)
    expect(expanded?.fai).toBe(original)
  })

  it('does not give official ranks to incomplete scores', () => {
    const partial = computeAll({
      athletes: [athlete],
      events: [event],
      sessions: [session('partial', '2026-06-01', { dash40_1: 4.7, fly10_1: 1.55 })],
    })
    const results = buildResults(partial)
    expect(partial[0].scoreStatus).toBe('insufficient')
    expect(results[0].rankEligible).toBe(false)
    expect(results[0].teamRank).toBe(0)
  })

  it('preserves legitimate zero benchmark scores', () => {
    expect(benchmarkScore(5.25, { elite: 4.4, developmental: 5.25 }, false)).toBe(0)
    expect(benchmarkScore(4.4, { elite: 4.4, developmental: 5.25 }, false)).toBe(100)
  })
})
