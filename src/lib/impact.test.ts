import { describe, expect, it } from 'vitest'
import type { Athlete, PlayEvent } from '../types'
import { boostForLevel, buildImpact, levelForPoints, levelThreshold, playPoints } from './impact'

function athlete(id: string, name: string): Athlete {
  return { id, name, grade: 11, position: 'DB', positionGroup: 'DB', heightIn: 70, weightLbs: 180 }
}
function play(athleteId: string, type: string): PlayEvent {
  return { id: `p-${Math.random()}`, athleteId, type, date: '2026-09-01' }
}

describe('impact scoring', () => {
  it('splits havoc and playmaker points per athlete', () => {
    const athletes = [athlete('a', 'Defender'), athlete('b', 'Scorer')]
    const plays = [
      play('a', 'interception'), // 5 havoc
      play('a', 'sack'), // 3 havoc
      play('b', 'touchdown'), // 5 playmaker
      play('b', 'explosion'), // 3 playmaker
    ]
    const summary = buildImpact(plays, athletes)
    const a = summary.athletes.find((item) => item.athlete.id === 'a')!
    const b = summary.athletes.find((item) => item.athlete.id === 'b')!
    expect(a.havocPoints).toBe(8)
    expect(a.playmakerPoints).toBe(0)
    expect(b.playmakerPoints).toBe(8)
    expect(summary.teamHavoc).toBe(8)
    expect(summary.teamPlaymaker).toBe(8)
  })

  it('omits athletes with no plays and ranks by total points', () => {
    const athletes = [athlete('a', 'A'), athlete('b', 'B'), athlete('c', 'None')]
    const plays = [play('a', 'pass_breakup'), play('b', 'pick_six')]
    const summary = buildImpact(plays, athletes)
    expect(summary.athletes.map((item) => item.athlete.id)).toEqual(['b', 'a'])
    expect(summary.athletes.some((item) => item.athlete.id === 'c')).toBe(false)
  })

  it('levels up with growing thresholds', () => {
    expect(levelThreshold(1)).toBe(0)
    expect(levelThreshold(2)).toBe(5)
    expect(levelThreshold(3)).toBe(15)
    expect(levelForPoints(0).level).toBe(1)
    expect(levelForPoints(5).level).toBe(2)
    expect(levelForPoints(14).level).toBe(2)
    expect(levelForPoints(15).level).toBe(3)
    const mid = levelForPoints(10) // between 5 and 15
    expect(mid.level).toBe(2)
    expect(mid.progress).toBeCloseTo(0.5, 5)
  })

  it('subtracts negative plays and tracks the penalty, keeping team meters positive-only', () => {
    const athletes = [athlete('a', 'A')]
    const plays = [
      play('a', 'interception'), // +5 havoc
      play('a', 'missed_tackle'), // -2 havoc
      play('a', 'td_allowed'), // -3 havoc
    ]
    const summary = buildImpact(plays, athletes)
    const a = summary.athletes[0]
    expect(a.havocPoints).toBe(0) // 5 - 2 - 3
    expect(a.negativePoints).toBe(5)
    expect(summary.teamHavoc).toBe(5) // meter shows chaos created (positives only)
  })

  it('grants a capped FAI boost that grows with level and never goes negative', () => {
    expect(boostForLevel(1)).toBe(0)
    expect(boostForLevel(2)).toBe(1)
    expect(boostForLevel(4)).toBe(3)
    expect(boostForLevel(50)).toBe(10) // capped
    // an athlete with only mistakes stays level 1 with no boost
    const summary = buildImpact([play('a', 'missed_tackle')], [athlete('a', 'A')])
    expect(summary.athletes[0].level.level).toBe(1)
    expect(summary.athletes[0].boostPct).toBe(0)
    expect(summary.boostByAthlete.size).toBe(0)
  })

  it('ignores unknown play types for points but still counts them', () => {
    expect(playPoints('interception')).toBe(5)
    expect(playPoints('not_a_play')).toBe(0)
    const summary = buildImpact([play('a', 'not_a_play')], [athlete('a', 'A')])
    expect(summary.athletes[0].totalPoints).toBe(0)
    expect(summary.athletes[0].playCount).toBe(1)
  })
})
