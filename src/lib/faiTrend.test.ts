import { describe, expect, it } from 'vitest'
import type { Athlete, PlayEvent } from '../types'
import { buildFaiTrend } from './faiTrend'

function athlete(id: string): Athlete {
  return { id, name: 'A', grade: 11, position: 'DB', positionGroup: 'DB', heightIn: 70, weightLbs: 180 }
}
function play(type: string, date: string, opponent: string): PlayEvent {
  return { id: `p-${date}-${type}-${Math.random()}`, athleteId: 'a', type, date, opponent }
}

describe('buildFaiTrend', () => {
  const a = athlete('a')

  it('returns the base FAI with no points when there are no games', () => {
    const trend = buildFaiTrend(a, 80, [])
    expect(trend.points).toHaveLength(0)
    expect(trend.latest).toBe(80)
    expect(trend.delta).toBe(0)
  })

  it('adds one point per game and accumulates plays across games', () => {
    const plays = [
      play('interception', '2026-09-01', 'Central'),
      play('sack', '2026-09-08', 'North'),
    ]
    const trend = buildFaiTrend(a, 80, plays)
    expect(trend.points.map((p) => p.gameLabel)).toEqual(['Central', 'North'])
    expect(trend.points[0].playCount).toBe(1)
    expect(trend.points[1].playCount).toBe(2) // cumulative
  })

  it('climbs as positive production accrues', () => {
    const plays = Array.from({ length: 6 }, (_, i) => play('interception', `2026-09-0${i + 1}`, `Opp${i}`))
    const trend = buildFaiTrend(a, 70, plays)
    expect(trend.latest).toBeGreaterThan(trend.baseFai)
    expect(trend.delta).toBeGreaterThan(0)
    // Monotonic non-decreasing as more good plays land.
    for (let i = 1; i < trend.points.length; i += 1) {
      expect(trend.points[i].fai).toBeGreaterThanOrEqual(trend.points[i - 1].fai)
    }
  })

  it('drops below base when a game is mistake-heavy (efficiency reduction)', () => {
    const plays = Array.from({ length: 6 }, (_, i) => play('missed_tackle', `2026-09-0${i + 1}`, `Opp${i}`))
    const trend = buildFaiTrend(a, 80, plays)
    expect(trend.latest).toBeLessThan(trend.baseFai)
    expect(trend.delta).toBeLessThan(0)
  })

  it('folds a fixed extra boost (e.g. awareness) into every point', () => {
    const withExtra = buildFaiTrend(a, 80, [play('interception', '2026-09-01', 'Central')], 5)
    const without = buildFaiTrend(a, 80, [play('interception', '2026-09-01', 'Central')], 0)
    expect(withExtra.latest).toBeGreaterThan(without.latest)
  })
})
