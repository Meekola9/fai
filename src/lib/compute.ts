// ---------------------------------------------------------------------------
// Core computation: merge event sessions -> benchmark scores -> categories -> FAI
// ---------------------------------------------------------------------------

import type {
  AppData,
  Athlete,
  Category,
  CategoryScores,
  ComputedSession,
  TestSession,
  TestingEvent,
} from '../types'
import {
  categoryWeightsFor,
  METRICS_BY_CATEGORY,
  metricWeightFor,
  REQUIRED_METRICS,
  SCORED_METRICS,
  scoreMetric,
} from '../data/scoring'
import { CATEGORIES } from '../data/constants'
import { mergeEventSessions } from './events'

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

function emptyCategories(): CategoryScores {
  return Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as CategoryScores
}

export function computeSession(
  session: TestSession,
  athlete: Athlete,
  event: TestingEvent,
): ComputedSession {
  const metrics: Record<string, number | undefined> = {}
  const normalized: Record<string, number | undefined> = {}

  for (const metric of SCORED_METRICS) {
    const raw = metric.value(session)
    metrics[metric.key] = raw
    const score = scoreMetric(metric, session)
    normalized[metric.key] = typeof score === 'number' ? round1(score) : undefined
  }

  const positionGroup = session.positionGroupSnapshot ?? athlete.positionGroup
  const categories = emptyCategories()
  const categoryHasData = new Map<Category, boolean>()
  for (const category of CATEGORIES) {
    const scoredMetrics = METRICS_BY_CATEGORY(category)
      .map((metric) => ({
        score: normalized[metric.key],
        weight: metricWeightFor(metric.key, positionGroup),
      }))
      .filter((item): item is { score: number; weight: number } => typeof item.score === 'number')

    categoryHasData.set(category, scoredMetrics.length > 0)
    if (scoredMetrics.length > 0) {
      const weightedTotal = scoredMetrics.reduce((sum, item) => sum + item.score * item.weight, 0)
      const weightTotal = scoredMetrics.reduce((sum, item) => sum + item.weight, 0)
      categories[category] = round1(weightTotal > 0 ? weightedTotal / weightTotal : 0)
    }
  }

  const requiredPresent = REQUIRED_METRICS.filter(
    (metric) => typeof metrics[metric.key] === 'number',
  ).length
  const completionPct = round1((requiredPresent / REQUIRED_METRICS.length) * 100)
  const scoreStatus =
    completionPct >= 100 ? 'complete' : completionPct >= 60 ? 'provisional' : 'insufficient'

  const categoryWeights = categoryWeightsFor(positionGroup)

  // Conditioning is optional. When absent, remove only its position-specific
  // weight from the denominator. Missing required categories keep their weight
  // and therefore lower the provisional FAI.
  const conditioningPresent = categoryHasData.get('Conditioning') === true
  const denominator = conditioningPresent ? 1 : 1 - categoryWeights.Conditioning
  let weighted = 0
  for (const category of CATEGORIES) {
    if (category === 'Conditioning' && !conditioningPresent) continue
    weighted += categories[category] * categoryWeights[category]
  }
  const fai = denominator > 0 ? round1(clamp(weighted / denominator, 0, 100)) : 0

  return {
    session,
    athlete,
    event,
    metrics,
    normalized,
    categories,
    fai,
    completionPct,
    scoreStatus,
  }
}

/** One computed result per athlete per testing event. */
export function computeAll(data: AppData): ComputedSession[] {
  return mergeEventSessions(data).map(({ athlete, event, session }) =>
    computeSession(session, athlete, event),
  )
}

export function athleteTimeline(
  computed: ComputedSession[],
  athleteId: string,
): ComputedSession[] {
  return computed
    .filter((result) => result.session.athleteId === athleteId)
    .sort((a, b) =>
      `${a.event.startDate}|${a.session.date}|${a.session.createdAt ?? ''}`.localeCompare(
        `${b.event.startDate}|${b.session.date}|${b.session.createdAt ?? ''}`,
      ),
    )
}

export function eventResults(
  computed: ComputedSession[],
  eventId: string,
): ComputedSession[] {
  return computed.filter((result) => result.event.id === eventId)
}

export function avg(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10
}
