import type {
  FilmAnnotation,
  FilmAnnotationPoint,
  PlaySide,
  TrackingTeam,
} from '../types'

export const TRACK_FRAME_SECONDS = 1 / 30
export const TRACK_KEYFRAME_TOLERANCE = TRACK_FRAME_SECONDS / 2

export const TRACK_COLORS: Record<PlaySide, string> = {
  offense: '#22d3ee',
  defense: '#fb7185',
  special: '#fbbf24',
}

function finiteTime(point: FilmAnnotationPoint): point is FilmAnnotationPoint & { t: number } {
  return typeof point.t === 'number' && Number.isFinite(point.t)
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function cleanField(value: FilmAnnotationPoint['field']): [number, number] | undefined {
  return Array.isArray(value) && Number.isFinite(value[0]) && Number.isFinite(value[1])
    ? [value[0], value[1]]
    : undefined
}

function cleanTime(value: number): number {
  return Math.max(0, Math.round(value * 1000) / 1000)
}

/** A timed player track saved inside the existing film annotation JSON. */
export function isPlayerTrack(annotation: FilmAnnotation): boolean {
  return annotation.kind === 'trail' && annotation.tracking === true
}

export function createPlayerTrack(input: {
  id: string
  athleteId?: string
  label: string
  side: PlaySide
  team?: TrackingTeam
  role?: string
}): FilmAnnotation {
  return {
    id: input.id,
    kind: 'trail',
    athleteId: input.athleteId,
    label: input.label.trim() || 'Tracked player',
    color: TRACK_COLORS[input.side],
    tracking: true,
    trackingSide: input.side,
    trackingTeam: input.team ?? 'opponent',
    formationRole: input.role?.trim() || undefined,
    trackingComplete: false,
    points: [],
  }
}

/** Sorted, finite keyframes with no duplicate timestamps. */
export function trackKeyframes(
  points: readonly FilmAnnotationPoint[],
): Array<FilmAnnotationPoint & { t: number }> {
  const sorted = points
    .filter(finiteTime)
    .map((point) => ({
      x: clampUnit(point.x),
      y: clampUnit(point.y),
      t: cleanTime(point.t),
      source: point.source,
      confidence: typeof point.confidence === 'number' && Number.isFinite(point.confidence)
        ? clampUnit(point.confidence)
        : undefined,
      field: cleanField(point.field),
    }))
    .sort((a, b) => a.t - b.t)

  const deduped: Array<FilmAnnotationPoint & { t: number }> = []
  for (const point of sorted) {
    const previous = deduped.at(-1)
    if (previous && previous.t === point.t) deduped[deduped.length - 1] = point
    else deduped.push(point)
  }
  return deduped
}

/** Add a keyframe or replace the keyframe on the same video frame. */
export function upsertTrackKeyframe(
  points: readonly FilmAnnotationPoint[],
  timeSec: number,
  point: Pick<FilmAnnotationPoint, 'x' | 'y'> & Partial<Pick<FilmAnnotationPoint, 'source' | 'confidence'>>,
  tolerance = TRACK_KEYFRAME_TOLERANCE,
): FilmAnnotationPoint[] {
  const nextTime = cleanTime(timeSec)
  const nextPoint: FilmAnnotationPoint = {
    x: clampUnit(point.x),
    y: clampUnit(point.y),
    t: nextTime,
    source: point.source,
    confidence: typeof point.confidence === 'number' ? clampUnit(point.confidence) : undefined,
  }
  const existing = trackKeyframes(points)
  const matchIndex = existing.findIndex((item) => Math.abs(item.t - nextTime) <= tolerance)
  if (matchIndex >= 0) existing[matchIndex] = nextPoint as FilmAnnotationPoint & { t: number }
  else existing.push(nextPoint as FilmAnnotationPoint & { t: number })
  return trackKeyframes(existing)
}

export function removeTrackKeyframe(
  points: readonly FilmAnnotationPoint[],
  timeSec: number,
  tolerance = TRACK_FRAME_SECONDS * 1.5,
): FilmAnnotationPoint[] {
  const keyframes = trackKeyframes(points)
  if (keyframes.length === 0) return []
  let nearestIndex = -1
  let nearestDistance = Number.POSITIVE_INFINITY
  keyframes.forEach((point, index) => {
    const distance = Math.abs(point.t - timeSec)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })
  return nearestIndex >= 0 && nearestDistance <= tolerance
    ? keyframes.filter((_, index) => index !== nearestIndex)
    : keyframes
}

/** Linear position between coach-confirmed keyframes. */
export function trackPositionAt(
  points: readonly FilmAnnotationPoint[],
  timeSec: number,
): FilmAnnotationPoint | undefined {
  const keyframes = trackKeyframes(points)
  if (keyframes.length === 0 || timeSec < keyframes[0].t) return undefined
  if (timeSec >= keyframes[keyframes.length - 1].t) return keyframes[keyframes.length - 1]

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const from = keyframes[index]
    const to = keyframes[index + 1]
    if (timeSec < from.t || timeSec > to.t) continue
    const duration = to.t - from.t
    if (duration <= 0) return to
    const progress = (timeSec - from.t) / duration
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      t: timeSec,
    }
  }
  return undefined
}

/** Confirmed path plus the interpolated current point for overlay drawing. */
export function trackTrailAt(
  points: readonly FilmAnnotationPoint[],
  timeSec: number,
): FilmAnnotationPoint[] {
  const keyframes = trackKeyframes(points)
  if (keyframes.length === 0 || timeSec < keyframes[0].t) return []
  const trail: FilmAnnotationPoint[] = keyframes.filter((point) => point.t <= timeSec)
  const current = trackPositionAt(keyframes, timeSec)
  const last = trail.at(-1)
  if (current && (!last || last.x !== current.x || last.y !== current.y)) trail.push(current)
  return trail
}

export function formatTrackTime(timeSec: number): string {
  const safe = Math.max(0, Number.isFinite(timeSec) ? timeSec : 0)
  const minutes = Math.floor(safe / 60)
  const seconds = safe - minutes * 60
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
}


export interface PlayerTrackStats {
  confirmedPoints: number
  autoFrames: number
  manualCorrections: number
  durationSec: number
  screenDistancePct: number
  averageConfidence: number
}

/** Live measurements that do not pretend screen pixels are calibrated yards. */
export function summarizePlayerTrack(points: readonly FilmAnnotationPoint[]): PlayerTrackStats {
  const keyframes = trackKeyframes(points)
  let distance = 0
  let confidenceTotal = 0
  let confidenceCount = 0
  let manualPoints = 0
  let autoFrames = 0
  for (let index = 0; index < keyframes.length; index += 1) {
    const point = keyframes[index]
    if (point.source === 'auto') autoFrames += 1
    if (point.source === 'manual') manualPoints += 1
    if (point.source === 'auto' && typeof point.confidence === 'number') {
      confidenceTotal += point.confidence
      confidenceCount += 1
    }
    if (index > 0) {
      const previous = keyframes[index - 1]
      distance += Math.hypot(point.x - previous.x, point.y - previous.y)
    }
  }
  return {
    confirmedPoints: keyframes.length,
    autoFrames,
    manualCorrections: Math.max(0, manualPoints - 1),
    durationSec: keyframes.length > 1 ? keyframes[keyframes.length - 1].t - keyframes[0].t : 0,
    screenDistancePct: distance * 100,
    averageConfidence: confidenceCount > 0 ? confidenceTotal / confidenceCount : 0,
  }
}
