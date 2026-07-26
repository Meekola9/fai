import { describe, expect, it } from 'vitest'
import type { ThrowAnalysis } from '../types'
import {
  computeThrowMetrics,
  suggestThrowFamily,
  upsertThrowAnalysis,
  throwAnalysisAnnotation,
} from './throwAnalysis'

describe('QB throw analysis', () => {
  it('calculates timing and average ball speed from marked frames and air distance', () => {
    const metrics = computeThrowMetrics({
      snapTimeSec: 1,
      plantTimeSec: 2.4,
      releaseTimeSec: 2.6,
      arrivalTimeSec: 3.6,
      throwDistanceYards: 30,
    })

    expect(metrics.timeToThrowSec).toBeCloseTo(1.6)
    expect(metrics.plantToReleaseSec).toBeCloseTo(0.2)
    expect(metrics.flightTimeSec).toBeCloseTo(1)
    expect(metrics.averageBallSpeedMph).toBeCloseTo(61.36, 1)
  })

  it('calculates release-frame mechanics from eight coach-marked landmarks', () => {
    const analysis: ThrowAnalysis = {
      landmarks: {
        throwingShoulder: { x: 0.4, y: 0.4 },
        throwingElbow: { x: 0.5, y: 0.3 },
        throwingWrist: { x: 0.6, y: 0.4 },
        frontShoulder: { x: 0.55, y: 0.4 },
        throwingHip: { x: 0.42, y: 0.6 },
        frontHip: { x: 0.56, y: 0.55 },
        backFoot: { x: 0.4, y: 0.85 },
        frontFoot: { x: 0.62, y: 0.8 },
      },
    }
    const metrics = computeThrowMetrics(analysis)

    expect(metrics.elbowAngleDeg).toBeCloseTo(90, 0)
    expect(metrics.armSlotAngleDeg).toBeCloseTo(0, 0)
    expect(metrics.shoulderHipSeparationDeg).toBeGreaterThan(10)
    expect(metrics.baseWidthPct).toBeCloseTo(22)
    expect(metrics.strideLineAngleDeg).toBeDefined()
  })

  it('suggests throw family from play context, timing, distance, and platform', () => {
    expect(suggestThrowFamily({}, 'screen')).toBe('screen')
    expect(suggestThrowFamily({ snapTimeSec: 0, releaseTimeSec: 1.5 })).toBe('quick-game')
    expect(suggestThrowFamily({
      snapTimeSec: 0,
      releaseTimeSec: 2.8,
      throwDistanceYards: 30,
    })).toBe('deep-shot')
    expect(suggestThrowFamily({ platform: 'moving-right' })).toBe('rollout')
  })

  it('stores one throw analysis record inside the annotation JSON', () => {
    const first = upsertThrowAnalysis([], { throwFamily: 'dropback' })
    const second = upsertThrowAnalysis(first, { throwFamily: 'quick-game', releaseTimeSec: 2 })

    expect(second).toHaveLength(1)
    expect(throwAnalysisAnnotation(second)?.throwAnalysis).toMatchObject({
      throwFamily: 'quick-game',
      releaseTimeSec: 2,
    })
  })

  it('warns when timeline markers are saved out of sequence', () => {
    const metrics = computeThrowMetrics({
      snapTimeSec: 2,
      plantTimeSec: 1.5,
      releaseTimeSec: 2.5,
    })
    expect(metrics.timingWarning).toMatch(/out of order/i)
  })
})
