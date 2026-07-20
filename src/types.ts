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

export type ScoreStatus = 'complete' | 'provisional' | 'insufficient'

/** A single athlete on the roster (identity / current bio information). */
export interface Athlete {
  id: string
  name: string
  grade: number // 9-12
  position: string
  positionGroup: PositionGroup
  heightIn: number
  weightLbs: number
  photoUrl?: string
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
  hangCleanReps?: number
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

/** Everything the app persists. `events` stays optional for legacy imports. */
export interface AppData {
  athletes: Athlete[]
  sessions: TestSession[]
  events?: TestingEvent[]
}

export interface CategoryScores {
  Speed: number
  Power: number
  'Change of Direction': number
  Conditioning: number
  Strength: number
}

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
