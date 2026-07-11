// ---------------------------------------------------------------------------
// Core computation: normalize raw tests -> 0-100 -> category scores -> FAI.
// Rankings and phase grouping also live here.
// ---------------------------------------------------------------------------

import type {
  AppData,
  Athlete,
  CategoryScores,
  ComputedSession,
  Category,
  TestSession,
} from '../types'
import {
  CATEGORY_WEIGHTS,
  NEUTRAL_SCORE,
  SCORED_METRICS,
  METRICS_BY_CATEGORY,
} from '../data/scoring'
import { CATEGORIES } from '../data/constants'

/** Linear scale a raw value into 0-100 given the phase best/worst spread. */
export function normalize(
  value: number,
  best: number,
  worst: number,
  higherBetter: boolean,
): number {
  if (best === worst) return NEUTRAL_SCORE
  // "best" is the top performance regardless of direction.
  const hi = higherBetter ? best : worst // numeric max
  const lo = higherBetter ? worst : best // numeric min
  const pct = ((value - lo) / (hi - lo)) * 100
  const scaled = higherBetter ? pct : 100 - pct
  return clamp(scaled, 0, 100)
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

interface MetricRange {
  best: number // top performance value (fastest time / biggest mark)
  worst: number // bottom performance value
}

/** For one phase, compute best/worst raw value for every scored metric. */
function metricRangesForPhase(sessions: TestSession[]): Record<string, MetricRange> {
  const ranges: Record<string, MetricRange> = {}
  for (const metric of SCORED_METRICS) {
    const values = sessions
      .map((s) => metric.value(s))
      .filter((v): v is number => typeof v === 'number' && v > 0)
    if (!values.length) continue
    const numMax = Math.max(...values)
    const numMin = Math.min(...values)
    ranges[metric.key] = metric.higherBetter
      ? { best: numMax, worst: numMin }
      : { best: numMin, worst: numMax }
  }
  return ranges
}

function emptyCategories(): CategoryScores {
  return {
    Speed: 0,
    Power: 0,
    'Change of Direction': 0,
    Conditioning: 0,
    Strength: 0,
  }
}

/**
 * Compute a full ComputedSession for one session using the pre-computed phase
 * ranges. Missing categories are handled by redistributing their weight across
 * the categories the athlete actually has data for.
 */
export function computeSession(
  session: TestSession,
  athlete: Athlete,
  ranges: Record<string, MetricRange>,
): ComputedSession {
  const metrics: Record<string, number | undefined> = {}
  const normalized: Record<string, number | undefined> = {}

  for (const metric of SCORED_METRICS) {
    const raw = metric.value(session)
    metrics[metric.key] = raw
    if (typeof raw === 'number' && raw > 0 && ranges[metric.key]) {
      const { best, worst } = ranges[metric.key]
      normalized[metric.key] = round1(
        normalize(raw, best, worst, metric.higherBetter),
      )
    }
  }

  const categories = emptyCategories()
  const catHasData: Record<Category, boolean> = {
    Speed: false,
    Power: false,
    'Change of Direction': false,
    Conditioning: false,
    Strength: false,
  }

  for (const category of CATEGORIES) {
    const catMetrics = METRICS_BY_CATEGORY(category)
    const scores = catMetrics
      .map((m) => normalized[m.key])
      .filter((v): v is number => typeof v === 'number')
    if (scores.length) {
      categories[category] = round1(avg(scores))
      catHasData[category] = true
    }
  }

  // Weighted FAI, renormalizing weights over categories that have data.
  let weightSum = 0
  let faiAccum = 0
  for (const category of CATEGORIES) {
    if (catHasData[category]) {
      weightSum += CATEGORY_WEIGHTS[category]
      faiAccum += categories[category] * CATEGORY_WEIGHTS[category]
    }
  }
  const fai = weightSum > 0 ? round1(faiAccum / weightSum) : 0

  return { session, athlete, metrics, normalized, categories, fai }
}

/**
 * Compute every session in the dataset, normalized within its own phase.
 * Returns a flat list of ComputedSession.
 */
export function computeAll(data: AppData): ComputedSession[] {
  const athleteById = new Map(data.athletes.map((a) => [a.id, a]))

  // group sessions by phase for normalization
  const byPhase = new Map<string, TestSession[]>()
  for (const s of data.sessions) {
    const arr = byPhase.get(s.phase) ?? []
    arr.push(s)
    byPhase.set(s.phase, arr)
  }

  const rangesByPhase = new Map<string, Record<string, MetricRange>>()
  for (const [phase, sessions] of byPhase) {
    rangesByPhase.set(phase, metricRangesForPhase(sessions))
  }

  const out: ComputedSession[] = []
  for (const s of data.sessions) {
    const athlete = athleteById.get(s.athleteId)
    if (!athlete) continue
    out.push(computeSession(s, athlete, rangesByPhase.get(s.phase)!))
  }
  return out
}

/** All computed sessions for one athlete, sorted oldest -> newest by date. */
export function athleteTimeline(
  computed: ComputedSession[],
  athleteId: string,
): ComputedSession[] {
  return computed
    .filter((c) => c.session.athleteId === athleteId)
    .sort((a, b) => a.session.date.localeCompare(b.session.date))
}

// --- tiny math helpers ---------------------------------------------------
export function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}
export function round1(n: number): number {
  return Math.round(n * 10) / 10
}
