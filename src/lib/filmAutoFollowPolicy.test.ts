import { describe, expect, it } from 'vitest'
import { decideAutoFollow, predictAutoFollowPoint, type AutoFollowState } from './filmAutoFollowPolicy'

const baseState: AutoFollowState = {
  lockedTrackId: 'track-7',
  acceptedPoint: { x: 0.2, y: 0.5 },
  velocity: { x: 0.03, y: 0 },
  lowConfidenceFrames: 0,
  recoveryLevel: 0,
}

describe('auto-follow identity policy', () => {
  it('predicts beyond the previous stationary search center', () => {
    expect(predictAutoFollowPoint(baseState)).toEqual({ x: 0.23, y: 0.5 })
  })

  it('accepts a reliable continuation and updates velocity without changing track identity', () => {
    const decision = decideAutoFollow(baseState, {
      point: { x: 0.235, y: 0.5 },
      confidence: 0.84,
      cameraConfidence: 0.7,
      blurLevel: 0.1,
    }, 360)

    expect(decision.action).toBe('accept')
    expect(decision.state.lockedTrackId).toBe('track-7')
    expect(decision.state.acceptedPoint.x).toBeCloseTo(0.235)
    expect(decision.state.lowConfidenceFrames).toBe(0)
  })

  it('widens recovery before giving up on a temporarily uncertain frame', () => {
    const decision = decideAutoFollow(baseState, {
      point: { x: 0.24, y: 0.5 },
      confidence: 0.31,
      cameraConfidence: 0.6,
      blurLevel: 0.2,
    }, 360)

    expect(decision.action).toBe('recover')
    expect(decision.searchRadiusPx).toBeGreaterThan(30)
    expect(decision.state.lockedTrackId).toBe('track-7')
  })

  it('pauses rather than switching to a distant crossing player', () => {
    const decision = decideAutoFollow({ ...baseState, lowConfidenceFrames: 3, recoveryLevel: 1 }, {
      point: { x: 0.68, y: 0.52 },
      confidence: 0.93,
      cameraConfidence: 0.8,
      blurLevel: 0.1,
    }, 360)

    expect(decision.action).toBe('pause-for-correction')
    expect(decision.reason).toMatch(/motion envelope/)
    expect(decision.state.lockedTrackId).toBe('track-7')
    expect(decision.state.acceptedPoint).toEqual(baseState.acceptedPoint)
  })

  it('pauses after recovery cannot find a reliable match', () => {
    const decision = decideAutoFollow({ ...baseState, lowConfidenceFrames: 5, recoveryLevel: 1 }, undefined, 360)
    expect(decision.action).toBe('pause-for-correction')
    expect(decision.state.lockedTrackId).toBe('track-7')
  })
})
