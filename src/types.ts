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
  | 'ATH'

/** Coach-entered roster deployment, separate from combine scoring. */
export type PlayerUsage = 'one-way' | 'two-way' | 'iron-man'

export type TestingPhase =
  | 'Baseline'
  | 'Midpoint'
  | 'Final'
  | 'Offseason'
  | 'Summer'
  | 'Preseason'

export type Category =
  | 'Speed'
  | 'Acceleration'
  | 'Jump'
  | 'Power'
  | 'Pursuit'
  | 'Change of Direction'
  | 'Conditioning'
  | 'Strength'

export type ScoreStatus = 'complete' | 'provisional' | 'insufficient'

/** A single athlete on the roster (identity / current bio information). */
export interface Athlete {
  id: string
  name: string
  grade: number // 9-12
  /** Primary football position. This position group controls FAI benchmarking. */
  position: string
  positionGroup: PositionGroup
  /** One-way, regular two-way, or near-full-time Iron Man deployment. */
  usage?: PlayerUsage
  /** Optional second role for two-way and Iron Man players. */
  secondaryPosition?: string
  secondaryPositionGroup?: PositionGroup
  heightIn: number
  weightLbs: number
  photoUrl?: string
  /** Hudl (or other) film link shown on the athlete profile. */
  hudlUrl?: string
}

/** Parent record for one combine or testing window. */
export interface TestingEvent {
  id: string
  name: string
  phase: TestingPhase
  startDate: string // ISO yyyy-mm-dd
  endDate?: string
  status?: 'open' | 'closed'
  createdAt?: string
}

/**
 * One data-entry record within a testing event. Partial records from the same
 * event are merged into one computed event result per athlete; exercises are
 * not tied to a specific weekday.
 */
export interface TestSession {
  id: string
  athleteId: string
  eventId?: string // optional only for legacy-data migration
  date: string
  phase: TestingPhase
  createdAt?: string

  // Historical profile snapshot; prevents later profile edits rewriting history.
  gradeSnapshot?: number
  positionSnapshot?: string
  positionGroupSnapshot?: PositionGroup
  weightLbsSnapshot?: number

  benchMax?: number
  dash40_1?: number
  dash40_2?: number
  dash10_1?: number
  dash10_2?: number
  fly10_1?: number
  fly10_2?: number
  /** Direct, measured one-repetition maximum for the Power Clean in pounds. */
  powerCleanMax?: number
  /** Legacy body-weight hang-clean AMRAP result retained for audit/conversion. */
  hangCleanReps?: number
  /** Derived only when yearly results are merged; never required for storage. */
  estimatedPowerCleanMax?: number
  /** Body weight recorded with the winning legacy hang-clean AMRAP result. */
  hangCleanWeightLbsSnapshot?: number
  shuttle20_1?: number
  shuttle20_2?: number
  latShuttle_1?: number
  latShuttle_2?: number
  illinois?: number
  squatMax?: number
  broadJump?: number
  verticalJump?: number
  cond51015?: number
}

/** A single game/scrimmage play that earns Havoc (defense) or Playmaker (offense) points. */
export interface PlayEvent {
  id: string
  athleteId: string
  /** Play-type key from the impact catalog (see lib/impact.ts). */
  type: string
  date: string
  opponent?: string
  note?: string
  createdAt?: string
}

/** Everything the app persists. `events` stays optional for legacy imports. */
export interface AppData {
  athletes: Athlete[]
  sessions: TestSession[]
  events?: TestingEvent[]
  plays?: PlayEvent[]
}

export type CategoryScores = Record<Category, number>

/** A fully computed event result: merged raw values + stable benchmark scores. */
export interface ComputedSession {
  session: TestSession
  athlete: Athlete
  event: TestingEvent
  metrics: Record<string, number | undefined>
  normalized: Record<string, number | undefined>
  categories: CategoryScores
  fai: number
  completionPct: number
  scoreStatus: ScoreStatus
}

export interface AthleteResult {
  athlete: Athlete
  current: ComputedSession
  previous?: ComputedSession
  faiImprovement: number
  faiImprovementPct: number
  teamRank: number
  teamCount: number
  groupRank: number
  groupCount: number
  rankEligible: boolean
}
