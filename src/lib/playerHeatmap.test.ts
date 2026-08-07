import { describe, expect, it } from 'vitest'
import type { FilmAnnotation } from '../types'
import { buildFieldHeatmap } from './playerHeatmap'

function track(id: string, points: Array<{ t: number; field?: [number, number] }>): FilmAnnotation {
  return {
    id,
    kind: 'trail',
    label: id,
    tracking: true,
    points: points.map((p) => ({ x: 0.5, y: 0.5, t: p.t, field: p.field })),
  }
}

describe('buildFieldHeatmap', () => {
  it('reports no field data when tracks lack field coordinates', () => {
    const heat = buildFieldHeatmap([track('a', [{ t: 0 }, { t: 1 }])])
    expect(heat.hasField).toBe(false)
    expect(heat.peakSeconds).toBe(0)
    expect(heat.cells.every((v) => v === 0)).toBe(true)
  })

  it('accumulates dwell time into the cell where a player sits', () => {
    // Player parked near one spot for ~1s of steps.
    const heat = buildFieldHeatmap(
      [track('a', [
        { t: 0.0, field: [10, 10] },
        { t: 0.1, field: [10, 10] },
        { t: 0.2, field: [10, 10] },
      ])],
      { cols: 10, rows: 5 },
    )
    expect(heat.hasField).toBe(true)
    expect(heat.cells.filter((v) => v > 0)).toHaveLength(1)
    expect(Math.max(...heat.cells)).toBe(1) // normalized peak
  })

  it('caps a tracking gap so it cannot dominate the map', () => {
    const heat = buildFieldHeatmap(
      [track('a', [
        { t: 0, field: [10, 10] }, // followed by a 100s gap — must be capped
        { t: 100, field: [90, 40] },
      ])],
      { cols: 10, rows: 5 },
    )
    // The gap step is capped, so the first cell holds only the cap, not 100s.
    expect(heat.peakSeconds).toBeLessThanOrEqual(0.5)
  })
})
