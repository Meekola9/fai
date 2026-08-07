import type { FilmAnnotation, FilmAnnotationPoint } from '../types'
import { trackKeyframes } from './filmTracking'

const FIELD_LENGTH = 100 // yards
const FIELD_WIDTH = 53.3 // yards

/**
 * A dwell-time occupancy grid over the field, built from CV field coordinates.
 * `cells` is row-major (length cols*rows), normalized 0-1 against the busiest cell.
 */
export interface FieldHeatmap {
  cols: number
  rows: number
  cells: number[]
  hasField: boolean
  /** Seconds accumulated in the busiest cell — for a legend/tooltip. */
  peakSeconds: number
}

/**
 * Cap on the time credited to a single step. A tracking gap (player leaves frame
 * and returns) produces one huge dt that would otherwise dominate the map; capping
 * keeps the heatmap about where players actually spent time, not gaps.
 */
const MAX_STEP_SECONDS = 0.5

function fieldKeyframes(points: readonly FilmAnnotationPoint[]): Array<{ t: number; field: [number, number] }> {
  return trackKeyframes(points)
    .filter((p): p is FilmAnnotationPoint & { t: number; field: [number, number] } => Array.isArray(p.field))
    .map((p) => ({ t: p.t, field: p.field }))
}

/** Dwell-weighted occupancy heatmap across one or more player tracks. */
export function buildFieldHeatmap(
  tracks: readonly FilmAnnotation[],
  options: { cols?: number; rows?: number } = {},
): FieldHeatmap {
  const cols = options.cols ?? 20
  const rows = options.rows ?? 11
  const grid = new Array<number>(cols * rows).fill(0)
  let hasField = false

  const cellIndex = (x: number, y: number): number => {
    const gx = Math.max(0, Math.min(cols - 1, Math.floor((x / FIELD_LENGTH) * cols)))
    const gy = Math.max(0, Math.min(rows - 1, Math.floor((y / FIELD_WIDTH) * rows)))
    return gy * cols + gx
  }

  for (const track of tracks) {
    const located = fieldKeyframes(track.points)
    if (located.length === 0) continue
    hasField = true
    if (located.length === 1) {
      grid[cellIndex(located[0].field[0], located[0].field[1])] += MAX_STEP_SECONDS
      continue
    }
    for (let i = 0; i < located.length - 1; i += 1) {
      const dt = Math.min(MAX_STEP_SECONDS, Math.max(0, located[i + 1].t - located[i].t))
      grid[cellIndex(located[i].field[0], located[i].field[1])] += dt
    }
  }

  const peak = grid.reduce((max, value) => Math.max(max, value), 0)
  const cells = peak > 0 ? grid.map((value) => value / peak) : grid
  return { cols, rows, cells, hasField, peakSeconds: Math.round(peak * 100) / 100 }
}
