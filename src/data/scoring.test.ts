import { describe, expect, it } from 'vitest'
import {
  benchmarkFor,
  benchmarkScore,
  categoryWeightsFor,
  flyTimeToMph,
  metricWeightFor,
} from './scoring'

describe('flyTimeToMph', () => {
  it('converts a 10-yard fly time into miles per hour', () => {
    // 30 feet in 1.00s = 30 ft/s = 20.45 mph
    expect(flyTimeToMph(1.0)).toBeCloseTo(20.45, 2)
    expect(flyTimeToMph(1.5)).toBeCloseTo(13.64, 2)
    expect(flyTimeToMph(2.0)).toBeCloseTo(10.23, 2)
  })

  it('is monotonic: faster fly means higher mph', () => {
    expect(flyTimeToMph(1.2)).toBeGreaterThan(flyTimeToMph(1.4))
  })
})

describe('strength ratio scoring', () => {
  it.each(['RB', 'QB', 'OL', 'LB'] as const)('scores 1.10x bench as 90 and 1.40x as 100 for %s', (group) => {
    const benchmark = benchmarkFor('benchRatio', group)
    expect(benchmarkScore(1.1, benchmark, true)).toBeCloseTo(90, 5)
    expect(benchmarkScore(1.25, benchmark, true)).toBeGreaterThan(90)
    expect(benchmarkScore(1.25, benchmark, true)).toBeLessThan(100)
    expect(benchmarkScore(1.4, benchmark, true)).toBe(100)
    expect(benchmarkScore(1.5, benchmark, true)).toBe(100)
  })

  it.each(['RB', 'QB', 'OL', 'LB'] as const)('scores 2.15x squat as 90 and 2.60x as 100 for %s', (group) => {
    const benchmark = benchmarkFor('squatRatio', group)
    expect(benchmarkScore(2.15, benchmark, true)).toBeCloseTo(90, 5)
    expect(benchmarkScore(2.35, benchmark, true)).toBeGreaterThan(90)
    expect(benchmarkScore(2.35, benchmark, true)).toBeLessThan(100)
    expect(benchmarkScore(2.6, benchmark, true)).toBe(100)
    expect(benchmarkScore(2.75, benchmark, true)).toBe(100)
  })

  it('preserves separation below the 90-point strength threshold', () => {
    const bench = benchmarkFor('benchRatio', 'RB')
    const squat = benchmarkFor('squatRatio', 'RB')
    expect(benchmarkScore(0.8, bench, true)).toBeLessThan(benchmarkScore(1.0, bench, true))
    expect(benchmarkScore(1.4, squat, true)).toBeLessThan(benchmarkScore(1.9, squat, true))
    expect(benchmarkScore(1.0, bench, true)).toBeLessThan(90)
    expect(benchmarkScore(1.9, squat, true)).toBeLessThan(90)
  })
})

describe('position-specific weighting', () => {
  it('weights Pursuit at 15% for defensive linemen and linebackers', () => {
    for (const group of ['DL', 'LB'] as const) {
      const weights = categoryWeightsFor(group)
      expect(weights.Pursuit).toBe(0.15)
      expect(Object.values(weights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 8)
    }
  })

  it('keeps the default Pursuit weight for other position groups', () => {
    expect(categoryWeightsFor('OL').Pursuit).toBe(0.07)
    expect(categoryWeightsFor('RB').Pursuit).toBe(0.07)
    expect(categoryWeightsFor('DB').Pursuit).toBe(0.07)
  })

  it('gives lateral shuttle 65% of COD for OL, DB, and RB', () => {
    for (const group of ['OL', 'DB', 'RB'] as const) {
      expect(metricWeightFor('bestLatShuttle', group)).toBe(0.65)
      expect(metricWeightFor('best20Shuttle', group)).toBe(0.35)
    }
  })

  it('keeps COD tests evenly weighted for other positions', () => {
    expect(metricWeightFor('bestLatShuttle', 'LB')).toBe(1)
    expect(metricWeightFor('best20Shuttle', 'LB')).toBe(1)
    expect(metricWeightFor('bestLatShuttle', 'WR')).toBe(1)
    expect(metricWeightFor('best20Shuttle', 'WR')).toBe(1)
  })
})
