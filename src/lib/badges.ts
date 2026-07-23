import { CATEGORIES } from '../data/constants'
import {
  flyTimeToMph,
  isSpeedSkillGroup,
  METRICS_BY_CATEGORY,
} from '../data/scoring'
import type {
  AthleteResult,
  Category,
  ComputedSession,
  PositionGroup,
} from '../types'
import { computeProgress } from './progress'
import {
  ARCHETYPE_CATALOG,
  archetypeFor,
  type ArchetypeConfidence,
  type PlayerArchetype,
} from './archetypes'

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'elite' | 'legend'
export type BadgeGroup = 'testing' | 'performance' | 'club' | 'progress' | 'ranking' | 'signature'

export interface PlayerBadgeDefinition {
  id: string
  name: string
  icon: string
  tier: BadgeTier
  group: BadgeGroup
  description: string
  earnedBy: string
  priority: number
}

export interface EarnedPlayerBadge extends PlayerBadgeDefinition {
  evidence: string
}

export interface PlayerBadgeContext {
  result: AthleteResult
  timeline: ComputedSession[]
}

const catalog = <T extends readonly PlayerBadgeDefinition[]>(items: T): T => items

/**
 * Public badge catalog. Badges summarize verified testing achievements; they do
 * not certify football technique, production, toughness, leadership, or game IQ.
 */
export const PLAYER_BADGE_CATALOG = catalog([
  // Testing foundation -------------------------------------------------------
  {
    id: 'first-mark', name: 'First Mark', icon: '🎯', tier: 'bronze', group: 'testing', priority: 10,
    description: 'The athlete established a first usable FAI testing profile.',
    earnedBy: 'Record at least one testing event with enough data to produce an FAI result.',
  },
  {
    id: 'combine-complete', name: 'Combine Complete', icon: '✅', tier: 'silver', group: 'testing', priority: 55,
    description: 'Every required FAI test is present for the current event.',
    earnedBy: 'Reach 100% completion and an official complete score.',
  },
  {
    id: 'battle-tested', name: 'Battle Tested', icon: '🛡️', tier: 'gold', group: 'testing', priority: 52,
    description: 'The athlete has built a multi-event testing history instead of relying on one snapshot.',
    earnedBy: 'Complete testing in at least three separate FAI events.',
  },

  // Category profile ---------------------------------------------------------
  {
    id: 'speed-demon', name: 'Speed Demon', icon: '⚡', tier: 'elite', group: 'performance', priority: 88,
    description: 'Maximum-velocity speed is one of the athlete’s verified elite traits.',
    earnedBy: 'Score 85 or higher in the Speed category.',
  },
  {
    id: 'rocket-start', name: 'Rocket Start', icon: '🚀', tier: 'elite', group: 'performance', priority: 87,
    description: 'The athlete creates separation quickly from a standing start.',
    earnedBy: 'Score 85 or higher in the Acceleration category.',
  },
  {
    id: 'skywalker', name: 'Skywalker', icon: '🪽', tier: 'elite', group: 'performance', priority: 84,
    description: 'Vertical explosiveness is a defining part of the testing profile.',
    earnedBy: 'Score 85 or higher in the Jump category.',
  },
  {
    id: 'power-plant', name: 'Power Plant', icon: '💥', tier: 'elite', group: 'performance', priority: 86,
    description: 'The athlete converts force into explosive output at a high level.',
    earnedBy: 'Score 85 or higher in the Power category.',
  },
  {
    id: 'range-hunter', name: 'Range Hunter', icon: '🎯', tier: 'gold', group: 'performance', priority: 80,
    description: 'Pursuit testing indicates strong ability to cover ground through a longer agility pattern.',
    earnedBy: 'Score 85 or higher in the Pursuit category.',
  },
  {
    id: 'cut-on-a-dime', name: 'Cut on a Dime', icon: '🧭', tier: 'elite', group: 'performance', priority: 85,
    description: 'Short-area redirection is a verified strength of the athlete’s profile.',
    earnedBy: 'Score 85 or higher in Change of Direction.',
  },
  {
    id: 'iron-lungs', name: 'Iron Lungs', icon: '🫁', tier: 'gold', group: 'performance', priority: 78,
    description: 'The athlete maintains repeat-effort output during the conditioning test.',
    earnedBy: 'Score 85 or higher in Conditioning.',
  },
  {
    id: 'trench-strong', name: 'Trench Strong', icon: '🧱', tier: 'gold', group: 'performance', priority: 77,
    description: 'Relative strength is a major verified trait for a non-speed-skill position group.',
    earnedBy: 'For QB, TE, OL, DL, LB, or K/P: score 85 or higher in Strength.',
  },
  {
    id: 'balanced-weapon', name: 'Balanced Weapon', icon: '⚖️', tier: 'gold', group: 'performance', priority: 82,
    description: 'The athlete has a strong, even profile without one category carrying the entire score.',
    earnedBy: 'Have at least six measured categories, all at 65 or higher, with an 18-point spread or less.',
  },
  {
    id: 'no-weak-links', name: 'No Weak Links', icon: '🔗', tier: 'elite', group: 'performance', priority: 90,
    description: 'The athlete has broad competency across nearly the entire testing battery.',
    earnedBy: 'Have at least seven measured categories and score 60 or higher in every measured category.',
  },
  {
    id: 'triple-threat', name: 'Triple Threat', icon: '🔺', tier: 'elite', group: 'performance', priority: 89,
    description: 'Three separate athletic categories grade at an elite level.',
    earnedBy: 'Score 85 or higher in at least three measured categories.',
  },
  {
    id: 'five-tool-athlete', name: 'Five-Tool Athlete', icon: '🖐️', tier: 'legend', group: 'performance', priority: 96,
    description: 'The athlete carries high-level output across five different athletic qualities.',
    earnedBy: 'Score 75 or higher in at least five measured categories.',
  },

  // Absolute test clubs ------------------------------------------------------
  {
    id: 'twenty-mph-club', name: '20 MPH Club', icon: '🌪️', tier: 'legend', group: 'club', priority: 98,
    description: 'The athlete crossed the 20-mile-per-hour mark through the timed 10-yard fly zone.',
    earnedBy: 'Record an estimated 10-yard-fly speed of at least 20.0 mph.',
  },
  {
    id: 'nineteen-mph-club', name: '19 MPH Club', icon: '💨', tier: 'elite', group: 'club', priority: 92,
    description: 'The athlete demonstrated high absolute maximum velocity.',
    earnedBy: 'Record an estimated 10-yard-fly speed from 19.0 through 19.9 mph.',
  },
  {
    id: 'four-fifty-club', name: '4.50 Club', icon: '⏱️', tier: 'legend', group: 'club', priority: 97,
    description: 'The athlete recorded an exceptional absolute 40-yard dash time.',
    earnedBy: 'Run a verified 40-yard dash in 4.50 seconds or faster.',
  },
  {
    id: 'four-seventy-five-club', name: '4.75 Club', icon: '🏎️', tier: 'gold', group: 'club', priority: 83,
    description: 'The athlete crossed a strong absolute 40-yard benchmark.',
    earnedBy: 'Run a verified 40-yard dash from 4.51 through 4.75 seconds.',
  },
  {
    id: 'big-man-burst', name: 'Big Man Burst', icon: '🚂', tier: 'elite', group: 'club', priority: 91,
    description: 'An offensive or defensive lineman produced high-end short-area acceleration.',
    earnedBy: 'For OL or DL: run a verified 10-yard dash in 1.85 seconds or faster.',
  },
  {
    id: 'ten-foot-club', name: '10-Foot Club', icon: '📏', tier: 'elite', group: 'club', priority: 90,
    description: 'The athlete reached the 10-foot standing broad-jump standard.',
    earnedBy: 'Record a broad jump of at least 120 inches.',
  },
  {
    id: 'thirty-five-inch-club', name: '35-Inch Club', icon: '⬆️', tier: 'elite', group: 'club', priority: 90,
    description: 'The athlete reached a high vertical-jump standard.',
    earnedBy: 'Record a vertical jump of at least 35 inches.',
  },
  {
    id: 'clean-machine', name: 'Clean Machine', icon: '🏋️', tier: 'gold', group: 'club', priority: 81,
    description: 'The athlete repeatedly moved body weight in the hang clean with quality work capacity.',
    earnedBy: 'Complete at least 12 valid hang-clean repetitions at body weight.',
  },
  {
    id: 'shuttle-technician', name: 'Shuttle Technician', icon: '↔️', tier: 'elite', group: 'club', priority: 89,
    description: 'The athlete posted a high-level 20-yard shuttle time.',
    earnedBy: 'Run the 20-yard shuttle in 4.35 seconds or faster.',
  },
  {
    id: 'lateral-lock', name: 'Lateral Lock', icon: '🔒', tier: 'elite', group: 'club', priority: 88,
    description: 'The athlete demonstrated strong lateral redirection speed.',
    earnedBy: 'Run the lateral 10-yard shuttle in 2.75 seconds or faster.',
  },
  {
    id: 'conditioning-engine', name: 'Conditioning Engine', icon: '♻️', tier: 'gold', group: 'club', priority: 79,
    description: 'The athlete accumulated a high yardage total under the repeat-effort conditioning protocol.',
    earnedBy: 'Reach at least 150 yards in the 30-second 5-10-15 conditioning test.',
  },

  // Progress ----------------------------------------------------------------
  {
    id: 'riser', name: 'Riser', icon: '📈', tier: 'silver', group: 'progress', priority: 67,
    description: 'The athlete made a meaningful year-over-year increase in overall FAI.',
    earnedBy: 'Improve overall FAI by 3.0 through 7.9 points from the prior event.',
  },
  {
    id: 'breakout-year', name: 'Breakout Year', icon: '🔥', tier: 'elite', group: 'progress', priority: 93,
    description: 'The athlete produced a major jump in overall athletic profile.',
    earnedBy: 'Improve overall FAI by at least 8.0 points from the prior event.',
  },
  {
    id: 'all-around-growth', name: 'All-Around Growth', icon: '🌱', tier: 'gold', group: 'progress', priority: 75,
    description: 'Improvement occurred across several qualities instead of only one test.',
    earnedBy: 'Improve at least four measured categories by 3.0 points or more.',
  },
  {
    id: 'personal-best-parade', name: 'Personal-Best Parade', icon: '🎉', tier: 'gold', group: 'progress', priority: 74,
    description: 'The athlete set new marks across a large portion of the testing battery.',
    earnedBy: 'Improve at least five directly comparable raw tests from the prior event.',
  },

  // Score and ranking --------------------------------------------------------
  {
    id: 'fai-eighty-club', name: 'FAI 80 Club', icon: '🏆', tier: 'elite', group: 'ranking', priority: 94,
    description: 'The athlete earned an official FAI score of at least 80.',
    earnedBy: 'Complete the required battery and score from 80.0 through 89.9 FAI.',
  },
  {
    id: 'fai-ninety-club', name: 'FAI 90 Club', icon: '💎', tier: 'legend', group: 'ranking', priority: 100,
    description: 'The athlete earned an exceptional official FAI score.',
    earnedBy: 'Complete the required battery and score at least 90.0 FAI.',
  },
  {
    id: 'team-number-one', name: 'Team No. 1', icon: '👑', tier: 'legend', group: 'ranking', priority: 100,
    description: 'The athlete owns the highest official FAI score on the team for the selected event.',
    earnedBy: 'Hold official Team Rank No. 1.',
  },
  {
    id: 'podium-finisher', name: 'Podium Finisher', icon: '🥇', tier: 'elite', group: 'ranking', priority: 95,
    description: 'The athlete placed among the top three official FAI scores on the team.',
    earnedBy: 'Hold official Team Rank No. 2 or No. 3.',
  },
  {
    id: 'position-leader', name: 'Position Leader', icon: '🏅', tier: 'elite', group: 'ranking', priority: 94,
    description: 'The athlete leads the official FAI ranking inside the assigned position group.',
    earnedBy: 'Hold official Position-Group Rank No. 1 with at least two athletes in the group.',
  },
  {
    id: 'top-ten', name: 'Team Top 10', icon: '⚔️', tier: 'gold', group: 'ranking', priority: 76,
    description: 'The athlete ranks inside the team’s official top ten.',
    earnedBy: 'Hold official Team Rank No. 4 through No. 10.',
  },
] as const)

const DEFINITION_BY_ID: ReadonlyMap<string, PlayerBadgeDefinition> = new Map(
  PLAYER_BADGE_CATALOG.map((definition) => [definition.id, definition] as const),
)

function definition(id: string): PlayerBadgeDefinition {
  const item = DEFINITION_BY_ID.get(id)
  if (!item) throw new Error(`Unknown player badge: ${id}`)
  return item
}

// ---------------------------------------------------------------------------
// Signature archetype badges.
//
// Unlike the shared threshold badges above, a signature badge is unique to the
// athlete's assigned archetype — so a Field Stretcher and a Route Technician
// carry different marks even when they share the same generic Speed Demon badge.
// The tier reflects how confident the archetype match is.
// ---------------------------------------------------------------------------

export const SIGNATURE_BADGE_PREFIX = 'signature-'

function signatureTier(confidence: ArchetypeConfidence): BadgeTier {
  return confidence === 'high' ? 'gold' : confidence === 'medium' ? 'silver' : 'bronze'
}

/** The reference definition for one archetype's signature badge. */
export function signatureBadgeDefinition(
  archetype: Pick<PlayerArchetype, 'id' | 'name' | 'role' | 'description'>,
): PlayerBadgeDefinition {
  return {
    id: `${SIGNATURE_BADGE_PREFIX}${archetype.id}`,
    name: archetype.name,
    icon: '',
    tier: 'gold',
    group: 'signature',
    description: archetype.description,
    earnedBy: `Awarded when ${archetype.name} is the athlete's best-matching ${archetype.role} testing archetype.`,
    priority: 99,
  }
}

/** Every archetype's signature badge, for the reference guide. */
export const SIGNATURE_BADGE_CATALOG: readonly PlayerBadgeDefinition[] =
  ARCHETYPE_CATALOG.map((archetype) => signatureBadgeDefinition(archetype))

/** The earned signature badge for an assigned archetype, tiered by confidence. */
export function signatureBadgeFor(archetype: PlayerArchetype): EarnedPlayerBadge {
  const lead = archetype.evidence[0]
  return {
    ...signatureBadgeDefinition(archetype),
    tier: signatureTier(archetype.confidence),
    evidence: `${archetype.role} archetype · ${archetype.confidence} confidence${lead ? ` · ${lead}` : ''}`,
  }
}

function categoryAvailable(current: ComputedSession, category: Category): boolean {
  return METRICS_BY_CATEGORY(category).some(
    (metric) => typeof current.normalized[metric.key] === 'number',
  )
}

function measuredCategories(current: ComputedSession): Category[] {
  return CATEGORIES.filter((category) => categoryAvailable(current, category))
}

function positionGroup(result: AthleteResult): PositionGroup {
  return result.current.session.positionGroupSnapshot ?? result.athlete.positionGroup
}

function add(
  earned: EarnedPlayerBadge[],
  id: string,
  evidence: string,
): void {
  earned.push({ ...definition(id), evidence })
}

/** Compute all badges earned by the selected athlete-event result. */
export function playerBadgesFor({
  result,
  timeline,
}: PlayerBadgeContext): EarnedPlayerBadge[] {
  const earned: EarnedPlayerBadge[] = []
  const { current, previous } = result
  const group = positionGroup(result)
  const categories = measuredCategories(current)
  const values = categories.map((category) => current.categories[category])

  // Signature archetype badge — unique to this athlete's assigned identity.
  const archetype = archetypeFor(current)
  if (archetype) earned.push(signatureBadgeFor(archetype))

  add(earned, 'first-mark', `${current.event.name}: ${current.completionPct}% testing coverage`)

  if (current.scoreStatus === 'complete') {
    add(earned, 'combine-complete', 'All required tests recorded')
  }
  if (timeline.filter((item) => item.scoreStatus === 'complete').length >= 3) {
    add(earned, 'battle-tested', `${timeline.filter((item) => item.scoreStatus === 'complete').length} complete testing events`)
  }

  const categoryBadge: Partial<Record<Category, string>> = {
    Speed: 'speed-demon',
    Acceleration: 'rocket-start',
    Jump: 'skywalker',
    Power: 'power-plant',
    Pursuit: 'range-hunter',
    'Change of Direction': 'cut-on-a-dime',
    Conditioning: 'iron-lungs',
  }
  for (const [category, id] of Object.entries(categoryBadge) as [Category, string][]) {
    if (categoryAvailable(current, category) && current.categories[category] >= 85) {
      add(earned, id, `${category} ${Math.round(current.categories[category])}`)
    }
  }
  if (
    !isSpeedSkillGroup(group)
    && categoryAvailable(current, 'Strength')
    && current.categories.Strength >= 85
  ) {
    add(earned, 'trench-strong', `Strength ${Math.round(current.categories.Strength)}`)
  }

  if (categories.length >= 6 && values.every((value) => value >= 65)) {
    const spread = Math.max(...values) - Math.min(...values)
    if (spread <= 18) add(earned, 'balanced-weapon', `${categories.length} categories within an ${Math.round(spread)}-point spread`)
  }
  if (categories.length >= 7 && values.every((value) => value >= 60)) {
    add(earned, 'no-weak-links', `${categories.length} measured categories at 60+`)
  }
  const eliteCategories = categories.filter((category) => current.categories[category] >= 85)
  if (eliteCategories.length >= 3) {
    add(earned, 'triple-threat', `${eliteCategories.length} categories at 85+`)
  }
  const highCategories = categories.filter((category) => current.categories[category] >= 75)
  if (highCategories.length >= 5) {
    add(earned, 'five-tool-athlete', `${highCategories.length} categories at 75+`)
  }

  const fly = current.metrics.bestFly
  if (typeof fly === 'number' && fly > 0) {
    const mph = flyTimeToMph(fly)
    if (mph >= 20) add(earned, 'twenty-mph-club', `${mph.toFixed(1)} mph estimated from 10-yard fly`)
    else if (mph >= 19) add(earned, 'nineteen-mph-club', `${mph.toFixed(1)} mph estimated from 10-yard fly`)
  }

  const dash40 = current.metrics.best40
  if (typeof dash40 === 'number' && dash40 > 0) {
    if (dash40 <= 4.5) add(earned, 'four-fifty-club', `${dash40.toFixed(2)}s 40-yard dash`)
    else if (dash40 <= 4.75) add(earned, 'four-seventy-five-club', `${dash40.toFixed(2)}s 40-yard dash`)
  }

  const dash10 = current.metrics.best10
  if ((group === 'OL' || group === 'DL') && typeof dash10 === 'number' && dash10 <= 1.85) {
    add(earned, 'big-man-burst', `${dash10.toFixed(2)}s 10-yard dash`)
  }
  const broad = current.metrics.broadJump
  if (typeof broad === 'number' && broad >= 120) add(earned, 'ten-foot-club', `${broad.toFixed(0)}in broad jump`)
  const vertical = current.metrics.verticalJump
  if (typeof vertical === 'number' && vertical >= 35) add(earned, 'thirty-five-inch-club', `${vertical.toFixed(1)}in vertical jump`)
  const clean = current.metrics.hangCleanReps
  if (typeof clean === 'number' && clean >= 12) add(earned, 'clean-machine', `${clean.toFixed(0)} body-weight hang-clean reps`)
  const shuttle = current.metrics.best20Shuttle
  if (typeof shuttle === 'number' && shuttle <= 4.35) add(earned, 'shuttle-technician', `${shuttle.toFixed(2)}s 20-yard shuttle`)
  const lateral = current.metrics.bestLatShuttle
  if (typeof lateral === 'number' && lateral <= 2.75) add(earned, 'lateral-lock', `${lateral.toFixed(2)}s lateral shuttle`)
  const conditioning = current.metrics.cond51015
  if (typeof conditioning === 'number' && conditioning >= 150) add(earned, 'conditioning-engine', `${conditioning.toFixed(0)} yards in 30 seconds`)

  if (previous) {
    if (result.faiImprovement >= 8) {
      add(earned, 'breakout-year', `FAI improved ${result.faiImprovement.toFixed(1)} points`)
    } else if (result.faiImprovement >= 3) {
      add(earned, 'riser', `FAI improved ${result.faiImprovement.toFixed(1)} points`)
    }

    const progress = computeProgress(current, previous)
    const improvedCategories = progress.categories.filter(
      (category) => typeof category.current === 'number' && typeof category.previous === 'number' && category.improvement >= 3,
    )
    if (improvedCategories.length >= 4) {
      add(earned, 'all-around-growth', `${improvedCategories.length} categories improved by 3+`)
    }
    const rawPersonalBests = progress.metrics.filter(
      (metric) => typeof metric.rawImprovement === 'number' && metric.rawImprovement > 0,
    )
    if (rawPersonalBests.length >= 5) {
      add(earned, 'personal-best-parade', `${rawPersonalBests.length} improved raw tests`)
    }
  }

  if (result.rankEligible) {
    if (current.fai >= 90) add(earned, 'fai-ninety-club', `Official FAI ${current.fai.toFixed(1)}`)
    else if (current.fai >= 80) add(earned, 'fai-eighty-club', `Official FAI ${current.fai.toFixed(1)}`)

    if (result.teamRank === 1) add(earned, 'team-number-one', `Team Rank #1 of ${result.teamCount}`)
    else if (result.teamRank >= 2 && result.teamRank <= 3) add(earned, 'podium-finisher', `Team Rank #${result.teamRank} of ${result.teamCount}`)
    else if (result.teamRank >= 4 && result.teamRank <= 10) add(earned, 'top-ten', `Team Rank #${result.teamRank} of ${result.teamCount}`)

    if (result.groupRank === 1 && result.groupCount >= 2) {
      add(earned, 'position-leader', `${group} Rank #1 of ${result.groupCount}`)
    }
  }

  return earned.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
}
