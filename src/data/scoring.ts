// ---------------------------------------------------------------------------
// FAI SCORING CONFIG  —  EDIT THIS FILE TO CHANGE HOW SCORES ARE CALCULATED
// ---------------------------------------------------------------------------
// The Football Athlete Index (FAI) is a 0-100 score built from five weighted
// categories. Each category is the average of one or more normalized tests.
// Normalization is done per testing phase: within a phase the team BEST test
// result scores 100 and the team WORST scores 0, everyone else scales linearly.
// ---------------------------------------------------------------------------

import type { Category, TestSession } from '../types'

/** Category weights — must sum to 1.0 (100%). */
export const CATEGORY_WEIGHTS: Record<Category, number> = {
  Speed: 0.3, // 30%
  Power: 0.25, // 25%
  'Change of Direction': 0.2, // 20%
  Conditioning: 0.15, // 15%
  Strength: 0.1, // 10%
}

/**
 * When a testing phase has no spread for a metric (everyone tied, or only one
 * athlete tested), we can't scale between best and worst. This neutral score is
 * used instead. 50 = "average / undetermined".
 */
export const NEUTRAL_SCORE = 50

/** A metric that feeds the FAI score. */
export interface ScoredMetric {
  key: string
  label: string
  shortLabel: string
  category: Category
  /** true = higher raw value is better (jumps, reps, weight, yards). */
  higherBetter: boolean
  unit: string
  /** Which testing day the underlying inputs come from. */
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Optional'
  /** Extract the (possibly derived / best-of) raw value from a session. */
  value: (s: TestSession) => number | undefined
}

const min2 = (a?: number, b?: number): number | undefined => {
  const xs = [a, b].filter((x): x is number => typeof x === 'number' && x > 0)
  return xs.length ? Math.min(...xs) : undefined
}
const max2 = (a?: number, b?: number): number | undefined => {
  const xs = [a, b].filter((x): x is number => typeof x === 'number' && x > 0)
  return xs.length ? Math.max(...xs) : undefined
}

/**
 * All metrics that contribute to the FAI. Derived "best of" metrics (best 40,
 * best fly, best shuttle, best lateral shuttle) are computed here so the rest of
 * the app just reads `metric.value(session)`.
 */
export const SCORED_METRICS: ScoredMetric[] = [
  // --- Speed ---------------------------------------------------------------
  {
    key: 'best40',
    label: 'Best 40-Yard Dash',
    shortLabel: '40 Dash',
    category: 'Speed',
    higherBetter: false,
    unit: 's',
    day: 'Monday',
    value: (s) => min2(s.dash40_1, s.dash40_2),
  },
  {
    key: 'bestFly',
    label: 'Best 10-Yard Fly',
    shortLabel: '10 Fly',
    category: 'Speed',
    higherBetter: false,
    unit: 's',
    day: 'Monday',
    value: (s) => min2(s.fly10_1, s.fly10_2),
  },
  // --- Power ---------------------------------------------------------------
  {
    key: 'broadJump',
    label: 'Broad Jump',
    shortLabel: 'Broad',
    category: 'Power',
    higherBetter: true,
    unit: 'in',
    day: 'Wednesday',
    value: (s) => s.broadJump,
  },
  {
    key: 'verticalJump',
    label: 'Vertical Jump',
    shortLabel: 'Vertical',
    category: 'Power',
    higherBetter: true,
    unit: 'in',
    day: 'Wednesday',
    value: (s) => s.verticalJump,
  },
  {
    key: 'hangCleanReps',
    label: 'Hang Clean Reps (BW)',
    shortLabel: 'Hang Clean',
    category: 'Power',
    higherBetter: true,
    unit: 'reps',
    day: 'Tuesday',
    value: (s) => s.hangCleanReps,
  },
  // --- Change of Direction -------------------------------------------------
  {
    key: 'best20Shuttle',
    label: 'Best 20-Yard Shuttle',
    shortLabel: '20 Shuttle',
    category: 'Change of Direction',
    higherBetter: false,
    unit: 's',
    day: 'Tuesday',
    value: (s) => min2(s.shuttle20_1, s.shuttle20_2),
  },
  {
    key: 'bestLatShuttle',
    label: 'Best Lateral 10-Yard Shuttle',
    shortLabel: 'Lat Shuttle',
    category: 'Change of Direction',
    higherBetter: false,
    unit: 's',
    day: 'Tuesday',
    value: (s) => min2(s.latShuttle_1, s.latShuttle_2),
  },
  {
    key: 'illinois',
    label: 'Illinois Agility',
    shortLabel: 'Illinois',
    category: 'Change of Direction',
    higherBetter: false,
    unit: 's',
    day: 'Tuesday',
    value: (s) => s.illinois,
  },
  // --- Conditioning --------------------------------------------------------
  {
    key: 'cond51015',
    label: '5-10-15 Shuttle (30s yards)',
    shortLabel: '5-10-15',
    category: 'Conditioning',
    higherBetter: true,
    unit: 'yd',
    day: 'Optional',
    value: (s) => s.cond51015,
  },
  // --- Strength ------------------------------------------------------------
  {
    key: 'benchMax',
    label: 'Bench Max',
    shortLabel: 'Bench',
    category: 'Strength',
    higherBetter: true,
    unit: 'lbs',
    day: 'Monday',
    value: (s) => s.benchMax,
  },
  {
    key: 'squatMax',
    label: 'Squat Max',
    shortLabel: 'Squat',
    category: 'Strength',
    higherBetter: true,
    unit: 'lbs',
    day: 'Wednesday',
    value: (s) => s.squatMax,
  },
]

export const METRIC_BY_KEY: Record<string, ScoredMetric> = Object.fromEntries(
  SCORED_METRICS.map((m) => [m.key, m]),
)

/** Metrics grouped by category, in display order. */
export const METRICS_BY_CATEGORY = (category: Category): ScoredMetric[] =>
  SCORED_METRICS.filter((m) => m.category === category)

// Re-export best-of helpers so the "auto-calculated bests" can be reused.
export { min2 as bestTime, max2 as bestMark }
