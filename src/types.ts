// ---------------------------------------------------------------------------
// FAI — Football Athlete Index :: core domain types
// ---------------------------------------------------------------------------

export type PositionGroup =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'OL'
  | 'DL'
  | 'LB'
  | 'DB'
  | 'K/P'

export type TestingPhase =
  | 'Baseline'
  | 'Midpoint'
  | 'Final'
  | 'Offseason'
  | 'Summer'
  | 'Preseason'

export type Category =
  | 'Speed'
  | 'Power'
  | 'Change of Direction'
  | 'Conditioning'
  | 'Strength'

/** A single athlete on the roster (identity / bio info that rarely changes). */
export interface Athlete {
  id: string
  name: string
  grade: number // 9-12
  position: string // specific position label, e.g. "Slot WR"
  positionGroup: PositionGroup
  heightIn: number // total inches
  weightLbs: number
  photoUrl?: string
}

/**
 * A single testing session for one athlete. Every metric is optional because a
 * coach may only run part of the battery on a given day (Mon/Tue/Wed split).
 * Sessions are NEVER overwritten — each testing date is stored separately.
 */
export interface TestSession {
  id: string
  athleteId: string
  date: string // ISO yyyy-mm-dd
  phase: TestingPhase

  // Monday — Speed + Bench
  benchMax?: number // lbs
  dash40_1?: number // seconds
  dash40_2?: number
  fly10_1?: number // 10-yard fly, seconds
  fly10_2?: number

  // Tuesday — Power Endurance + Change of Direction
  hangCleanReps?: number // reps at bodyweight
  shuttle20_1?: number // 20-yard pro-agility shuttle, seconds
  shuttle20_2?: number
  latShuttle_1?: number // lateral 10-yard shuttle, seconds
  latShuttle_2?: number
  illinois?: number // Illinois agility test, seconds

  // Wednesday — Lower Body + Jumps
  squatMax?: number // lbs
  broadJump?: number // inches
  verticalJump?: number // inches

  // Optional conditioning
  cond51015?: number // 30-second 5-10-15 shuttle total yards
}

/** Everything the app persists. */
export interface AppData {
  athletes: Athlete[]
  sessions: TestSession[]
}

// --- Derived / computed shapes -------------------------------------------

export interface CategoryScores {
  Speed: number
  Power: number
  'Change of Direction': number
  Conditioning: number
  Strength: number
}

/** A fully computed session: raw values + normalized scores + FAI. */
export interface ComputedSession {
  session: TestSession
  athlete: Athlete
  /** best-of / derived raw values keyed by scored-metric key */
  metrics: Record<string, number | undefined>
  /** normalized 0-100 score per scored metric (relative to the phase field) */
  normalized: Record<string, number | undefined>
  categories: CategoryScores
  fai: number
}

/** An athlete's latest computed result plus progress vs. previous session. */
export interface AthleteResult {
  athlete: Athlete
  current: ComputedSession
  previous?: ComputedSession
  faiImprovement: number // current - previous FAI (0 if no previous)
  faiImprovementPct: number
  teamRank: number
  teamCount: number
  groupRank: number
  groupCount: number
}
