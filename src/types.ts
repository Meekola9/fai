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

export type DeploymentRosterNeed = 'none' | 'emergency' | 'rotation' | 'starter'
export type IronManPackageStatus = 'planning' | 'installing' | 'ready' | 'paused'

export interface DeploymentAssessment {
  rosterNeed: DeploymentRosterNeed
  /** Coach rating from 1-5 for handling a second terminology and adjustment load. */
  coachMentalReadiness?: number
  /** Coach or film grade from 0-100 for executing the correct assignment. */
  assignmentReliability?: number
  updatedAt?: string
}

export interface IronManPackage {
  status: IronManPackageStatus
  /** Restricted to one or two secondary formations. */
  formations: string[]
  /** Restricted to ten calls / assignments. */
  calls: string[]
  responsibilities?: string
  /** Planned secondary snap ceiling; FAI caps this at 30%. */
  secondarySnapCapPct: number
  reviewDate?: string
}

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
  /** Primary Specialist, Two-Way, or limited-package Iron Man deployment. */
  usage?: PlayerUsage
  /** Optional second role for Two-Way and Iron Man players. */
  secondaryPosition?: string
  secondaryPositionGroup?: PositionGroup
  heightIn: number
  weightLbs: number
  photoUrl?: string
  /** Hudl (or other) film link shown on the athlete profile. */
  hudlUrl?: string
  /** Coach evidence used by the deployment recommendation engine. */
  deploymentAssessment?: DeploymentAssessment
  /** Restricted second-side installation for an Iron Man athlete. */
  ironManPackage?: IronManPackage
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

/** The final score of one game — powers the team record and per-game W/L. */
export interface GameResult {
  id: string
  date: string
  opponent: string
  /** Our points. */
  teamScore: number
  /** Opponent points. */
  oppScore: number
  note?: string
  createdAt?: string
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
  /**
   * Real-world field position in yards [length 0-100, width 0-53.3] from the CV
   * homography, when the field map is set. This is what makes true speed possible —
   * image coords alone can't, because perspective stretches near-camera yards.
   */
  field?: [number, number]
  /**
   * Normalized player bounding box [x1, y1, x2, y2] (0-1, top-left to bottom-right)
   * from the CV detector, when available. Lets the overlay draw a highlight box that
   * tracks the whole player instead of a single dot at their feet.
   */
  box?: [number, number, number, number]
  /** Whether the coach placed this point or the browser tracker generated it. */
  source?: 'manual' | 'auto'
  /** 0-1 visual match confidence for automatic points. */
  confidence?: number
  /** Estimated whole-frame horizontal camera shift, normalized to frame width. */
  cameraDx?: number
  /** Estimated whole-frame vertical camera shift, normalized to frame height. */
  cameraDy?: number
  /** Per-frame camera zoom ratio used to compensate the point. */
  cameraScale?: number
  /** Estimated 0-1 motion/defocus blur level for the source frame. */
  blurLevel?: number
  /** Player-template scale relative to the coach-selected starting frame. */
  playerScale?: number
  /** True when whole-frame pan/tilt/zoom compensation materially changed prediction. */
  motionCompensated?: boolean
}

export type FilmAnnotationKind = 'route' | 'trail' | 'zone' | 'arrow'
export type TrackingTeam = 'ours' | 'opponent'

export type ThrowFamily =
  | 'screen'
  | 'quick-game'
  | 'rpo'
  | 'dropback'
  | 'play-action'
  | 'rollout'
  | 'sprint-out'
  | 'boot'
  | 'deep-shot'
  | 'throwaway'
  | 'other'
export type ThrowTrajectory = 'bullet' | 'touch' | 'lob' | 'layered' | 'checkdown' | 'throwaway'
export type ThrowPlatform =
  | 'on-platform'
  | 'off-platform'
  | 'moving-left'
  | 'moving-right'
  | 'back-foot'
  | 'jump-pass'
export type ThrowArmSlot = 'overhand' | 'three-quarter' | 'sidearm' | 'underhand'
export type ThrowHandedness = 'right' | 'left'
export type ThrowLandmark =
  | 'throwingShoulder'
  | 'throwingElbow'
  | 'throwingWrist'
  | 'frontShoulder'
  | 'throwingHip'
  | 'frontHip'
  | 'backFoot'
  | 'frontFoot'

/** Coach-assisted quarterback throw breakdown saved with one film play. */
export interface ThrowAnalysis {
  quarterbackId?: string
  throwFamily?: ThrowFamily
  trajectory?: ThrowTrajectory
  platform?: ThrowPlatform
  armSlot?: ThrowArmSlot
  handedness?: ThrowHandedness
  snapTimeSec?: number
  plantTimeSec?: number
  releaseTimeSec?: number
  arrivalTimeSec?: number
  /** Air distance supplied by the coach; required for average ball-speed mph. */
  throwDistanceYards?: number
  /** Eight coach-marked 2D landmarks from the release frame. */
  landmarks?: Partial<Record<ThrowLandmark, FilmAnnotationPoint>>
  note?: string
}

/** A route line, defender trail, coverage zone, or pointer drawn over film. */
export interface FilmAnnotation {
  id: string
  kind: FilmAnnotationKind
  /** Rostered athlete this path belongs to, when known. */
  athleteId?: string
  label?: string
  color?: string
  /** True when this trail is a coach-assisted timed player track. */
  tracking?: boolean
  /** Unit assignment used to color and group a timed player track. */
  trackingSide?: PlaySide
  /** Whether the tracked player belongs to our team or the opponent. */
  trackingTeam?: TrackingTeam
  /** Position/formation label such as X, Z, LT, Mike, or Boundary CB. */
  formationRole?: string
  /** Coach marked this individual route as finished. */
  trackingComplete?: boolean
  /** Special metadata record for QB timing, mechanics, speed, and throw type. */
  throwAnalysis?: ThrowAnalysis
  points: FilmAnnotationPoint[]
}

export type PlaySide = 'offense' | 'defense' | 'special'
export type PlayCall = 'run' | 'pass' | 'rpo' | 'screen' | 'special'
export type FieldHash = 'L' | 'M' | 'R'

/** What a master source film is — a game, practice, or scrimmage. */
export type FilmSourceKind = 'game' | 'practice' | 'scrimmage' | 'other'

// ---------------------------------------------------------------------------
// Chief-to-King plan — a coach's per-opponent game-plan worksheet.
// King  = the player everything flows through (QB, dominant LB, elite safety,
//         disruptive DE, or featured skill player).
// Chiefs = the 2-3 supporting players who make the King effective.
// The plan drives the sideline "Chief-to-King" alert: attack the weakest Chief
// until the King has to compensate/break structure, then counter the King.
// ---------------------------------------------------------------------------
export type KingPosition = 'qb' | 'mlb' | 'de' | 'safety' | 'skill' | 'other'

/** One supporting player who makes the King effective. */
export interface ChiefEntry {
  id: string
  label: string // "#42 MIKE" or a name
  role?: string // e.g. "nickel", "center", "slot"
  note?: string
}

/** A per-opponent Chief-to-King worksheet. */
export interface ChiefKingPlan {
  id: string
  opponent: string
  kingLabel: string
  kingPosition: KingPosition
  chiefs: ChiefEntry[]
  /** The supporting Chief with the worst matchup — the one to attack. */
  weakestChiefId?: string
  note?: string
  createdAt?: string
}

/**
 * One master source film. The video itself is never persisted — only this
 * lightweight record, so a coach can group every play cut from one game or
 * practice. Plays reference it by id and store timestamps, never a copy of the
 * video.
 */
export interface FilmSource {
  id: string
  label: string
  kind: FilmSourceKind
  date?: string
  opponent?: string
  createdAt?: string
}

/**
 * Which tagging vocabulary a coach-defined catalog entry extends. Custom
 * entries are merged with the built-in catalogs (see lib/filmAnalysis.ts) so a
 * staff can add their own formations, personnel groupings, and run/pass
 * concepts — including looks transcribed from opponent film.
 */
export type FilmCatalogKind = 'formation' | 'personnel' | 'run_concept' | 'pass_concept'

/**
 * One coach-defined tagging option. `key` is the stable slug stored on plays;
 * `label` is what shows in menus and the scouting report; `note` is an optional
 * recognition cue ("3 receivers to the field, TE detached").
 */
export interface FilmCatalogEntry {
  id: string
  kind: FilmCatalogKind
  key: string
  label: string
  note?: string
  createdAt?: string
}

/** One tagged play broken down from film. */
export interface FilmPlay {
  id: string
  /** Human label for the film source, e.g. "vs Central — Q1" or a file name. */
  filmLabel?: string
  /** The master source film this play was cut from, when created that way. */
  filmSourceId?: string
  /** Seek point (seconds) within the loaded film, so a coach can jump back. */
  videoTimeSec?: number
  /** Clip in/out points within the source film (seconds). */
  startTimeSec?: number
  endTimeSec?: number

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
  /** Defenders in the box on this snap — drives the box-count / run advantage number. */
  boxCount?: number
  /**
   * Signed "hidden yardage" from our perspective (special-teams return/coverage,
   * penalties, turnover field position). Positive = in our favor. Drives the
   * hidden-yardage margin on the sideline dashboard.
   */
  hiddenYards?: number

  // Result
  gain?: number // yards gained (may be negative)
  result?: string // 'TD' | 'INT' | 'incomplete' | free text

  // Analysis overlay
  annotations?: FilmAnnotation[]
  note?: string
  createdAt?: string
}

/**
 * One completed Football Awareness Quiz, taken by an athlete from their own
 * account. The awareness score (0-100) is derived from the answers.
 */
export interface AwarenessResult {
  id: string
  athleteId: string
  /** Quiz version key (see lib/awarenessQuiz.ts). */
  quizId: string
  /** 0-100 awareness score. */
  score: number
  correct: number
  total: number
  /** ISO timestamp the athlete completed the quiz. */
  takenAt: string
  createdAt?: string
}

/** Everything the app persists. `events` stays optional for legacy imports. */
export interface AppData {
  athletes: Athlete[]
  sessions: TestSession[]
  events?: TestingEvent[]
  plays?: PlayEvent[]
  filmPlays?: FilmPlay[]
  filmSources?: FilmSource[]
  filmCatalog?: FilmCatalogEntry[]
  chiefKingPlans?: ChiefKingPlan[]
  awarenessResults?: AwarenessResult[]
  gameResults?: GameResult[]
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
  /** FAI before any boost (Playmaker/Havoc + awareness). */
  baseFai: number
  /** Playmaker/Havoc level boost applied to current.fai, in percent. */
  impactBoostPct: number
  /** Awareness-quiz boost applied to current.fai, in percent. */
  awarenessBoostPct: number
  /** Signed efficiency adjustment applied to current.fai, in percent (+boost / -reduction). */
  efficiencyBoostPct: number
}
