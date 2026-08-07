import { describe, expect, it } from 'vitest'
import {
  createPlayerTrack,
  formatTrackTime,
  isPlayerTrack,
  removeTrackKeyframe,
  trackBoxAt,
  trackFieldAt,
  trackFieldTrailAt,
  trackKeyframes,
  trackPositionAt,
  trackTrailAt,
  upsertTrackKeyframe,
} from './filmTracking'

describe('trackFieldAt / trackFieldTrailAt (top-down field map)', () => {
  const points = [
    { x: 0.4, y: 0.5, t: 0, field: [10, 20] as [number, number] },
    { x: 0.6, y: 0.5, t: 2, field: [30, 20] as [number, number] },
  ]

  it('interpolates the field position between keyframes', () => {
    const pos = trackFieldAt(points, 1)
    expect(pos).toBeDefined()
    expect(pos![0]).toBeCloseTo(20, 5)
    expect(pos![1]).toBeCloseTo(20, 5)
  })

  it('is hidden before the first field keyframe and clamps after the last', () => {
    expect(trackFieldAt(points, -1)).toBeUndefined()
    expect(trackFieldAt(points, 99)).toEqual([30, 20])
  })

  it('returns undefined when no point carries field yards', () => {
    expect(trackFieldAt([{ x: 0.5, y: 0.5, t: 0 }], 0)).toBeUndefined()
  })

  it('builds a field trail up to the current time', () => {
    const trail = trackFieldTrailAt(points, 1)
    expect(trail[0]).toEqual([10, 20])
    expect(trail.at(-1)![0]).toBeCloseTo(20, 5)
    expect(trackFieldTrailAt([{ x: 0.5, y: 0.5, t: 0 }], 0)).toEqual([])
  })
})

describe('trackBoxAt (player highlight box)', () => {
  const points = [
    { x: 0.5, y: 0.5, t: 0, box: [0.4, 0.3, 0.5, 0.6] as [number, number, number, number] },
    { x: 0.6, y: 0.5, t: 1, box: [0.6, 0.3, 0.7, 0.6] as [number, number, number, number] },
  ]

  it('preserves box coordinates through the keyframe reducer', () => {
    expect(trackKeyframes(points)[0].box).toEqual([0.4, 0.3, 0.5, 0.6])
  })

  it('interpolates the box between keyframes', () => {
    const box = trackBoxAt(points, 0.5)
    expect(box).toBeDefined()
    expect(box![0]).toBeCloseTo(0.5, 5)
    expect(box![2]).toBeCloseTo(0.6, 5)
  })

  it('is hidden before the first boxed keyframe and clamps after the last', () => {
    expect(trackBoxAt(points, -1)).toBeUndefined()
    expect(trackBoxAt(points, 99)).toEqual([0.6, 0.3, 0.7, 0.6])
  })

  it('returns undefined when no point carries a box', () => {
    expect(trackBoxAt([{ x: 0.5, y: 0.5, t: 0 }], 0)).toBeUndefined()
  })

  it('normalizes reversed corners so x1<=x2 and y1<=y2', () => {
    const reversed = [{ x: 0.5, y: 0.5, t: 0, box: [0.7, 0.6, 0.4, 0.3] as [number, number, number, number] }]
    expect(trackKeyframes(reversed)[0].box).toEqual([0.4, 0.3, 0.7, 0.6])
  })
})

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
