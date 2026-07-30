import { describe, expect, it } from 'vitest'
import { followViewForAthlete } from './filmAutoFollowViewport'

describe('followViewForAthlete', () => {
  it('moves a zoomed viewport toward an athlete outside the dead zone', () => {
    const next = followViewForAthlete(
      { zoom: 2, panX: -0.5, panY: -0.5 },
      { x: 0.8, y: 0.5 },
      { smoothing: 1 },
    )
    expect(next.panX).toBeCloseTo(-1)
    expect(next.panY).toBeCloseTo(-0.5)
  })

  it('does not jitter while the athlete remains near center', () => {
    const view = { zoom: 2, panX: -0.5, panY: -0.5 }
    expect(followViewForAthlete(view, { x: 0.5, y: 0.5 })).toEqual(view)
  })

  it('raises zoom to the configured follow minimum', () => {
    const next = followViewForAthlete(
      { zoom: 1, panX: 0, panY: 0 },
      { x: 0.5, y: 0.5 },
      { minimumZoom: 2 },
    )
    expect(next.zoom).toBe(2)
  })
})
