// ---------------------------------------------------------------------------
// Core computation: merge event sessions -> benchmark scores -> categories -> FAI
// ---------------------------------------------------------------------------

import type {
  AppData,
  Athlete,
  CategoryScores,
  ComputedSession,
  PositionGroup,
  TestSession,
  TestingEvent,
} from '../types'
import {
  categoryWeightsFor,
  METRICS_BY_CATEGORY,
  metricWeightFor,
  NEUTRAL_SCORE,
  REQUIRED_METRICS,
  SCORED_METRICS,
  scoreMetric,
} from '../data/scoring'
import { CATEGORIES } from '../data/constants'
import { mergeEventSessions } from './events'
import { verticalFaiScore } from './verticalBenchmarks'
import { illinoisAgilityScore } from './illinoisAgility'
import { playerUsageDefinition } from './playerUsage'

export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

interface LinemanSizeProfile {
  floor: number
  targetMin: number
  targetMax: number
  taperEnd: number
  maxBonus: number
}

const LINEMAN_SIZE_PROFILES: Partial<Record<PositionGroup, LinemanSizeProfile>> = {
  OL: { floor: 255, targetMin: 285, targetMax: 340, taperEnd: 375, maxBonus: 8 },
  DL: { floor: 235, targetMin: 260, targetMax: 325, taperEnd: 360, maxBonus: 8 },
}

/**
 * Rewards legitimate line size without allowing body weight to hide poor movement.
 * The bonus reaches full size credit inside the position's target range, tapers for
 * extreme outliers, and is gated by the athlete's underlying athletic score.
 */
export function linemanSizeBonus(
  rawFai: number,
  weightLbs: number | undefined,
  positionGroup: PositionGroup,
): number {
  const profile = LINEMAN_SIZE_PROFILES[positionGroup]
  if (!profile || typeof weightLbs !== 'number' || !Number.isFinite(weightLbs)) return 0

  const sizeCredit = weightLbs < profile.targetMin
    ? clamp((weightLbs - profile.floor) / (profile.targetMin - profile.floor), 0, 1)
    : weightLbs <= profile.targetMax
      ? 1
      : clamp((profile.taperEnd - weightLbs) / (profile.taperEnd - profile.targetMax), 0, 1)

  // No meaningful boost below 35 FAI; full access to the bonus at 70+.
  const movementGate = clamp((rawFai - 35) / 35, 0, 1)
  return round1(profile.maxBonus * sizeCredit * movementGate)
}

function emptyCategories(): CategoryScores {
  // A category with no usable test result is neutral—not zero and not omitted.
  // Raw metrics remain undefined, so completion and missing-test UI stay honest.
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, NEUTRAL_SCORE]),
  ) as CategoryScores
}

function computeForGroup(
  session: TestSession,
  athlete: Athlete,
  event: TestingEvent,
  positionGroup: PositionGroup,
): ComputedSession {
  const metrics: Record<string, number | undefined> = {}
  const normalized: Record<string, number | undefined> = {}
  const scoringSession: TestSession = { ...session, positionGroupSnapshot: positionGroup }

  for (const metric of SCORED_METRICS) {
    const raw = metric.value(scoringSession)
    metrics[metric.key] = raw
    const score = metric.key === 'verticalJump' && typeof raw === 'number'
      ? verticalFaiScore(raw, positionGroup)
      : metric.key === 'illinois' && typeof raw === 'number'
        ? illinoisAgilityScore(raw)
        : scoreMetric(metric, scoringSession)
    normalized[metric.key] = typeof score === 'number' ? round1(score) : undefined
  }

  const categories = emptyCategories()
  for (const category of CATEGORIES) {
    const scoredMetrics = METRICS_BY_CATEGORY(category)
      .map((metric) => ({
        score: normalized[metric.key],
        weight: metricWeightFor(metric.key, positionGroup),
      }))
      .filter((item): item is { score: number; weight: number } => typeof item.score === 'number')

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
  let weighted = 0
  for (const category of CATEGORIES) {
    weighted += categories[category] * categoryWeights[category]
  }

  const rawFai = round1(clamp(weighted, 0, 100))
  const weightLbs = session.weightLbsSnapshot ?? athlete.weightLbs
  const sizeAdjustment = linemanSizeBonus(rawFai, weightLbs, positionGroup)
  const fai = round1(clamp(rawFai + sizeAdjustment, 0, 100))

  // Keep both values available to UI/reporting without changing stored session data.
  metrics.rawFai = rawFai
  metrics.sizeAdjustment = sizeAdjustment

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

/** Recompute one testing card against an explicit position group's benchmarks. */
export function computeSessionForPositionGroup(
  session: TestSession,
  athlete: Athlete,
  event: TestingEvent,
  positionGroup: PositionGroup,
): ComputedSession {
  return computeForGroup(session, athlete, event, positionGroup)
}

export interface PositionScoreBreakdown {
  primaryGroup: PositionGroup
  primaryScore: number
  secondaryGroup?: PositionGroup
  secondaryScore?: number
  primaryPct: number
  secondaryPct: number
  blendedScore: number
}

export function positionScoreBreakdown(
  session: TestSession,
  athlete: Athlete,
  event: TestingEvent,
): PositionScoreBreakdown {
  const primaryGroup = session.positionGroupSnapshot ?? athlete.positionGroup
  const primary = computeForGroup(session, athlete, event, primaryGroup)
  const usage = playerUsageDefinition(athlete.usage)
  const secondaryGroup = athlete.secondaryPositionGroup

  if (!secondaryGroup || usage.secondaryPct === 0) {
    return {
      primaryGroup,
      primaryScore: primary.fai,
      primaryPct: 100,
      secondaryPct: 0,
      blendedScore: primary.fai,
    }
  }

  const secondary = computeForGroup(session, athlete, event, secondaryGroup)
  const blendedScore = round1(
    primary.fai * (usage.primaryPct / 100)
    + secondary.fai * (usage.secondaryPct / 100),
  )

  return {
    primaryGroup,
    primaryScore: primary.fai,
    secondaryGroup,
    secondaryScore: secondary.fai,
    primaryPct: usage.primaryPct,
    secondaryPct: usage.secondaryPct,
    blendedScore,
  }
}

export function computeSession(
  session: TestSession,
  athlete: Athlete,
  event: TestingEvent,
): ComputedSession {
  const primaryGroup = session.positionGroupSnapshot ?? athlete.positionGroup
  const primary = computeForGroup(session, athlete, event, primaryGroup)
  const breakdown = positionScoreBreakdown(session, athlete, event)
  return breakdown.secondaryGroup
    ? { ...primary, fai: breakdown.blendedScore }
    : primary
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
