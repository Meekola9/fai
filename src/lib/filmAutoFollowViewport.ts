import type { FilmAnnotationPoint } from '../types'
import type { FilmView } from './filmZoom'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export interface AutoFollowViewportOptions {
  deadZone?: number
  smoothing?: number
  minimumZoom?: number
  width?: number
  height?: number
}

/**
 * Recenter an already-zoomed Film Room viewport around a tracked athlete.
 * FilmView translations are stored in container pixels, so the stage width and
 * height are used to convert normalized source-video coordinates correctly.
 */
export function followViewForAthlete(
  view: FilmView,
  athlete: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  options: AutoFollowViewportOptions = {},
): FilmView {
  const deadZone = clamp(options.deadZone ?? 0.06, 0, 0.25)
  const smoothing = clamp(options.smoothing ?? 0.34, 0.05, 1)
  const minimumZoom = clamp(options.minimumZoom ?? 1.65, 1, 5)
  const width = Math.max(1, options.width ?? 1)
  const height = Math.max(1, options.height ?? 1)
  const zoom = Math.max(view.zoom, minimumZoom)

  const screenX = athlete.x * width * zoom + view.x
  const screenY = athlete.y * height * zoom + view.y
  const targetX = width / 2
  const targetY = height / 2
  const errorX = Math.abs(screenX - targetX) > width * deadZone ? targetX - screenX : 0
  const errorY = Math.abs(screenY - targetY) > height * deadZone ? targetY - screenY : 0

  const minX = width * (1 - zoom)
  const minY = height * (1 - zoom)
  return {
    zoom,
    x: clamp(view.x + errorX * smoothing, minX, 0),
    y: clamp(view.y + errorY * smoothing, minY, 0),
  }
}
