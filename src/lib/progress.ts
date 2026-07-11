// ---------------------------------------------------------------------------
// Progress tracking, rankings, and per-test / per-category improvement.
// ---------------------------------------------------------------------------

import type {
  AthleteResult,
  Category,
  ComputedSession,
} from '../types'
import { SCORED_METRICS } from '../data/scoring'
import { CATEGORIES } from '../data/constants'
import { athleteTimeline, round1 } from './compute'

export type Trend = 'improved' | 'same' | 'regressed'

export interface MetricProgress {
  key: string
  label: string
  category: Category
  unit: string
  higherBetter: boolean
  previousRaw?: number
  currentRaw?: number
  /** Signed raw improvement (positive = better, respecting direction). */
  rawImprovement?: number
  previousScore?: number
  currentScore?: number
  /** Signed normalized-score improvement (positive = better). */
  scoreImprovement?: number
  trend: Trend
}

export interface CategoryProgress {
  category: Category
  previous?: number
  current?: number
  improvement: number
  trend: Trend
}

export interface AthleteProgress {
  metrics: MetricProgress[]
  categories: CategoryProgress[]
  biggestImprovement?: MetricProgress
  biggestWeakness?: CategoryProgress // lowest current category score
  suggestedFocus?: Category
}

const EPS = 0.05

function trendFrom(improvement: number | undefined, eps = EPS): Trend {
  if (improvement === undefined) return 'same'
  if (improvement > eps) return 'improved'
  if (improvement < -eps) return 'regressed'
  return 'same'
}

/**
 * Improvement between a previous and current computed session.
 *  - timed tests (higherBetter=false): improvement = previous - current
 *  - mark tests (higherBetter=true):   improvement = current - previous
 */
export function computeProgress(
  current: ComputedSession,
  previous?: ComputedSession,
): AthleteProgress {
  const metrics: MetricProgress[] = SCORED_METRICS.map((m) => {
    const currentRaw = current.metrics[m.key]
    const previousRaw = previous?.metrics[m.key]
    const currentScore = current.normalized[m.key]
    const previousScore = previous?.normalized[m.key]

    let rawImprovement: number | undefined
    if (typeof currentRaw === 'number' && typeof previousRaw === 'number') {
      rawImprovement = m.higherBetter
        ? currentRaw - previousRaw
        : previousRaw - currentRaw
      rawImprovement = round1000(rawImprovement)
    }
    let scoreImprovement: number | undefined
    if (typeof currentScore === 'number' && typeof previousScore === 'number') {
      scoreImprovement = round1(currentScore - previousScore)
    }

    return {
      key: m.key,
      label: m.label,
      category: m.category,
      unit: m.unit,
      higherBetter: m.higherBetter,
      previousRaw,
      currentRaw,
      rawImprovement,
      previousScore,
      currentScore,
      scoreImprovement,
      // Improved/regressed is defined by the RAW result (per spec), not by the
      // team-relative normalized score — so a faster 40 always reads as improved
      // even if the rest of the field improved more.
      trend: trendFrom(rawImprovement, 0),
    }
  })

  const categories: CategoryProgress[] = CATEGORIES.map((category) => {
    const cur = current.categories[category] || undefined
    const prev = previous?.categories[category] || undefined
    const improvement =
      typeof cur === 'number' && typeof prev === 'number'
        ? round1(cur - prev)
        : 0
    return {
      category,
      previous: prev,
      current: cur,
      improvement,
      trend: trendFrom(improvement),
    }
  })

  // Biggest improvement: metric with the largest positive score gain.
  const improvingMetrics = metrics.filter(
    (m) => typeof m.scoreImprovement === 'number',
  )
  const biggestImprovement = improvingMetrics.length
    ? improvingMetrics.reduce((best, m) =>
        (m.scoreImprovement ?? -Infinity) > (best.scoreImprovement ?? -Infinity)
          ? m
          : best,
      )
    : undefined

  // Biggest weakness / suggested focus: lowest current category score.
  const scoredCats = categories.filter((c) => typeof c.current === 'number')
  const biggestWeakness = scoredCats.length
    ? scoredCats.reduce((worst, c) =>
        (c.current ?? Infinity) < (worst.current ?? Infinity) ? c : worst,
      )
    : undefined

  return {
    metrics,
    categories,
    biggestImprovement:
      biggestImprovement && (biggestImprovement.scoreImprovement ?? 0) > 0
        ? biggestImprovement
        : undefined,
    biggestWeakness,
    suggestedFocus: biggestWeakness?.category,
  }
}

/** Strengths: categories at/above threshold, sorted high->low. */
export function strengths(current: ComputedSession, threshold = 60): Category[] {
  return CATEGORIES.filter((c) => (current.categories[c] || 0) >= threshold).sort(
    (a, b) => current.categories[b] - current.categories[a],
  )
}

/** Weaknesses: categories below threshold, sorted low->high. */
export function weaknesses(current: ComputedSession, threshold = 45): Category[] {
  return CATEGORIES.filter(
    (c) => (current.categories[c] || 0) > 0 && current.categories[c] < threshold,
  ).sort((a, b) => current.categories[a] - current.categories[b])
}

/**
 * Build one AthleteResult per athlete (latest session + previous + rankings).
 * Rankings are computed on the latest session's FAI, team-wide and by group.
 */
export function buildResults(computed: ComputedSession[]): AthleteResult[] {
  const byAthlete = new Map<string, ComputedSession[]>()
  for (const c of computed) {
    const arr = byAthlete.get(c.session.athleteId) ?? []
    arr.push(c)
    byAthlete.set(c.session.athleteId, arr)
  }

  const results: AthleteResult[] = []
  for (const [athleteId] of byAthlete) {
    const timeline = athleteTimeline(computed, athleteId)
    if (!timeline.length) continue
    const current = timeline[timeline.length - 1]
    const previous = timeline.length > 1 ? timeline[timeline.length - 2] : undefined
    const faiImprovement = previous ? round1(current.fai - previous.fai) : 0
    const faiImprovementPct =
      previous && previous.fai > 0
        ? round1((faiImprovement / previous.fai) * 100)
        : 0
    results.push({
      athlete: current.athlete,
      current,
      previous,
      faiImprovement,
      faiImprovementPct,
      teamRank: 0,
      teamCount: 0,
      groupRank: 0,
      groupCount: 0,
    })
  }

  // Team ranks (desc by FAI).
  const sorted = [...results].sort((a, b) => b.current.fai - a.current.fai)
  sorted.forEach((r, i) => {
    r.teamRank = i + 1
    r.teamCount = sorted.length
  })

  // Position-group ranks.
  const groups = new Map<string, AthleteResult[]>()
  for (const r of results) {
    const g = r.athlete.positionGroup
    const arr = groups.get(g) ?? []
    arr.push(r)
    groups.set(g, arr)
  }
  for (const [, arr] of groups) {
    arr.sort((a, b) => b.current.fai - a.current.fai)
    arr.forEach((r, i) => {
      r.groupRank = i + 1
      r.groupCount = arr.length
    })
  }

  return sorted
}

function round1000(n: number): number {
  return Math.round(n * 1000) / 1000
}
