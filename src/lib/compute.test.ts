import { describe, expect, it } from 'vitest'
import type { AppData, Athlete, PositionGroup, TestSession, TestingEvent } from '../types'
import { benchmarkScore, categoryWeightsFor } from '../data/scoring'
import { computeAll, computeSessionForPositionGroup } from './compute'
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
      powerCleanMax: 240,
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

function dataForGroup(group: PositionGroup, dash10: number): AppData {
  const lineAthlete: Athlete = {
    ...athlete,
    id: `athlete-${group.toLowerCase()}`,
    name: `${group} Athlete`,
    position: group === 'OL' ? 'OT' : 'DT',
    positionGroup: group,
    weightLbs: 270,
  }
  return {
    athletes: [lineAthlete],
    events: [event],
    sessions: completeData.sessions.map((item, index) => ({
      ...item,
      id: `${group.toLowerCase()}-${index}`,
      athleteId: lineAthlete.id,
      positionSnapshot: lineAthlete.position,
      positionGroupSnapshot: group,
      weightLbsSnapshot: lineAthlete.weightLbs,
      dash10_1: index === 0 ? dash10 : undefined,
      dash10_2: index === 0 ? dash10 + 0.03 : undefined,
    })),
  }
}

describe('FAI computation', () => {
  it('merges three testing days into one complete event result', () => {
    const computed = computeAll(completeData)
    expect(computed).toHaveLength(1)
    expect(computed[0].session.benchMax).toBe(225)
    expect(computed[0].session.illinois).toBe(15.8)
    expect(computed[0].session.verticalJump).toBe(34)
    expect(computed[0].metrics.powerCleanMax).toBe(240)
    expect(computed[0].completionPct).toBe(100)
    expect(computed[0].scoreStatus).toBe('complete')
  })

  it('converts legacy body-weight clean reps into a Power Clean 1RM', () => {
    const legacyData: AppData = {
      ...completeData,
      sessions: completeData.sessions.map((item) =>
        item.id === 'tuesday'
          ? {
              ...item,
              powerCleanMax: undefined,
              weightLbsSnapshot: 180,
              hangCleanReps: 10,
            }
          : item,
      ),
    }
    const computed = computeAll(legacyData)[0]

    expect(computed.session.hangCleanReps).toBe(10)
    expect(computed.session.hangCleanWeightLbsSnapshot).toBe(180)
    expect(computed.session.estimatedPowerCleanMax).toBe(240)
    expect(computed.metrics.powerCleanMax).toBe(240)
    expect(computed.normalized.powerCleanMax).toBeTypeOf('number')
  })

  it('uses a recorded Power Clean max instead of a larger legacy estimate', () => {
    const mixedData: AppData = {
      ...completeData,
      sessions: [
        ...completeData.sessions,
        session('legacy-clean', '2026-05-01', {
          weightLbsSnapshot: 240,
          hangCleanReps: 15,
        }),
      ],
    }
    const computed = computeAll(mixedData)[0]

    expect(computed.session.estimatedPowerCleanMax).toBe(360)
    expect(computed.session.powerCleanMax).toBe(240)
    expect(computed.metrics.powerCleanMax).toBe(240)
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

  it('stacks the Playmaker and awareness boosts onto FAI while keeping the base', () => {
    const computed = computeAll(completeData)
    const id = computed[0].athlete.id
    const base = buildResults(computed)[0]

    const boosted = buildResults(
      computed,
      undefined,
      new Map([[id, 2]]), // Playmaker/Havoc +2%
      new Map([[id, 3]]), // awareness +3%
    )[0]
    expect(boosted.baseFai).toBe(base.current.fai)
    expect(boosted.impactBoostPct).toBe(2)
    expect(boosted.awarenessBoostPct).toBe(3)
    const expected = Math.round(Math.min(100, base.current.fai * 1.05) * 10) / 10
    expect(boosted.current.fai).toBe(expected)

    // No boost maps → FAI is unchanged and both boost fields are zero.
    const none = buildResults(computed)[0]
    expect(none.awarenessBoostPct).toBe(0)
    expect(none.impactBoostPct).toBe(0)
    expect(none.current.fai).toBe(none.baseFai)
  })

  it('recomputes one testing card against a selected secondary position group', () => {
    const merged = computeAll(completeData)[0]
    const withTen = { ...merged.session, dash10_1: 1.7, dash10_2: 1.73 }
    const skillView = computeSessionForPositionGroup(withTen, athlete, event, 'WR')
    const lineView = computeSessionForPositionGroup(
      { ...withTen, positionSnapshot: 'OT', positionGroupSnapshot: 'OL' },
      { ...athlete, position: 'OT', positionGroup: 'OL', weightLbs: 270 },
      event,
      'OL',
    )

    expect(skillView.normalized.best10).toBeUndefined()
    expect(lineView.normalized.best10).toBe(100)
    expect(lineView.fai).not.toBe(skillView.fai)
  })

  it('preserves legitimate zero benchmark scores', () => {
    expect(benchmarkScore(5.25, { elite: 4.4, developmental: 5.25 }, false)).toBe(0)
    expect(benchmarkScore(4.4, { elite: 4.4, developmental: 5.25 }, false)).toBe(100)
  })

  it('cuts Strength to 5% for RB, WR, DB, and ATH while preserving 10% for other groups', () => {
    for (const group of ['RB', 'WR', 'DB', 'ATH'] as PositionGroup[]) {
      const weights = categoryWeightsFor(group)
      expect(weights.Strength).toBe(0.05)
      expect(weights.Speed).toBe(0.18)
      expect(weights.Acceleration).toBe(0.17)
      expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
    }

    for (const group of ['QB', 'TE', 'OL', 'DL', 'LB', 'K/P'] as PositionGroup[]) {
      expect(categoryWeightsFor(group).Strength).toBe(0.1)
    }
  })

  it('weights and grades the 10-yard dash for offensive linemen', () => {
    const fast = computeAll(dataForGroup('OL', 1.7))[0]
    const developmental = computeAll(dataForGroup('OL', 2.25))[0]

    expect(fast.metrics.best10).toBe(1.7)
    expect(fast.normalized.best10).toBe(100)
    expect(developmental.normalized.best10).toBe(0)
    expect(fast.categories.Acceleration).toBeGreaterThan(developmental.categories.Acceleration)
    expect(fast.fai).toBeGreaterThan(developmental.fai)
  })

  it('weights and grades the 10-yard dash for defensive linemen', () => {
    const result = computeAll(dataForGroup('DL', 1.85))[0]

    expect(result.metrics.best10).toBe(1.85)
    expect(result.normalized.best10).toBeTypeOf('number')
  })

  it('records but does not grade or weight the 10-yard dash for non-linemen', () => {
    const baseline = computeAll(completeData)[0]
    const withTenDash = computeAll({
      ...completeData,
      sessions: completeData.sessions.map((item, index) => ({
        ...item,
        dash10_1: index === 0 ? 1.55 : undefined,
        dash10_2: index === 0 ? 1.58 : undefined,
      })),
    })[0]

    expect(withTenDash.metrics.best10).toBe(1.55)
    expect(withTenDash.normalized.best10).toBeUndefined()
    expect(withTenDash.categories.Speed).toBe(baseline.categories.Speed)
    expect(withTenDash.fai).toBe(baseline.fai)
    expect(withTenDash.completionPct).toBe(100)
  })
})
