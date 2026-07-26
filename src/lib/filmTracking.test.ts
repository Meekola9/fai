import { describe, expect, it } from 'vitest'
import {
  createPlayerTrack,
  formatTrackTime,
  isPlayerTrack,
  removeTrackKeyframe,
  trackKeyframes,
  trackPositionAt,
  trackTrailAt,
  upsertTrackKeyframe,
} from './filmTracking'

describe('coach-assisted film tracking', () => {
  it('creates a persisted player track annotation', () => {
    const track = createPlayerTrack({ id: 'track-1', label: 'WR #1', side: 'offense', athleteId: 'a1' })
    expect(isPlayerTrack(track)).toBe(true)
    expect(track).toMatchObject({
      kind: 'trail',
      tracking: true,
      trackingSide: 'offense',
      athleteId: 'a1',
      label: 'WR #1',
      points: [],
    })
  })

  it('sorts keyframes and replaces a point on the same frame', () => {
    let points = upsertTrackKeyframe([], 2, { x: 0.8, y: 0.4 })
    points = upsertTrackKeyframe(points, 1, { x: 0.2, y: 0.3 })
    points = upsertTrackKeyframe(points, 1.005, { x: 0.25, y: 0.35 })

    expect(trackKeyframes(points)).toEqual([
      { x: 0.25, y: 0.35, t: 1.005 },
      { x: 0.8, y: 0.4, t: 2 },
    ])
  })

  it('interpolates a player position between confirmed keyframes', () => {
    const points = [
      { x: 0.2, y: 0.4, t: 1 },
      { x: 0.8, y: 0.6, t: 3 },
    ]
    expect(trackPositionAt(points, 0.5)).toBeUndefined()
    expect(trackPositionAt(points, 2)).toEqual({ x: 0.5, y: 0.5, t: 2 })
    expect(trackPositionAt(points, 5)).toEqual({ x: 0.8, y: 0.6, t: 3 })
  })

  it('draws a trail through the interpolated current position', () => {
    const points = [
      { x: 0.1, y: 0.2, t: 0 },
      { x: 0.5, y: 0.4, t: 2 },
      { x: 0.9, y: 0.8, t: 4 },
    ]
    expect(trackTrailAt(points, 3)).toEqual([
      { x: 0.1, y: 0.2, t: 0 },
      { x: 0.5, y: 0.4, t: 2 },
      { x: 0.7, y: 0.6000000000000001, t: 3 },
    ])
  })

  it('removes only a keyframe close to the current video frame', () => {
    const points = [
      { x: 0.1, y: 0.2, t: 1 },
      { x: 0.5, y: 0.4, t: 2 },
    ]
    expect(removeTrackKeyframe(points, 2.02)).toEqual([{ x: 0.1, y: 0.2, t: 1 }])
    expect(removeTrackKeyframe(points, 4)).toHaveLength(2)
  })

  it('formats frame time for the tracking controls', () => {
    expect(formatTrackTime(65.25)).toBe('1:05.25')
  })
})
