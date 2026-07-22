import { CATEGORIES } from '../data/constants'
import { isSpeedSkillGroup, METRICS_BY_CATEGORY } from '../data/scoring'
import type { Category, ComputedSession, PositionGroup } from '../types'

export type ArchetypeConfidence = 'high' | 'medium' | 'low'

type SizePreference = 'light' | 'middle' | 'heavy' | 'any'

interface ArchetypeDefinition {
  id: string
  name: string
  group: PositionGroup
  description: string
  primary: readonly Category[]
  size?: SizePreference
  balanced?: boolean
}

export interface PlayerArchetype {
  id: string
  name: string
  positionGroup: PositionGroup
  description: string
  primaryTraits: readonly Category[]
  confidence: ArchetypeConfidence
  evidence: string[]
}

const balancedTraits: readonly Category[] = CATEGORIES

/**
 * Sixty distinct athletic archetypes. These labels describe combine-testing
 * profiles, not unmeasured football technique, production, or football IQ.
 */
export const ARCHETYPE_CATALOG: readonly ArchetypeDefinition[] = [
  // Quarterbacks
  { id: 'qb-open-field-creator', name: 'Open-Field Creator', group: 'QB', description: 'A quarterback testing profile led by top speed and change-of-direction ability.', primary: ['Speed', 'Change of Direction', 'Acceleration'], size: 'light' },
  { id: 'qb-burst-runner', name: 'Burst Runner', group: 'QB', description: 'A quarterback with acceleration and lower-body power as the clearest athletic traits.', primary: ['Acceleration', 'Power', 'Jump'] },
  { id: 'qb-pocket-power-base', name: 'Pocket Power Base', group: 'QB', description: 'A sturdier quarterback profile built around relative strength and explosive power.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'qb-spring-loaded-scrambler', name: 'Spring-Loaded Scrambler', group: 'QB', description: 'A springy quarterback athlete whose jump and burst scores lead the profile.', primary: ['Jump', 'Acceleration', 'Speed'] },
  { id: 'qb-sustained-motor', name: 'Sustained-Motor Quarterback', group: 'QB', description: 'A quarterback whose conditioning and pursuit testing suggest repeat-effort athleticism.', primary: ['Conditioning', 'Pursuit', 'Change of Direction'] },
  { id: 'qb-balanced-field-athlete', name: 'Balanced Field Athlete', group: 'QB', description: 'A quarterback with an even athletic profile and no single category dominating the result.', primary: balancedTraits, balanced: true },

  // Running backs
  { id: 'rb-home-run-accelerator', name: 'Home-Run Accelerator', group: 'RB', description: 'A running-back profile driven by top speed and rapid acceleration.', primary: ['Speed', 'Acceleration', 'Power'], size: 'light' },
  { id: 'rb-contact-power-runner', name: 'Contact-Power Runner', group: 'RB', description: 'A heavier back profile led by relative strength and explosive power.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'rb-one-cut-burst', name: 'One-Cut Burst Back', group: 'RB', description: 'A back whose acceleration and short-area change of direction separate the profile.', primary: ['Acceleration', 'Change of Direction', 'Speed'] },
  { id: 'rb-space-creation', name: 'Space-Creation Back', group: 'RB', description: 'A speed-and-agility back with strong open-space movement testing.', primary: ['Speed', 'Change of Direction', 'Pursuit'], size: 'light' },
  { id: 'rb-workhorse-engine', name: 'Workhorse Engine', group: 'RB', description: 'A repeat-effort back profile combining conditioning with strength.', primary: ['Conditioning', 'Strength', 'Pursuit'], size: 'heavy' },
  { id: 'rb-explosive-all-purpose', name: 'Explosive All-Purpose Back', group: 'RB', description: 'A balanced explosive back whose power and jump qualities lead the testing card.', primary: ['Power', 'Jump', 'Acceleration'] },

  // Wide receivers
  { id: 'wr-vertical-speed', name: 'Vertical Speed Threat', group: 'WR', description: 'A receiver athletic profile led by top speed and acceleration.', primary: ['Speed', 'Acceleration', 'Jump'], size: 'light' },
  { id: 'wr-sudden-separator', name: 'Sudden-Movement Receiver', group: 'WR', description: 'A receiver with standout short-area change of direction and burst.', primary: ['Change of Direction', 'Acceleration', 'Speed'] },
  { id: 'wr-high-point', name: 'High-Point Athlete', group: 'WR', description: 'A receiver profile built around vertical jump and explosive power.', primary: ['Jump', 'Power', 'Speed'], size: 'heavy' },
  { id: 'wr-yac-engine', name: 'Run-After-Catch Athlete', group: 'WR', description: 'A physically developed receiver profile combining acceleration, strength, and movement.', primary: ['Acceleration', 'Strength', 'Change of Direction'], size: 'heavy' },
  { id: 'wr-motion-engine', name: 'Endurance Motion Weapon', group: 'WR', description: 'A receiver whose conditioning and speed support repeated high-tempo movement.', primary: ['Conditioning', 'Speed', 'Pursuit'], size: 'light' },
  { id: 'wr-complete-perimeter', name: 'Complete Perimeter Athlete', group: 'WR', description: 'A receiver with a broad, balanced testing profile across the major athletic categories.', primary: balancedTraits, balanced: true },

  // Tight ends
  { id: 'te-seam-speed', name: 'Seam-Speed Hybrid', group: 'TE', description: 'A tight-end profile distinguished by speed and acceleration for the position group.', primary: ['Speed', 'Acceleration', 'Jump'], size: 'light' },
  { id: 'te-inline-power', name: 'In-Line Power Hybrid', group: 'TE', description: 'A larger tight end whose strength and power scores lead the profile.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'te-move-accelerator', name: 'Move-Tight-End Accelerator', group: 'TE', description: 'A mobile tight end with acceleration and change-of-direction strengths.', primary: ['Acceleration', 'Change of Direction', 'Speed'], size: 'light' },
  { id: 'te-high-point', name: 'High-Point Hybrid', group: 'TE', description: 'A springy tight-end profile led by jump and power testing.', primary: ['Jump', 'Power', 'Strength'] },
  { id: 'te-sustained-motor', name: 'Sustained-Motor Tight End', group: 'TE', description: 'A tight end whose conditioning and pursuit results support repeat-effort movement.', primary: ['Conditioning', 'Pursuit', 'Strength'] },
  { id: 'te-balanced-y', name: 'Balanced Y Hybrid', group: 'TE', description: 'A tight end with an even blend of movement, explosiveness, and strength.', primary: balancedTraits, balanced: true },

  // Offensive line
  { id: 'ol-first-step-mauler', name: 'First-Step Mauler', group: 'OL', description: 'An offensive lineman whose position-adjusted acceleration and strength lead the card.', primary: ['Acceleration', 'Strength', 'Power'], size: 'heavy' },
  { id: 'ol-road-grader', name: 'Road-Grader Power Base', group: 'OL', description: 'A powerful trench profile built around relative strength and explosive output.', primary: ['Power', 'Strength', 'Jump'], size: 'heavy' },
  { id: 'ol-pull-space', name: 'Pull-Space Lineman', group: 'OL', description: 'An offensive lineman with notable change of direction and acceleration for the group.', primary: ['Change of Direction', 'Acceleration', 'Pursuit'], size: 'light' },
  { id: 'ol-spring-drive', name: 'Spring-Drive Blocker', group: 'OL', description: 'A lineman whose jump and power measures indicate strong lower-body explosiveness.', primary: ['Jump', 'Power', 'Strength'] },
  { id: 'ol-high-motor-interior', name: 'High-Motor Interior', group: 'OL', description: 'A trench athlete led by conditioning, pursuit, and repeat-effort movement.', primary: ['Conditioning', 'Pursuit', 'Change of Direction'] },
  { id: 'ol-balanced-trench', name: 'Balanced Trench Athlete', group: 'OL', description: 'An offensive lineman with a well-rounded position-adjusted testing profile.', primary: balancedTraits, balanced: true },

  // Defensive line
  { id: 'dl-get-off-penetrator', name: 'Get-Off Penetrator', group: 'DL', description: 'A defensive lineman whose acceleration and power create the strongest testing signature.', primary: ['Acceleration', 'Power', 'Jump'], size: 'light' },
  { id: 'dl-power-anchor', name: 'Power Anchor', group: 'DL', description: 'A larger defensive lineman profile led by strength and power.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'dl-chase-down', name: 'Chase-Down Lineman', group: 'DL', description: 'A defensive lineman with standout pursuit and conditioning for sustained effort.', primary: ['Pursuit', 'Conditioning', 'Speed'], size: 'light' },
  { id: 'dl-edge-speed', name: 'Edge-Speed Rusher', group: 'DL', description: 'A defensive line profile distinguished by top speed and acceleration.', primary: ['Speed', 'Acceleration', 'Change of Direction'], size: 'light' },
  { id: 'dl-lateral-gap', name: 'Lateral Gap Hunter', group: 'DL', description: 'A lineman whose change of direction and acceleration lead his position profile.', primary: ['Change of Direction', 'Acceleration', 'Pursuit'] },
  { id: 'dl-explosive-disruptor', name: 'Explosive Trench Disruptor', group: 'DL', description: 'A springy defensive lineman profile led by jump and explosive power.', primary: ['Jump', 'Power', 'Strength'] },

  // Linebackers
  { id: 'lb-sideline-hunter', name: 'Sideline Hunter', group: 'LB', description: 'A linebacker profile led by speed and pursuit testing.', primary: ['Speed', 'Pursuit', 'Conditioning'], size: 'light' },
  { id: 'lb-downhill-thumper', name: 'Downhill Thumper', group: 'LB', description: 'A heavier linebacker whose acceleration and strength define the profile.', primary: ['Acceleration', 'Strength', 'Power'], size: 'heavy' },
  { id: 'lb-space-change', name: 'Space-Change Linebacker', group: 'LB', description: 'A linebacker with strong change-of-direction and speed scores for space play.', primary: ['Change of Direction', 'Speed', 'Pursuit'], size: 'light' },
  { id: 'lb-blitz-burst', name: 'Blitz-Burst Backer', group: 'LB', description: 'An explosive linebacker profile built around acceleration and power.', primary: ['Acceleration', 'Power', 'Jump'] },
  { id: 'lb-high-motor', name: 'High-Motor Tackler', group: 'LB', description: 'A linebacker whose conditioning and pursuit results lead the testing profile.', primary: ['Conditioning', 'Pursuit', 'Strength'] },
  { id: 'lb-explosive-box', name: 'Explosive Box Hybrid', group: 'LB', description: 'A linebacker with a jump-and-power-led profile supported by strength.', primary: ['Jump', 'Power', 'Strength'], size: 'heavy' },

  // Defensive backs
  { id: 'db-recovery-speed', name: 'Recovery-Speed Cover', group: 'DB', description: 'A defensive back profile driven by top speed and acceleration.', primary: ['Speed', 'Acceleration', 'Pursuit'], size: 'light' },
  { id: 'db-short-area-mirror', name: 'Short-Area Mirror', group: 'DB', description: 'A defensive back with standout change of direction and burst.', primary: ['Change of Direction', 'Acceleration', 'Speed'] },
  { id: 'db-range-pursuit', name: 'Range-Pursuit Safety', group: 'DB', description: 'A defensive back profile combining speed, pursuit, and conditioning.', primary: ['Speed', 'Pursuit', 'Conditioning'], size: 'heavy' },
  { id: 'db-ball-point', name: 'Explosive Ball-Point Athlete', group: 'DB', description: 'A springy defensive back whose jump and power results lead the profile.', primary: ['Jump', 'Power', 'Speed'] },
  { id: 'db-physical-perimeter', name: 'Physical Perimeter Defender', group: 'DB', description: 'A stronger defensive back profile combining relative strength and power.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'db-high-motor-nickel', name: 'High-Motor Nickel Athlete', group: 'DB', description: 'A defensive back with conditioning and short-area movement as leading traits.', primary: ['Conditioning', 'Change of Direction', 'Pursuit'], size: 'light' },

  // Specialists
  { id: 'kp-explosive-leg', name: 'Explosive-Leg Specialist', group: 'K/P', description: 'A specialist profile led by jump and power testing.', primary: ['Power', 'Jump', 'Strength'] },
  { id: 'kp-coverage-speed', name: 'Speed-Coverage Specialist', group: 'K/P', description: 'A specialist with speed and pursuit as the strongest measured traits.', primary: ['Speed', 'Pursuit', 'Acceleration'], size: 'light' },
  { id: 'kp-durable-dual', name: 'Durable Dual Specialist', group: 'K/P', description: 'A specialist profile centered on conditioning and relative strength.', primary: ['Conditioning', 'Strength', 'Power'], size: 'heavy' },
  { id: 'kp-mobile-placement', name: 'Mobile Placement Athlete', group: 'K/P', description: 'A specialist with change of direction and acceleration leading the profile.', primary: ['Change of Direction', 'Acceleration', 'Speed'] },
  { id: 'kp-balanced', name: 'Balanced Specialist', group: 'K/P', description: 'A specialist with a balanced athletic testing profile.', primary: balancedTraits, balanced: true },

  // Athletes / unassigned multi-position players
  { id: 'ath-swiss-army-accelerator', name: 'Swiss-Army Accelerator', group: 'ATH', description: 'A versatile athlete profile led by acceleration and change of direction.', primary: ['Acceleration', 'Change of Direction', 'Speed'] },
  { id: 'ath-speed-power', name: 'Speed-Power Weapon', group: 'ATH', description: 'A multi-position athlete combining top speed with explosive power.', primary: ['Speed', 'Power', 'Acceleration'] },
  { id: 'ath-space-movement', name: 'Space-Movement Athlete', group: 'ATH', description: 'A versatile athlete whose speed and change-of-direction scores stand out.', primary: ['Speed', 'Change of Direction', 'Pursuit'], size: 'light' },
  { id: 'ath-explosive-utility', name: 'Explosive Utility Athlete', group: 'ATH', description: 'A multi-position profile led by jump and power qualities.', primary: ['Jump', 'Power', 'Acceleration'] },
  { id: 'ath-high-motor', name: 'High-Motor Hybrid', group: 'ATH', description: 'A versatile athlete whose conditioning and pursuit scores lead the card.', primary: ['Conditioning', 'Pursuit', 'Change of Direction'] },
  { id: 'ath-strength-speed', name: 'Strength-Speed Converter', group: 'ATH', description: 'A bigger utility athlete pairing relative strength with acceleration and speed.', primary: ['Strength', 'Acceleration', 'Speed'], size: 'heavy' },
  { id: 'ath-balanced-multitool', name: 'Balanced Multi-Tool', group: 'ATH', description: 'A versatile athlete with no major athletic category separating from the rest.', primary: balancedTraits, balanced: true },
] as const

const SIZE_CENTER: Record<PositionGroup, number> = {
  QB: 190,
  RB: 180,
  WR: 170,
  TE: 220,
  OL: 265,
  DL: 245,
  LB: 205,
  DB: 170,
  'K/P': 175,
  ATH: 185,
}

function categoryIsAvailable(result: ComputedSession, category: Category): boolean {
  return METRICS_BY_CATEGORY(category).some(
    (metric) => typeof result.normalized[metric.key] === 'number',
  )
}

function sizeClass(result: ComputedSession, group: PositionGroup): Exclude<SizePreference, 'any'> {
  const weight = result.session.weightLbsSnapshot ?? result.athlete.weightLbs
  const difference = weight - SIZE_CENTER[group]
  if (difference <= -12) return 'light'
  if (difference >= 12) return 'heavy'
  return 'middle'
}

/** Relative strength has half influence when matching RB/WR/DB/ATH profiles. */
function categoryInfluence(group: PositionGroup, category: Category): number {
  return category === 'Strength' && isSpeedSkillGroup(group) ? 0.5 : 1
}

function fitScore(
  definition: ArchetypeDefinition,
  result: ComputedSession,
  available: readonly Category[],
): number {
  const availableSet = new Set(available)
  const availableValues = available.map((category) => result.categories[category])
  const mean = availableValues.reduce((sum, value) => sum + value, 0) / availableValues.length

  if (definition.balanced) {
    const spread = Math.max(...availableValues) - Math.min(...availableValues)
    return mean + Math.max(0, 14 - spread * 0.65)
  }

  const weights = [1, 0.68, 0.38]
  let weighted = 0
  let denominator = 0
  definition.primary.forEach((category, index) => {
    if (!availableSet.has(category)) return
    const weight = weights[index] ?? 0.25
    weighted += result.categories[category] * weight * categoryInfluence(definition.group, category)
    denominator += weight
  })

  // A definition with no measured priority traits should not beat one supported
  // by actual testing data.
  if (denominator === 0) return -1000

  const primary = definition.primary[0]
  const secondary = definition.primary[1]
  let specialization = 0
  if (primary && availableSet.has(primary)) {
    specialization += (result.categories[primary] - mean) * 0.24 * categoryInfluence(definition.group, primary)
  }
  if (secondary && availableSet.has(secondary)) {
    specialization += (result.categories[secondary] - mean) * 0.12 * categoryInfluence(definition.group, secondary)
  }

  const preference = definition.size ?? 'any'
  const measuredSize = sizeClass(result, definition.group)
  const sizeBonus = preference === 'any' ? 0 : preference === measuredSize ? 4 : -2
  const coverageBonus = denominator >= 1.68 ? 2 : 0

  return weighted / denominator + specialization + sizeBonus + coverageBonus
}

function confidenceFor(result: ComputedSession, availableCount: number): ArchetypeConfidence {
  if (result.scoreStatus === 'complete' || (result.completionPct >= 75 && availableCount >= 6)) return 'high'
  if (result.completionPct >= 40 || availableCount >= 3) return 'medium'
  return 'low'
}

/** Assign the best-fitting archetype for one athlete-season result. */
export function archetypeFor(result: ComputedSession): PlayerArchetype | undefined {
  const group = result.session.positionGroupSnapshot ?? result.athlete.positionGroup
  const available = CATEGORIES.filter((category) => categoryIsAvailable(result, category))
  if (available.length === 0) return undefined

  const definitions = ARCHETYPE_CATALOG.filter((definition) => definition.group === group)
  const winner = definitions
    .map((definition) => ({ definition, score: fitScore(definition, result, available) }))
    .sort((a, b) => b.score - a.score || a.definition.name.localeCompare(b.definition.name))[0]
    ?.definition

  if (!winner) return undefined

  const evidence = [...available]
    .sort((a, b) =>
      result.categories[b] * categoryInfluence(group, b)
      - result.categories[a] * categoryInfluence(group, a),
    )
    .slice(0, 3)
    .map((category) => `${category} ${Math.round(result.categories[category])}`)

  return {
    id: winner.id,
    name: winner.name,
    positionGroup: group,
    description: winner.description,
    primaryTraits: winner.primary,
    confidence: confidenceFor(result, available.length),
    evidence,
  }
}
