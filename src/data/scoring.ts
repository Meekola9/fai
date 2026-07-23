// ---------------------------------------------------------------------------
// FAI SCORING CONFIG — stable, position-aware performance benchmarks
// ---------------------------------------------------------------------------

import type { Category, PositionGroup, TestSession } from '../types'
import { powerCleanMaxFor } from '../lib/powerClean'

/** Default FAI weighting for quarterbacks, hybrids, linemen, and specialists. */
export const CATEGORY_WEIGHTS: Record<Category, number> = {
  Speed: 0.15,
  Acceleration: 0.15,
  Jump: 0.08,
  Power: 0.17,
  Pursuit: 0.07,
  'Change of Direction': 0.13,
  Conditioning: 0.15,
  Strength: 0.1,
}

/**
 * RB, WR, DB, and ATH are speed-skill groups. Pure body-weight ratios can
 * over-reward very light athletes, so Strength counts half as much in their
 * overall FAI. The removed five percentage points move to Speed and
 * Acceleration, keeping the complete weight profile at 100%.
 */
export const SPEED_SKILL_CATEGORY_WEIGHTS: Record<Category, number> = {
  Speed: 0.18,
  Acceleration: 0.17,
  Jump: 0.08,
  Power: 0.17,
  Pursuit: 0.07,
  'Change of Direction': 0.13,
  Conditioning: 0.15,
  Strength: 0.05,
}

/**
 * Defensive linemen and linebackers receive a materially larger Pursuit
 * contribution. The added eight points come from Speed and Conditioning so
 * the full profile remains exactly 100%.
 */
export const FRONT_SEVEN_CATEGORY_WEIGHTS: Record<Category, number> = {
  Speed: 0.12,
  Acceleration: 0.15,
  Jump: 0.08,
  Power: 0.17,
  Pursuit: 0.15,
  'Change of Direction': 0.13,
  Conditioning: 0.1,
  Strength: 0.1,
}

const SPEED_SKILL_GROUPS: readonly PositionGroup[] = ['RB', 'WR', 'DB', 'ATH']
const FRONT_SEVEN_GROUPS: readonly PositionGroup[] = ['DL', 'LB']
const LATERAL_PRIORITY_GROUPS: readonly PositionGroup[] = ['OL', 'DB', 'RB']

export function isSpeedSkillGroup(group: PositionGroup): boolean {
  return SPEED_SKILL_GROUPS.includes(group)
}

export function categoryWeightsFor(group: PositionGroup): Record<Category, number> {
  if (FRONT_SEVEN_GROUPS.includes(group)) return FRONT_SEVEN_CATEGORY_WEIGHTS
  return isSpeedSkillGroup(group) ? SPEED_SKILL_CATEGORY_WEIGHTS : CATEGORY_WEIGHTS
}

/**
 * Metric-level weighting inside a category. Most categories and positions use
 * an even average. OL, DB, and RB place more COD emphasis on the lateral
 * shuttle because it better reflects side-to-side movement demands.
 */
export function metricWeightFor(metricKey: string, group: PositionGroup): number {
  if (metricKey === 'bestLatShuttle' && LATERAL_PRIORITY_GROUPS.includes(group)) return 0.65
  if (metricKey === 'best20Shuttle' && LATERAL_PRIORITY_GROUPS.includes(group)) return 0.35
  return 1
}

export const NEUTRAL_SCORE = 50

export interface ScoredMetric {
  key: string
  label: string
  shortLabel: string
  category: Category
  higherBetter: boolean
  unit: string
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Optional'
  required: boolean
  /** When set, the raw result is stored for everyone but graded only for these groups. */
  gradedGroups?: readonly PositionGroup[]
  value: (session: TestSession) => number | undefined
}

export interface Benchmark {
  /** Result that receives 100. */
  elite: number
  /** Result that receives 0. */
  developmental: number
  /** Optional result that receives a specified high score before the final elite band. */
  high?: number
  highScore?: number
}

type BenchmarkProfile = Record<string, Benchmark>

const min2 = (a?: number, b?: number): number | undefined => {
  const values = [a, b].filter((value): value is number => typeof value === 'number' && value > 0)
  return values.length ? Math.min(...values) : undefined
}

const ratio = (load?: number, bodyWeight?: number): number | undefined => {
  if (!load || !bodyWeight || load <= 0 || bodyWeight <= 0) return undefined
  return load / bodyWeight
}

const benchBenchmark = (developmental: number): Benchmark => ({
  developmental,
  high: 1.1,
  highScore: 90,
  elite: 1.4,
})

const squatBenchmark = (developmental: number): Benchmark => ({
  developmental,
  high: 2.15,
  highScore: 90,
  elite: 2.6,
})

/**
 * Power Clean is graded as an absolute max on position-specific standards.
 * Legacy body-weight hang-clean repetitions are first converted to an estimated
 * max, which prevents a very light athlete from receiving an inflated relative
 * power score solely because the original bar matched body weight.
 */
const SPEED_SKILL: BenchmarkProfile = {
  best40: { elite: 4.4, developmental: 5.25 },
  // Top speed is absolute, so the 10-yard fly is the pure Speed rating on one
  // universal scale for every position: 100 = 0.95s (~21.5 mph), 0 = 1.60s (~13 mph).
  bestFly: { elite: 0.95, developmental: 1.6 },
  broadJump: { elite: 124, developmental: 90 },
  verticalJump: { elite: 38, developmental: 20 },
  powerCleanMax: { elite: 275, developmental: 135 },
  best20Shuttle: { elite: 4.1, developmental: 5.1 },
  bestLatShuttle: { elite: 2.55, developmental: 3.35 },
  illinois: { elite: 15, developmental: 18.5 },
  cond51015: { elite: 175, developmental: 105 },
  benchRatio: benchBenchmark(0.55),
  squatRatio: squatBenchmark(1),
}

const QUARTERBACK: BenchmarkProfile = {
  best40: { elite: 4.55, developmental: 5.4 },
  bestFly: { elite: 0.95, developmental: 1.6 },
  broadJump: { elite: 120, developmental: 88 },
  verticalJump: { elite: 35, developmental: 18 },
  powerCleanMax: { elite: 285, developmental: 155 },
  best20Shuttle: { elite: 4.2, developmental: 5.2 },
  bestLatShuttle: { elite: 2.65, developmental: 3.45 },
  illinois: { elite: 15.4, developmental: 19 },
  cond51015: { elite: 165, developmental: 95 },
  benchRatio: benchBenchmark(0.5),
  squatRatio: squatBenchmark(0.9),
}

const HYBRID: BenchmarkProfile = {
  best40: { elite: 4.6, developmental: 5.55 },
  bestFly: { elite: 0.95, developmental: 1.6 },
  broadJump: { elite: 118, developmental: 84 },
  verticalJump: { elite: 34, developmental: 18 },
  powerCleanMax: { elite: 325, developmental: 175 },
  best20Shuttle: { elite: 4.25, developmental: 5.35 },
  bestLatShuttle: { elite: 2.7, developmental: 3.55 },
  illinois: { elite: 15.6, developmental: 19.5 },
  cond51015: { elite: 165, developmental: 90 },
  benchRatio: benchBenchmark(0.65),
  squatRatio: squatBenchmark(1.05),
}

const BIG: BenchmarkProfile = {
  best40: { elite: 4.95, developmental: 6.3 },
  best10: { elite: 1.7, developmental: 2.25 },
  bestFly: { elite: 0.95, developmental: 1.6 },
  broadJump: { elite: 110, developmental: 70 },
  verticalJump: { elite: 30, developmental: 12 },
  powerCleanMax: { elite: 385, developmental: 205 },
  best20Shuttle: { elite: 4.5, developmental: 6 },
  bestLatShuttle: { elite: 2.9, developmental: 4 },
  illinois: { elite: 16.5, developmental: 22 },
  cond51015: { elite: 145, developmental: 60 },
  benchRatio: benchBenchmark(0.7),
  squatRatio: squatBenchmark(1),
}

const SPECIALIST: BenchmarkProfile = {
  best40: { elite: 4.7, developmental: 5.7 },
  bestFly: { elite: 0.95, developmental: 1.6 },
  broadJump: { elite: 115, developmental: 80 },
  verticalJump: { elite: 32, developmental: 15 },
  powerCleanMax: { elite: 225, developmental: 95 },
  best20Shuttle: { elite: 4.35, developmental: 5.5 },
  bestLatShuttle: { elite: 2.75, developmental: 3.65 },
  illinois: { elite: 16, developmental: 20 },
  cond51015: { elite: 155, developmental: 80 },
  benchRatio: benchBenchmark(0.4),
  squatRatio: squatBenchmark(0.75),
}

const PROFILE_BY_GROUP: Record<PositionGroup, BenchmarkProfile> = {
  QB: QUARTERBACK,
  RB: SPEED_SKILL,
  WR: SPEED_SKILL,
  TE: HYBRID,
  OL: BIG,
  DL: BIG,
  LB: HYBRID,
  DB: SPEED_SKILL,
  'K/P': SPECIALIST,
  ATH: SPEED_SKILL,
}

/**
 * Top speed over the 10-yard fly, in miles per hour. The fly covers 30 feet
 * at full speed, so mph = (30 ft / seconds) converted from ft/s.
 */
export function flyTimeToMph(flySeconds: number): number {
  return (30 / flySeconds) * (3600 / 5280)
}

export const SCORED_METRICS: ScoredMetric[] = [
  {
    key: 'best40', label: 'Best 40-Yard Dash', shortLabel: '40 Dash', category: 'Acceleration',
    higherBetter: false, unit: 's', day: 'Monday', required: true,
    value: (session) => min2(session.dash40_1, session.dash40_2),
  },
  {
    key: 'best10', label: 'Best 10-Yard Dash', shortLabel: '10 Dash', category: 'Acceleration',
    higherBetter: false, unit: 's', day: 'Monday', required: false, gradedGroups: ['OL', 'DL'],
    value: (session) => min2(session.dash10_1, session.dash10_2),
  },
  {
    key: 'bestFly', label: 'Best 10-Yard Fly', shortLabel: '10 Fly', category: 'Speed',
    higherBetter: false, unit: 's', day: 'Monday', required: true,
    value: (session) => min2(session.fly10_1, session.fly10_2),
  },
  {
    key: 'broadJump', label: 'Broad Jump', shortLabel: 'Broad', category: 'Power',
    higherBetter: true, unit: 'in', day: 'Wednesday', required: true,
    value: (session) => session.broadJump,
  },
  {
    key: 'verticalJump', label: 'Vertical Jump', shortLabel: 'Vertical', category: 'Jump',
    higherBetter: true, unit: 'in', day: 'Wednesday', required: true,
    value: (session) => session.verticalJump,
  },
  {
    key: 'powerCleanMax', label: 'Power Clean Max', shortLabel: 'Power Clean', category: 'Power',
    higherBetter: true, unit: 'lb', day: 'Tuesday', required: true,
    value: powerCleanMaxFor,
  },
  {
    key: 'best20Shuttle', label: 'Best 20-Yard Shuttle', shortLabel: '20 Shuttle', category: 'Change of Direction',
    higherBetter: false, unit: 's', day: 'Tuesday', required: true,
    value: (session) => min2(session.shuttle20_1, session.shuttle20_2),
  },
  {
    key: 'bestLatShuttle', label: 'Best Lateral 10-Yard Shuttle', shortLabel: 'Lat Shuttle', category: 'Change of Direction',
    higherBetter: false, unit: 's', day: 'Tuesday', required: true,
    value: (session) => min2(session.latShuttle_1, session.latShuttle_2),
  },
  {
    key: 'illinois', label: 'Illinois Agility', shortLabel: 'Illinois', category: 'Pursuit',
    higherBetter: false, unit: 's', day: 'Tuesday', required: true,
    value: (session) => session.illinois,
  },
  {
    key: 'cond51015', label: '5-10-15 Shuttle (30s yards)', shortLabel: '5-10-15', category: 'Conditioning',
    higherBetter: true, unit: 'yd', day: 'Optional', required: false,
    value: (session) => session.cond51015,
  },
  {
    key: 'benchRatio', label: 'Bench / Body Weight', shortLabel: 'Bench/BW', category: 'Strength',
    higherBetter: true, unit: 'x', day: 'Monday', required: true,
    value: (session) => ratio(session.benchMax, session.weightLbsSnapshot),
  },
  {
    key: 'squatRatio', label: 'Squat / Body Weight', shortLabel: 'Squat/BW', category: 'Strength',
    higherBetter: true, unit: 'x', day: 'Wednesday', required: true,
    value: (session) => ratio(session.squatMax, session.weightLbsSnapshot),
  },
]

export const REQUIRED_METRICS = SCORED_METRICS.filter((metric) => metric.required)
export const METRIC_BY_KEY: Record<string, ScoredMetric> = Object.fromEntries(
  SCORED_METRICS.map((metric) => [metric.key, metric]),
)
export const METRICS_BY_CATEGORY = (category: Category): ScoredMetric[] =>
  SCORED_METRICS.filter((metric) => metric.category === category)

export function benchmarkFor(metricKey: string, group: PositionGroup): Benchmark {
  return PROFILE_BY_GROUP[group]?.[metricKey] ?? SPEED_SKILL[metricKey]
}

export function benchmarkScore(value: number, benchmark: Benchmark, higherBetter: boolean): number {
  if (benchmark.elite === benchmark.developmental) return NEUTRAL_SCORE

  if (
    higherBetter
    && typeof benchmark.high === 'number'
    && typeof benchmark.highScore === 'number'
    && benchmark.high > benchmark.developmental
    && benchmark.elite > benchmark.high
  ) {
    const score = value <= benchmark.high
      ? ((value - benchmark.developmental) / (benchmark.high - benchmark.developmental)) * benchmark.highScore
      : benchmark.highScore
        + ((value - benchmark.high) / (benchmark.elite - benchmark.high)) * (100 - benchmark.highScore)
    return Math.max(0, Math.min(100, score))
  }

  const progress = higherBetter
    ? (value - benchmark.developmental) / (benchmark.elite - benchmark.developmental)
    : (benchmark.developmental - value) / (benchmark.developmental - benchmark.elite)
  return Math.max(0, Math.min(100, progress * 100))
}

export function metricAppliesTo(metric: ScoredMetric, session: TestSession): boolean {
  if (!metric.gradedGroups?.length) return true
  const group = session.positionGroupSnapshot ?? 'ATH'
  return metric.gradedGroups.includes(group)
}

export function scoreMetric(metric: ScoredMetric, session: TestSession): number | undefined {
  if (!metricAppliesTo(metric, session)) return undefined
  const raw = metric.value(session)
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return undefined
  const group = session.positionGroupSnapshot ?? 'ATH'
  return benchmarkScore(raw, benchmarkFor(metric.key, group), metric.higherBetter)
}

export { min2 as bestTime }
