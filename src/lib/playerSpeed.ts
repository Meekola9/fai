import type { FilmAnnotationPoint } from '../types'
import { trackKeyframes } from './filmTracking'

/** 1 yard/sec expressed in miles per hour (3600 s/hr ÷ 1760 yd/mi). */
export const YARDS_PER_SEC_TO_MPH = 3600 / 1760

/**
 * Window over which top speed is measured. Peak speed is the fastest straight-line
 * displacement across ~0.3s, so a single jumpy CV frame can't fake a 40 mph burst.
 */
const TOP_SPEED_WINDOW_SEC = 0.3

/**
 * Above this is physically implausible for a high-school player (~28.6 mph), so a
 * segment faster than this is treated as tracking noise and left out of top speed.
 * If real speeds keep pinning here, the homography scale is off — that's a signal,
 * not a number to trust.
 */
const MAX_PLAUSIBLE_YPS = 14

export interface TrackSpeedSummary {
  /** True when at least two keyframes carry homography field coordinates. */
  hasField: boolean
  /** Field-tracked keyframes used in the calculation. */
  sampleCount: number
  /** Total path length in yards. */
  distanceYards: number
  /** Seconds between the first and last field-tracked keyframe. */
  elapsedSec: number
  /** Average speed over the whole track, mph. */
  avgSpeedMph: number
  /** Peak speed over a short window, mph (jitter-capped). */
  topSpeedMph: number
}

const EMPTY: TrackSpeedSummary = {
  hasField: false,
  sampleCount: 0,
  distanceYards: 0,
  elapsedSec: 0,
  avgSpeedMph: 0,
  topSpeedMph: 0,
}

interface FieldSample {
  t: number
  fx: number
  fy: number
}

function fieldSamples(points: readonly FilmAnnotationPoint[]): FieldSample[] {
  const samples: FieldSample[] = []
  for (const point of trackKeyframes(points)) {
    const field = point.field
    if (Array.isArray(field) && Number.isFinite(field[0]) && Number.isFinite(field[1])) {
      samples.push({ t: point.t, fx: field[0], fy: field[1] })
    }
  }
  return samples
}

function round(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * Speed metrics for one player track, in real yards, from the CV field map. Returns
 * an all-zero, `hasField: false` summary when the track has no homography coordinates —
 * we never estimate speed from screen pixels, because perspective makes that a lie.
 */
export function summarizeTrackSpeed(points: readonly FilmAnnotationPoint[]): TrackSpeedSummary {
  const samples = fieldSamples(points)
  if (samples.length < 2) return EMPTY

  let distance = 0
  for (let i = 1; i < samples.length; i += 1) {
    distance += Math.hypot(samples[i].fx - samples[i - 1].fx, samples[i].fy - samples[i - 1].fy)
  }
  const elapsed = samples[samples.length - 1].t - samples[0].t
  const avgYps = elapsed > 0 ? distance / elapsed : 0

  // Top speed: the fastest straight-line displacement across a ~0.3s window. Using
  // window endpoints (not adjacent frames) means an intermediate spurious point
  // doesn't inflate the reading, and short dt noise is smoothed out.
  let topYps = 0
  let start = 0
  for (let end = 1; end < samples.length; end += 1) {
    while (start < end - 1 && samples[end].t - samples[start + 1].t >= TOP_SPEED_WINDOW_SEC) {
      start += 1
    }
    const dt = samples[end].t - samples[start].t
    if (dt <= 0) continue
    const displacement = Math.hypot(samples[end].fx - samples[start].fx, samples[end].fy - samples[start].fy)
    const yps = displacement / dt
    if (yps <= MAX_PLAUSIBLE_YPS && yps > topYps) topYps = yps
  }
  // Degenerate tracks (everything above the cap) fall back to the capped average.
  if (topYps === 0) topYps = Math.min(avgYps, MAX_PLAUSIBLE_YPS)

  return {
    hasField: true,
    sampleCount: samples.length,
    distanceYards: round(distance, 1),
    elapsedSec: round(elapsed, 2),
    avgSpeedMph: round(avgYps * YARDS_PER_SEC_TO_MPH, 1),
    topSpeedMph: round(topYps * YARDS_PER_SEC_TO_MPH, 1),
  }
}
