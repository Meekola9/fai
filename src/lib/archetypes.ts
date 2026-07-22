import { CATEGORIES } from '../data/constants'
import { isSpeedSkillGroup, METRICS_BY_CATEGORY } from '../data/scoring'
import type { Category, ComputedSession, PositionGroup } from '../types'

export type ArchetypeConfidence = 'high' | 'medium' | 'low'
export type ArchetypeRole =
  | 'QB'
  | 'RB'
  | 'WR'
  | 'TE'
  | 'OL'
  | 'DL'
  | 'EDGE'
  | 'LB'
  | 'CB'
  | 'S'
  | 'K/P'

type SizePreference = 'light' | 'middle' | 'heavy' | 'any'
type HeightPreference = 'short' | 'average' | 'tall' | 'any'

interface ArchetypeDefinition {
  id: string
  name: string
  /** Broad FAI benchmark group retained for compatibility. */
  group: PositionGroup
  /** Football role used for detailed archetype routing. */
  role: ArchetypeRole
  description: string
  primary: readonly Category[]
  size?: SizePreference
  height?: HeightPreference
  balanced?: boolean
  developmental?: boolean
}

export interface PlayerArchetype {
  id: string
  name: string
  positionGroup: PositionGroup
  role: ArchetypeRole
  description: string
  primaryTraits: readonly Category[]
  confidence: ArchetypeConfidence
  evidence: string[]
}

const balancedTraits: readonly Category[] = CATEGORIES

/**
 * The coach's 60 named football archetypes, plus five specialist fallbacks.
 *
 * Assignments are testing-profile projections. Names that imply technique,
 * football IQ, arm talent, ball skills, or production still require film
 * confirmation because those qualities are not measured by the combine.
 */
export const ARCHETYPE_CATALOG: readonly ArchetypeDefinition[] = [
  // Quarterback
  { id: 'qb-field-general', name: 'Field General', group: 'QB', role: 'QB', description: 'A balanced quarterback testing profile with no major athletic category separating from the rest; film must confirm command and processing.', primary: balancedTraits, balanced: true },
  { id: 'qb-gunslinger', name: 'Gunslinger', group: 'QB', role: 'QB', description: 'A powerful quarterback testing profile led by strength, power, and jump output; arm talent still requires film confirmation.', primary: ['Power', 'Strength', 'Jump'], size: 'heavy' },
  { id: 'qb-point-guard', name: 'Point Guard QB', group: 'QB', role: 'QB', description: 'A mobile quarterback profile led by change of direction, acceleration, and repeat-effort conditioning.', primary: ['Change of Direction', 'Acceleration', 'Conditioning'], size: 'light' },
  { id: 'qb-escape-artist', name: 'Escape Artist', group: 'QB', role: 'QB', description: 'A quarterback whose speed, short-area movement, and acceleration create the strongest athletic signature.', primary: ['Speed', 'Change of Direction', 'Acceleration'], size: 'light' },
  { id: 'qb-bulldozer', name: 'Bulldozer QB', group: 'QB', role: 'QB', description: 'A heavier quarterback profile built around relative strength, explosive power, and acceleration.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'qb-raw-cannon', name: 'Raw Cannon', group: 'QB', role: 'QB', description: 'A raw explosive quarterback profile led by jump, power, and speed; throwing traits are not measured by FAI.', primary: ['Jump', 'Power', 'Speed'], height: 'tall' },
  { id: 'qb-rhythm-passer', name: 'Rhythm Passer', group: 'QB', role: 'QB', description: 'A steady quarterback testing profile led by conditioning, acceleration, and pursuit-style repeat movement.', primary: ['Conditioning', 'Acceleration', 'Pursuit'], size: 'middle' },

  // Running back
  { id: 'rb-downhill-hammer', name: 'Downhill Hammer', group: 'RB', role: 'RB', description: 'A downhill back profile driven by acceleration, explosive power, and strength.', primary: ['Acceleration', 'Power', 'Strength'], size: 'heavy' },
  { id: 'rb-one-cut-slasher', name: 'One-Cut Slasher', group: 'RB', role: 'RB', description: 'A back whose acceleration and change of direction lead a decisive one-cut athletic profile.', primary: ['Acceleration', 'Change of Direction', 'Speed'] },
  { id: 'rb-satellite-back', name: 'Satellite Back', group: 'RB', role: 'RB', description: 'A lighter space athlete led by speed, change of direction, and conditioning.', primary: ['Speed', 'Change of Direction', 'Conditioning'], size: 'light' },
  { id: 'rb-bell-cow', name: 'Bell Cow', group: 'RB', role: 'RB', description: 'A durable testing profile combining conditioning, power, and strength for repeated workload.', primary: ['Conditioning', 'Power', 'Strength'], size: 'heavy' },
  { id: 'rb-jitterbug', name: 'Jitterbug', group: 'RB', role: 'RB', description: 'A sudden short-area athlete whose change of direction, acceleration, and speed dominate the card.', primary: ['Change of Direction', 'Acceleration', 'Speed'], size: 'light' },
  { id: 'rb-battering-ram', name: 'Battering Ram', group: 'RB', role: 'RB', description: 'A compact power profile led by strength, power, and jump output.', primary: ['Strength', 'Power', 'Jump'], size: 'heavy' },
  { id: 'rb-track-star-convert', name: 'Track Star Convert', group: 'RB', role: 'RB', description: 'A speed-first back profile led by top speed, acceleration, and jump ability.', primary: ['Speed', 'Acceleration', 'Jump'], size: 'light' },

  // Wide receiver
  { id: 'wr-field-stretcher', name: 'Field Stretcher', group: 'WR', role: 'WR', description: 'A receiver testing profile led by top speed, acceleration, and vertical explosiveness.', primary: ['Speed', 'Acceleration', 'Jump'], size: 'light' },
  { id: 'wr-chain-mover', name: 'Chain Mover', group: 'WR', role: 'WR', description: 'A repeatable movement profile combining conditioning, change of direction, and pursuit effort; route reliability requires film.', primary: ['Conditioning', 'Change of Direction', 'Pursuit'] },
  { id: 'wr-big-body-boundary', name: 'Big Body Boundary', group: 'WR', role: 'WR', description: 'A larger perimeter profile led by jump, power, and strength.', primary: ['Jump', 'Power', 'Strength'], size: 'heavy', height: 'tall' },
  { id: 'wr-route-technician', name: 'Route Technician', group: 'WR', role: 'WR', description: 'A receiver testing proxy led by change of direction, acceleration, and speed; route craft requires film confirmation.', primary: ['Change of Direction', 'Acceleration', 'Speed'] },
  { id: 'wr-yards-after-menace', name: 'Yards-After Menace', group: 'WR', role: 'WR', description: 'A physical movement profile combining acceleration, power, and change of direction.', primary: ['Acceleration', 'Power', 'Change of Direction'], size: 'heavy' },
  { id: 'wr-contested-catch-freak', name: 'Contested Catch Freak', group: 'WR', role: 'WR', description: 'A springy receiver profile led by jump, power, and strength; catch skill requires film.', primary: ['Jump', 'Power', 'Strength'], height: 'tall' },
  { id: 'wr-straight-line-blur', name: 'Straight Line Blur', group: 'WR', role: 'WR', description: 'A pure linear-speed profile led by top speed and acceleration.', primary: ['Speed', 'Acceleration', 'Power'], size: 'light' },
  { id: 'wr-gadget-weapon', name: 'Gadget Weapon', group: 'WR', role: 'WR', description: 'A versatile space-movement profile led by change of direction, speed, and acceleration.', primary: ['Change of Direction', 'Speed', 'Acceleration'], size: 'light' },

  // Tight end
  { id: 'te-move-piece', name: 'Move Piece', group: 'TE', role: 'TE', description: 'A mobile tight-end profile led by speed, change of direction, and acceleration.', primary: ['Speed', 'Change of Direction', 'Acceleration'], size: 'light' },
  { id: 'te-inline-mauler', name: 'In-Line Mauler', group: 'TE', role: 'TE', description: 'A heavier tight-end profile built around strength, power, and acceleration.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'te-seam-buster', name: 'Seam Buster', group: 'TE', role: 'TE', description: 'A vertical tight-end profile led by speed, acceleration, and jump ability.', primary: ['Speed', 'Acceleration', 'Jump'] },
  { id: 'te-basketball-body', name: 'Basketball Body', group: 'TE', role: 'TE', description: 'A tall springy tight-end profile led by jump and power output.', primary: ['Jump', 'Power', 'Speed'], height: 'tall' },
  { id: 'te-hybrid-h-back', name: 'Hybrid H-Back', group: 'TE', role: 'TE', description: 'A balanced hybrid profile combining conditioning, strength, and change of direction.', primary: ['Conditioning', 'Strength', 'Change of Direction'], size: 'middle' },

  // Offensive line
  { id: 'ol-anchor-tackle', name: 'Anchor Tackle', group: 'OL', role: 'OL', description: 'A sturdy offensive-line profile led by strength, power, and acceleration.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy', height: 'tall' },
  { id: 'ol-road-grader', name: 'Road Grader', group: 'OL', role: 'OL', description: 'A drive-blocking athletic profile led by power, strength, and jump output.', primary: ['Power', 'Strength', 'Jump'], size: 'heavy' },
  { id: 'ol-puller', name: 'Puller', group: 'OL', role: 'OL', description: 'A mobile lineman profile led by acceleration, change of direction, and pursuit movement.', primary: ['Acceleration', 'Change of Direction', 'Pursuit'], size: 'light' },
  { id: 'ol-pass-pro-technician', name: 'Pass Pro Technician', group: 'OL', role: 'OL', description: 'A testing proxy for controlled movement led by change of direction, acceleration, and strength; technique requires film.', primary: ['Change of Direction', 'Acceleration', 'Strength'], size: 'middle' },
  { id: 'ol-phone-booth-brawler', name: 'Phone Booth Brawler', group: 'OL', role: 'OL', description: 'A compact interior profile led by strength, power, and conditioning.', primary: ['Strength', 'Power', 'Conditioning'], size: 'heavy', height: 'short' },
  { id: 'ol-clay-frame', name: 'Clay Frame', group: 'OL', role: 'OL', description: 'A developmental offensive-line testing profile with a usable frame but no dominant measured category yet.', primary: balancedTraits, height: 'tall', developmental: true },
  { id: 'ol-space-eater', name: 'Space Eater', group: 'OL', role: 'OL', description: 'A large trench profile built around strength, conditioning, and power.', primary: ['Strength', 'Conditioning', 'Power'], size: 'heavy' },

  // Defensive line
  { id: 'dl-gap-plugger', name: 'Gap Plugger', group: 'DL', role: 'DL', description: 'A heavy interior profile led by strength, power, and conditioning.', primary: ['Strength', 'Power', 'Conditioning'], size: 'heavy' },
  { id: 'dl-penetrator', name: 'Penetrator', group: 'DL', role: 'DL', description: 'An explosive interior profile led by acceleration, power, and jump output.', primary: ['Acceleration', 'Power', 'Jump'], size: 'light' },
  { id: 'dl-bull-rusher', name: 'Bull Rusher', group: 'DL', role: 'DL', description: 'A force-based defensive-line profile led by strength, power, and acceleration.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'dl-bend-specialist', name: 'Bend Specialist', group: 'DL', role: 'DL', description: 'A movement-led defensive-line profile driven by change of direction, acceleration, and speed.', primary: ['Change of Direction', 'Acceleration', 'Speed'], size: 'light' },
  { id: 'dl-two-gapper', name: 'Two-Gapper', group: 'DL', role: 'DL', description: 'A sturdy repeat-effort interior profile combining strength, conditioning, and pursuit.', primary: ['Strength', 'Conditioning', 'Pursuit'], size: 'heavy' },
  { id: 'dl-twitch-freak', name: 'Twitch Freak', group: 'DL', role: 'DL', description: 'A sudden explosive profile led by acceleration, jump, and change of direction.', primary: ['Acceleration', 'Jump', 'Change of Direction'], size: 'light' },
  { id: 'dl-motor-guy', name: 'Motor Guy', group: 'DL', role: 'DL', description: 'A repeat-effort defensive-line profile led by conditioning, pursuit, and speed.', primary: ['Conditioning', 'Pursuit', 'Speed'] },

  // Edge / outside linebacker
  { id: 'edge-speed-rusher', name: 'Speed Rusher', group: 'LB', role: 'EDGE', description: 'An edge profile led by speed, acceleration, and change of direction.', primary: ['Speed', 'Acceleration', 'Change of Direction'], size: 'light' },
  { id: 'edge-power-convert', name: 'Power Convert', group: 'LB', role: 'EDGE', description: 'A heavier edge profile built around strength, power, and acceleration.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'edge-set-edge-setter', name: 'Set Edge Setter', group: 'LB', role: 'EDGE', description: 'A sturdy edge profile led by strength, pursuit, and conditioning.', primary: ['Strength', 'Pursuit', 'Conditioning'], size: 'heavy' },
  { id: 'edge-length-freak', name: 'Length Freak', group: 'LB', role: 'EDGE', description: 'A tall explosive edge profile led by jump, speed, and power.', primary: ['Jump', 'Speed', 'Power'], height: 'tall' },
  { id: 'edge-chase-athlete', name: 'Chase Athlete', group: 'LB', role: 'EDGE', description: 'A pursuit-oriented edge profile led by pursuit, speed, and conditioning.', primary: ['Pursuit', 'Speed', 'Conditioning'], size: 'light' },

  // Linebacker
  { id: 'lb-downhill-thumper', name: 'Downhill Thumper', group: 'LB', role: 'LB', description: 'A downhill linebacker profile led by acceleration, strength, and power.', primary: ['Acceleration', 'Strength', 'Power'], size: 'heavy' },
  { id: 'lb-sideline-to-sideline', name: 'Sideline-to-Sideline', group: 'LB', role: 'LB', description: 'A range profile led by speed, pursuit, and conditioning.', primary: ['Speed', 'Pursuit', 'Conditioning'], size: 'light' },
  { id: 'lb-coverage-backer', name: 'Coverage Backer', group: 'LB', role: 'LB', description: 'A space-linebacker testing profile led by change of direction, speed, and acceleration.', primary: ['Change of Direction', 'Speed', 'Acceleration'], size: 'light' },
  { id: 'lb-green-dot', name: 'Green Dot', group: 'LB', role: 'LB', description: 'A balanced linebacker testing profile; communication and diagnostic skill require film and practice evaluation.', primary: balancedTraits, balanced: true },
  { id: 'lb-blitz-specialist', name: 'Blitz Specialist', group: 'LB', role: 'LB', description: 'An explosive linebacker profile led by acceleration, power, and jump output.', primary: ['Acceleration', 'Power', 'Jump'] },
  { id: 'lb-undersized-missile', name: 'Undersized Missile', group: 'LB', role: 'LB', description: 'A lighter high-velocity linebacker profile led by acceleration, pursuit, and speed.', primary: ['Acceleration', 'Pursuit', 'Speed'], size: 'light' },

  // Cornerback
  { id: 'cb-press-bully', name: 'Press Bully', group: 'DB', role: 'CB', description: 'A physical corner profile led by strength, power, and acceleration; press technique requires film.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 'cb-off-man-mirror', name: 'Off-Man Mirror', group: 'DB', role: 'CB', description: 'A corner movement profile led by change of direction, acceleration, and speed.', primary: ['Change of Direction', 'Acceleration', 'Speed'] },
  { id: 'cb-ball-hawk', name: 'Ball Hawk', group: 'DB', role: 'CB', description: 'A springy range profile led by jump, speed, and pursuit; ball production requires film.', primary: ['Jump', 'Speed', 'Pursuit'] },
  { id: 'cb-sticky-feet', name: 'Sticky Feet', group: 'DB', role: 'CB', description: 'A sudden corner profile led by change of direction, acceleration, and pursuit movement.', primary: ['Change of Direction', 'Acceleration', 'Pursuit'], size: 'light' },
  { id: 'cb-long-strider', name: 'Long Strider', group: 'DB', role: 'CB', description: 'A taller speed profile led by top speed, jump ability, and acceleration.', primary: ['Speed', 'Jump', 'Acceleration'], height: 'tall' },

  // Safety
  { id: 's-center-field-eraser', name: 'Center Field Eraser', group: 'DB', role: 'S', description: 'A range-safety profile led by speed, pursuit, and jump ability.', primary: ['Speed', 'Pursuit', 'Jump'] },
  { id: 's-box-enforcer', name: 'Box Enforcer', group: 'DB', role: 'S', description: 'A physical safety profile led by strength, power, and acceleration.', primary: ['Strength', 'Power', 'Acceleration'], size: 'heavy' },
  { id: 's-nickel-chess-piece', name: 'Nickel Chess Piece', group: 'DB', role: 'S', description: 'A versatile short-area defensive-back profile led by change of direction, acceleration, and conditioning.', primary: ['Change of Direction', 'Acceleration', 'Conditioning'], size: 'middle' },

  // Specialist fallbacks — retained because the supplied list did not include K/P.
  { id: 'kp-explosive-leg', name: 'Explosive-Leg Specialist', group: 'K/P', role: 'K/P', description: 'A specialist profile led by power, jump, and strength.', primary: ['Power', 'Jump', 'Strength'] },
  { id: 'kp-coverage-speed', name: 'Speed-Coverage Specialist', group: 'K/P', role: 'K/P', description: 'A specialist profile led by speed, pursuit, and acceleration.', primary: ['Speed', 'Pursuit', 'Acceleration'], size: 'light' },
  { id: 'kp-durable-dual', name: 'Durable Dual Specialist', group: 'K/P', role: 'K/P', description: 'A specialist profile centered on conditioning, strength, and power.', primary: ['Conditioning', 'Strength', 'Power'], size: 'heavy' },
  { id: 'kp-mobile-placement', name: 'Mobile Placement Athlete', group: 'K/P', role: 'K/P', description: 'A specialist movement profile led by change of direction, acceleration, and speed.', primary: ['Change of Direction', 'Acceleration', 'Speed'] },
  { id: 'kp-balanced', name: 'Balanced Specialist', group: 'K/P', role: 'K/P', description: 'A specialist with a balanced athletic testing profile.', primary: balancedTraits, balanced: true },
] as const

const WEIGHT_CENTER: Record<ArchetypeRole, number> = {
  QB: 190,
  RB: 180,
  WR: 170,
  TE: 220,
  OL: 265,
  DL: 245,
  EDGE: 215,
  LB: 205,
  CB: 170,
  S: 185,
  'K/P': 175,
}

const HEIGHT_CENTER: Record<ArchetypeRole, number> = {
  QB: 72,
  RB: 69,
  WR: 71,
  TE: 75,
  OL: 75,
  DL: 74,
  EDGE: 74,
  LB: 72,
  CB: 71,
  S: 72,
  'K/P': 72,
}

function categoryIsAvailable(result: ComputedSession, category: Category): boolean {
  return METRICS_BY_CATEGORY(category).some(
    (metric) => typeof result.normalized[metric.key] === 'number',
  )
}

function sizeClass(
  result: ComputedSession,
  role: ArchetypeRole,
): Exclude<SizePreference, 'any'> {
  const snapshotWeight = result.session.weightLbsSnapshot
  const weight =
    typeof snapshotWeight === 'number' && snapshotWeight > 0
      ? snapshotWeight
      : result.athlete.weightLbs
  if (!weight || weight <= 0) return 'middle'
  const difference = weight - WEIGHT_CENTER[role]
  if (difference <= -12) return 'light'
  if (difference >= 12) return 'heavy'
  return 'middle'
}

function heightClass(
  result: ComputedSession,
  role: ArchetypeRole,
): Exclude<HeightPreference, 'any'> {
  const height = result.athlete.heightIn
  if (!height || height <= 0) return 'average'
  const difference = height - HEIGHT_CENTER[role]
  if (difference <= -2) return 'short'
  if (difference >= 2) return 'tall'
  return 'average'
}

/** Relative strength has half influence when matching RB/WR/DB/ATH profiles. */
function categoryInfluence(group: PositionGroup, category: Category): number {
  return category === 'Strength' && isSpeedSkillGroup(group) ? 0.5 : 1
}

function normalizedPosition(result: ComputedSession): string {
  return `${result.athlete.position ?? ''} ${result.session.positionSnapshot ?? ''}`
    .toUpperCase()
    .replace(/[^A-Z0-9/ -]+/g, ' ')
}

function hasPosition(position: string, pattern: RegExp): boolean {
  return pattern.test(position)
}

function uniqueRoles(roles: ArchetypeRole[]): ArchetypeRole[] {
  return [...new Set(roles)]
}

function rolesFromPosition(position: string): ArchetypeRole[] {
  const roles: ArchetypeRole[] = []
  if (hasPosition(position, /\bQB\b|QUARTERBACK/)) roles.push('QB')
  if (hasPosition(position, /\bRB\b|\bHB\b|\bFB\b|RUNNING BACK/)) roles.push('RB')
  if (hasPosition(position, /\bWR\b|\bSLOT\b|RECEIVER/)) roles.push('WR')
  if (hasPosition(position, /\bTE\b|\bH-?BACK\b|TIGHT END/)) roles.push('TE')
  const defensiveInterior = hasPosition(
    position,
    /\bDT\b|\bNT\b|\bDL\b|DEFENSIVE TACKLE|NOSE/,
  )
  if (
    hasPosition(position, /\bOT\b|\bOG\b|\bOL\b|\bLT\b|\bRT\b|\bLG\b|\bRG\b|\bC\b|OFFENSIVE TACKLE|GUARD|CENTER/)
    || (hasPosition(position, /TACKLE/) && !defensiveInterior)
  ) {
    roles.push('OL')
  }
  if (defensiveInterior) roles.push('DL')

  const edge = hasPosition(
    position,
    /\bEDGE\b|\bDE\b|\bOLB\b|\bJACK\b|\bRUSH\b|OUTSIDE LINEBACKER|DEFENSIVE END/,
  )
  if (edge) roles.push('EDGE')
  if (
    hasPosition(position, /\bMLB\b|\bILB\b|\bLB\b|INSIDE LINEBACKER|MIDDLE LINEBACKER/)
    || (hasPosition(position, /LINEBACKER/) && !edge)
  ) {
    roles.push('LB')
  }

  if (hasPosition(position, /\bCB\b|CORNER/)) roles.push('CB')
  if (hasPosition(position, /\bFS\b|\bSS\b|\bS\b|\bSTAR\b|\bNICKEL\b|SAFETY/)) roles.push('S')
  if (hasPosition(position, /\bK\b|\bP\b|KICKER|PUNTER/)) roles.push('K/P')
  return uniqueRoles(roles)
}

function archetypeRolesFor(result: ComputedSession): ArchetypeRole[] {
  const group = result.session.positionGroupSnapshot ?? result.athlete.positionGroup
  const position = normalizedPosition(result)

  if (group === 'QB') return ['QB']
  if (group === 'RB') return ['RB']
  if (group === 'WR') return ['WR']
  if (group === 'TE') return ['TE']
  if (group === 'OL') return ['OL']
  if (group === 'K/P') return ['K/P']

  if (group === 'DL') {
    return hasPosition(position, /\bEDGE\b|\bDE\b|\bOLB\b|\bJACK\b|\bRUSH\b|OUTSIDE LINEBACKER|DEFENSIVE END/)
      ? ['EDGE']
      : ['DL']
  }

  if (group === 'LB') {
    return hasPosition(position, /\bEDGE\b|\bDE\b|\bOLB\b|\bJACK\b|\bRUSH\b|OUTSIDE LINEBACKER|DEFENSIVE END/)
      ? ['EDGE']
      : ['LB']
  }

  if (group === 'DB') {
    const detailed = rolesFromPosition(position).filter(
      (role): role is 'CB' | 'S' => role === 'CB' || role === 'S',
    )
    return detailed.length ? detailed : ['CB', 'S']
  }

  // ATH borrows from the supplied position families. A listed position wins;
  // a generic ATH record is evaluated across the movable skill/defense roles.
  const detailed = rolesFromPosition(position).filter((role) => role !== 'K/P')
  return detailed.length ? detailed : ['RB', 'WR', 'EDGE', 'LB', 'CB', 'S']
}

function weightedMean(
  result: ComputedSession,
  available: readonly Category[],
  group: PositionGroup,
): number {
  let weighted = 0
  let denominator = 0
  for (const category of available) {
    const influence = categoryInfluence(group, category)
    weighted += result.categories[category] * influence
    denominator += influence
  }
  return denominator > 0 ? weighted / denominator : 0
}

function fitScore(
  definition: ArchetypeDefinition,
  result: ComputedSession,
  available: readonly Category[],
  group: PositionGroup,
): number {
  const availableSet = new Set(available)
  const mean = weightedMean(result, available, group)

  const sizePreference = definition.size ?? 'any'
  const measuredSize = sizeClass(result, definition.role)
  const sizeBonus =
    sizePreference === 'any' ? 0 : sizePreference === measuredSize ? 4 : -2

  const heightPreference = definition.height ?? 'any'
  const measuredHeight = heightClass(result, definition.role)
  const heightBonus =
    heightPreference === 'any' ? 0 : heightPreference === measuredHeight ? 3 : -1.5

  if (definition.developmental) {
    return 100 - mean + sizeBonus + heightBonus
  }

  if (definition.balanced) {
    const adjustedValues = available.map(
      (category) => result.categories[category] * categoryInfluence(group, category),
    )
    const spread = Math.max(...adjustedValues) - Math.min(...adjustedValues)
    return mean + Math.max(0, 14 - spread * 0.65) + sizeBonus + heightBonus
  }

  const priorityWeights = [1, 0.68, 0.38]
  let weighted = 0
  let denominator = 0
  definition.primary.forEach((category, index) => {
    if (!availableSet.has(category)) return
    const priorityWeight = priorityWeights[index] ?? 0.25
    weighted +=
      result.categories[category]
      * priorityWeight
      * categoryInfluence(group, category)
    denominator += priorityWeight
  })

  if (denominator === 0) return -1000

  const primary = definition.primary[0]
  const secondary = definition.primary[1]
  let specialization = 0
  if (primary && availableSet.has(primary)) {
    specialization +=
      (result.categories[primary] - mean)
      * 0.24
      * categoryInfluence(group, primary)
  }
  if (secondary && availableSet.has(secondary)) {
    specialization +=
      (result.categories[secondary] - mean)
      * 0.12
      * categoryInfluence(group, secondary)
  }

  const coverageBonus = denominator >= 1.68 ? 2 : 0
  return weighted / denominator + specialization + sizeBonus + heightBonus + coverageBonus
}

function confidenceFor(
  result: ComputedSession,
  availableCount: number,
): ArchetypeConfidence {
  if (result.scoreStatus === 'complete' || (result.completionPct >= 75 && availableCount >= 6)) {
    return 'high'
  }
  if (result.completionPct >= 40 || availableCount >= 3) return 'medium'
  return 'low'
}

/** Assign the best-fitting coach-named archetype for one athlete-season result. */
export function archetypeFor(result: ComputedSession): PlayerArchetype | undefined {
  const group = result.session.positionGroupSnapshot ?? result.athlete.positionGroup
  const available = CATEGORIES.filter((category) => categoryIsAvailable(result, category))
  if (available.length === 0) return undefined

  const roles = archetypeRolesFor(result)
  const definitions = ARCHETYPE_CATALOG.filter((definition) => roles.includes(definition.role))
  const winner = definitions
    .map((definition) => ({
      definition,
      score: fitScore(definition, result, available, group),
    }))
    .sort((a, b) => b.score - a.score || a.definition.name.localeCompare(b.definition.name))[0]
    ?.definition

  if (!winner) return undefined

  const evidence = [...available]
    .sort(
      (a, b) =>
        result.categories[b] * categoryInfluence(group, b)
        - result.categories[a] * categoryInfluence(group, a),
    )
    .slice(0, 3)
    .map((category) => `${category} ${Math.round(result.categories[category])}`)

  return {
    id: winner.id,
    name: winner.name,
    positionGroup: group,
    role: winner.role,
    description: winner.description,
    primaryTraits: winner.primary,
    confidence: confidenceFor(result, available.length),
    evidence,
  }
}
