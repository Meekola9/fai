import { describe, expect, it } from 'vitest'
import {
  IDENTITY_VIEW,
  MAX_FILM_ZOOM,
  clampView,
  panBy,
  viewTransform,
  zoomAt,
} from './filmZoom'

const W = 1000
const H = 562

describe('film zoom math', () => {
  it('forces the offset to zero at 1x', () => {
    expect(clampView({ zoom: 1, x: -50, y: 30 }, W, H)).toEqual({ zoom: 1, x: 0, y: 0 })
  })

  it('clamps zoom to the 1x–5x range', () => {
    expect(clampView({ zoom: 0.2, x: 0, y: 0 }, W, H).zoom).toBe(1)
    expect(clampView({ zoom: 99, x: 0, y: 0 }, W, H).zoom).toBe(MAX_FILM_ZOOM)
  })

  it('keeps the panned film from leaving the frame', () => {
    // At 2x the offset may range from -W (…flush right) to 0 (flush left).
    expect(clampView({ zoom: 2, x: 200, y: 0 }, W, H).x).toBe(0)
    expect(clampView({ zoom: 2, x: -5000, y: 0 }, W, H).x).toBe(-W)
    expect(clampView({ zoom: 2, x: -5000, y: -5000 }, W, H).y).toBe(-H)
  })

  it('zooms toward a focal point, keeping that content fixed', () => {
    const focalX = 400
    const focalY = 200
    const next = zoomAt(IDENTITY_VIEW, 2, focalX, focalY, W, H)
    expect(next.zoom).toBe(2)
    // The content point under the cursor must map back to the same screen spot.
    const backX = next.x + ((focalX - IDENTITY_VIEW.x) / IDENTITY_VIEW.zoom) * next.zoom
    expect(backX).toBeCloseTo(focalX, 5)
  })

  it('zooming back to 1x recenters', () => {
    const zoomed = zoomAt(IDENTITY_VIEW, 3, 800, 400, W, H)
    const reset = zoomAt(zoomed, 1, 800, 400, W, H)
    expect(reset).toEqual({ zoom: 1, x: 0, y: 0 })
  })

  it('pans within bounds', () => {
    const zoomed = zoomAt(IDENTITY_VIEW, 2, 500, 281, W, H)
    const panned = panBy(zoomed, -100, -50, W, H)
    expect(panned.x).toBeLessThanOrEqual(0)
    expect(panned.x).toBeGreaterThanOrEqual(W * (1 - 2))
  })

  it('renders a top-left transform string', () => {
    expect(viewTransform({ zoom: 2, x: -10, y: -20 })).toBe('translate(-10px, -20px) scale(2)')
  })
})
