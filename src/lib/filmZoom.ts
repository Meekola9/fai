// ---------------------------------------------------------------------------
// Pure math for independent Film Room zoom & pan. The view is applied as a CSS
// transform (translate then scale, origin top-left) on the container that holds
// both the video and the overlay canvas, so every overlay stays pixel-aligned
// with the film. Keeping the math pure makes it testable and keeps the
// component wiring thin.
// ---------------------------------------------------------------------------

export interface FilmView {
  /** 1 = fit, up to MAX_FILM_ZOOM. */
  zoom: number
  /** Container-pixel translation applied before scaling. */
  x: number
  y: number
}

export const IDENTITY_VIEW: FilmView = { zoom: 1, x: 0, y: 0 }
export const MIN_FILM_ZOOM = 1
export const MAX_FILM_ZOOM = 5

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/** Keep zoom in range and the panned film from leaving the frame. */
export function clampView(view: FilmView, width: number, height: number): FilmView {
  const zoom = clamp(view.zoom, MIN_FILM_ZOOM, MAX_FILM_ZOOM)
  // Scaling about the top-left grows the content down-right, so valid offsets
  // run from width*(1-zoom) (bottom/right edge flush) up to 0 (top/left flush).
  const minX = width * (1 - zoom)
  const minY = height * (1 - zoom)
  return {
    zoom,
    x: clamp(view.x, minX, 0),
    y: clamp(view.y, minY, 0),
  }
}

/**
 * Zoom to `nextZoom` while keeping the content point under (focalX, focalY) —
 * given in container pixels — fixed on screen. This is the cursor/pinch-anchored
 * zoom coaches expect.
 */
export function zoomAt(
  view: FilmView,
  nextZoom: number,
  focalX: number,
  focalY: number,
  width: number,
  height: number,
): FilmView {
  const zoom = clamp(nextZoom, MIN_FILM_ZOOM, MAX_FILM_ZOOM)
  const contentX = (focalX - view.x) / view.zoom
  const contentY = (focalY - view.y) / view.zoom
  return clampView(
    { zoom, x: focalX - contentX * zoom, y: focalY - contentY * zoom },
    width,
    height,
  )
}

/** Translate the view by a pixel delta, clamped to the frame. */
export function panBy(
  view: FilmView,
  dx: number,
  dy: number,
  width: number,
  height: number,
): FilmView {
  return clampView({ zoom: view.zoom, x: view.x + dx, y: view.y + dy }, width, height)
}

/** CSS transform string for the view (origin must be top-left). */
export function viewTransform(view: FilmView): string {
  return `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`
}
