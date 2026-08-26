import { describe, expect, it } from 'vitest'
import type { Athlete, PlayEvent } from '../types'
import { buildPlayerGameImpact } from './playerGameImpact'

function athlete(id: string): Athlete {
  return { id, name: 'A', grade: 11, position: 'DB', positionGroup: 'DB', heightIn: 70, weightLbs: 180 }
}
function play(type: string, date: string, opponent: string): PlayEvent {
  return { id: `p-${date}-${type}-${Math.random()}`, athleteId: 'a', type, date, opponent }
}

describe('buildPlayerGameImpact', () => {
  const a = athlete('a')

  it('returns nothing when the athlete has no games', () => {
    expect(buildPlayerGameImpact(a, [])).toEqual([])
  })

  it('reports per-game (not cumulative) impact, chronological', () => {
    const plays = [
      play('interception', '2026-09-01', 'Central'), // +5 havoc
      play('sack', '2026-09-01', 'Central'), // +3 havoc, same game
      play('missed_tackle', '2026-09-08', 'North'), // -2 havoc, next game
    ]
    const rows = buildPlayerGameImpact(a, plays)
    expect(rows.map((r) => r.gameLabel)).toEqual(['Central', 'North'])
    expect(rows[0].havocPoints).toBe(8) // this game only
    expect(rows[0].playCount).toBe(2)
    expect(rows[1].havocPoints).toBe(-2) // not cumulative
    expect(rows[1].playCount).toBe(1)
  })

  it('carries per-game efficiency', () => {
    const rows = buildPlayerGameImpact(a, [
      play('interception', '2026-09-01', 'Central'), // all positive → 100%
      play('missed_tackle', '2026-09-08', 'North'), // all negative → 0%
    ])
    expect(rows[0].efficiency).toBe(100)
    expect(rows[1].efficiency).toBe(0)
  })
})
