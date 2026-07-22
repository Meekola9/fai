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

// ---------------------------------------------------------------------------
// Film analysis — the Video Analyst / "Next Gen"-style breakdown layer.
//
// A FilmPlay is one tagged snap from game film (usually an opponent's, for
// scouting). The video itself is never persisted — only where to seek within
// the loaded film plus the lightweight situational tags and drawn overlays.
// Auto-detection (players / ball / trails) will later fill the same fields a
// coach can tag by hand today.
// ---------------------------------------------------------------------------

/** A single drawn point on the film overlay, normalized to the video frame. */
export interface FilmAnnotationPoint {
  x: number // 0-1 across the frame width
  y: number // 0-1 down the frame height
  t?: number // optional seconds from the play's start, for trails / speed
}

export type FilmAnnotationKind = 'route' | 'trail' | 'zone' | 'arrow'

/** A route line, defender trail, coverage zone, or pointer drawn over film. */
export interface FilmAnnotation {
  id: string
  kind: FilmAnnotationKind
  /** Rostered athlete this path belongs to, when known. */
  athleteId?: string
  label?: string
  color?: string
  points: FilmAnnotationPoint[]
}

export type PlaySide = 'offense' | 'defense' | 'special'
export type PlayCall = 'run' | 'pass' | 'rpo' | 'screen' | 'special'
export type FieldHash = 'L' | 'M' | 'R'

/** One tagged play broken down from film. */
export interface FilmPlay {
  id: string
  /** Human label for the film source, e.g. "vs Central — Q1" or a file name. */
  filmLabel?: string
  /** Seek point (seconds) within the loaded film, so a coach can jump back. */
  videoTimeSec?: number

  // Game context
  opponent?: string
  date?: string
  /** Which unit this snap describes — defaults to the scouted offense. */
  side?: PlaySide
  quarter?: number
  down?: number // 1-4
  distance?: number // yards to go
  yardLine?: number // 1-99 (own 1 … opponent 1)
  hash?: FieldHash

  // What was called / seen
  formation?: string // formation key from the catalog
  personnel?: string // e.g. '11', '21', '12'
  call?: PlayCall
  concept?: string // run or pass concept key
  ballCarrierId?: string // rostered athlete
  targetId?: string // rostered athlete (intended receiver)

  // Result
  gain?: number // yards gained (may be negative)
  result?: string // 'TD' | 'INT' | 'incomplete' | free text

  // Analysis overlay
  annotations?: FilmAnnotation[]
  note?: string
  createdAt?: string
}

/** Everything the app persists. `events` stays optional for legacy imports. */
export interface AppData {
  athletes: Athlete[]
  sessions: TestSession[]
  events?: TestingEvent[]
  plays?: PlayEvent[]
  filmPlays?: FilmPlay[]
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
  /** FAI before the Playmaker/Havoc level boost. */
  baseFai: number
  /** Playmaker/Havoc level boost applied to current.fai, in percent. */
  impactBoostPct: number
}
