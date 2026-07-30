import type { FilmAnnotationPoint } from '../types'
import type { FilmView } from './filmZoom'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export interface AutoFollowViewportOptions {
  deadZone?: number
  smoothing?: number
  minimumZoom?: number
}

/**
 * Recenter an already-zoomed Film Room viewport around a tracked athlete.
 * The dead zone avoids camera jitter while smoothing prevents hard snaps.
 */
export function followViewForAthlete(
  view: FilmView,
  athlete: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  options: AutoFollowViewportOptions = {},
): FilmView {
  const deadZone = clamp(options.deadZone ?? 0.06, 0, 0.25)
  const smoothing = clamp(options.smoothing ?? 0.34, 0.05, 1)
  const minimumZoom = clamp(options.minimumZoom ?? 1.65, 1, 5)
  const zoom = Math.max(view.zoom, minimumZoom)

  const screenX = athlete.x * zoom + view.panX
  const screenY = athlete.y * zoom + view.panY
  const errorX = Math.abs(screenX - 0.5) > deadZone ? 0.5 - screenX : 0
  const errorY = Math.abs(screenY - 0.5) > deadZone ? 0.5 - screenY : 0

  const minPan = 1 - zoom
  return {
    zoom,
    panX: clamp(view.panX + errorX * smoothing, minPan, 0),
    panY: clamp(view.panY + errorY * smoothing, minPan, 0),
  }
}
