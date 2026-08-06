import { describe, expect, it } from 'vitest'
import type { FilmAnnotationPoint } from '../types'
import { YARDS_PER_SEC_TO_MPH, summarizeTrackSpeed } from './playerSpeed'

/** Build a track point with an optional field (yards) coordinate. */
function point(t: number, field?: [number, number]): FilmAnnotationPoint {
  return { x: 0.5, y: 0.5, t, source: 'auto', field }
}

describe('summarizeTrackSpeed', () => {
  it('returns an empty, hasField:false summary when no points carry field yards', () => {
    const summary = summarizeTrackSpeed([point(0), point(0.5), point(1)])
    expect(summary.hasField).toBe(false)
    expect(summary.topSpeedMph).toBe(0)
    expect(summary.avgSpeedMph).toBe(0)
  })

  it('needs at least two field-tracked samples', () => {
    expect(summarizeTrackSpeed([point(0, [10, 20])]).hasField).toBe(false)
  })

  it('computes average and top speed from a steady 10 yd/s run', () => {
    // 0 -> 10 yards along the field length over 1.0s, sampled every 0.1s.
    const points = Array.from({ length: 11 }, (_, i) => point(i * 0.1, [i, 26.6]))
    const summary = summarizeTrackSpeed(points)

    expect(summary.hasField).toBe(true)
    expect(summary.distanceYards).toBeCloseTo(10, 5)
    // 10 yd/s * 2.045 = 20.45 mph, both average and (steady) top.
    const expectedMph = Math.round(10 * YARDS_PER_SEC_TO_MPH * 10) / 10
    expect(summary.avgSpeedMph).toBe(expectedMph)
    expect(summary.topSpeedMph).toBe(expectedMph)
  })

  it('rejects a single spurious CV frame from the top-speed reading', () => {
    // A steady ~8 yd/s run (~16 mph) with one teleported point in the middle.
    const points = [
      point(0.0, [0, 0]),
      point(0.1, [0.8, 0]),
      point(0.2, [1.6, 0]),
      point(0.25, [40, 0]), // spurious jump — must not dominate
      point(0.3, [2.4, 0]),
      point(0.4, [3.2, 0]),
      point(0.5, [4.0, 0]),
    ]
    const summary = summarizeTrackSpeed(points)

    expect(summary.hasField).toBe(true)
    // The real run is ~16 mph; without jitter rejection the spike would read hundreds.
    expect(summary.topSpeedMph).toBeGreaterThanOrEqual(14)
    expect(summary.topSpeedMph).toBeLessThanOrEqual(20)
  })

  it('caps implausible speeds instead of trusting homography noise', () => {
    // 5 yards in 0.01s is ~1000 mph — pure noise; top speed must stay capped.
    const summary = summarizeTrackSpeed([point(0, [0, 0]), point(0.01, [5, 0])])
    expect(summary.topSpeedMph).toBeLessThanOrEqual(Math.round(14 * YARDS_PER_SEC_TO_MPH * 10) / 10)
  })
})
