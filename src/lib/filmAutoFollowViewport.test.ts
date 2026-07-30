import { describe, expect, it } from 'vitest'
import { followViewForAthlete } from './filmAutoFollowViewport'

const stage = { width: 1000, height: 500 }

describe('followViewForAthlete', () => {
  it('moves a zoomed viewport toward an athlete outside the dead zone', () => {
    const next = followViewForAthlete(
      { zoom: 2, x: -500, y: -250 },
      { x: 0.8, y: 0.5 },
      { ...stage, smoothing: 1 },
    )
    expect(next.x).toBeCloseTo(-1000)
    expect(next.y).toBeCloseTo(-250)
  })

  it('does not jitter while the athlete remains near center', () => {
    const view = { zoom: 2, x: -500, y: -250 }
    expect(followViewForAthlete(view, { x: 0.5, y: 0.5 }, stage)).toEqual(view)
  })

  it('raises zoom to the configured follow minimum and centers the athlete', () => {
    const next = followViewForAthlete(
      { zoom: 1, x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { ...stage, minimumZoom: 2, smoothing: 1 },
    )
    expect(next).toEqual({ zoom: 2, x: -500, y: -250 })
  })
})
