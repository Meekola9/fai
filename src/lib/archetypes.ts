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
type ReceiverProfileRule =
  | 'field-stretcher'
  | 'chain-mover'
  | 'big-body-boundary'
  | 'route-technician'
  | 'yards-after-menace'
  | 'contested-catch-freak'
  | 'straight-line-blur'
  | 'gadget-weapon'

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
  /** Receiver-only profile rule used to separate overlapping WR trait combinations. */
  receiverProfile?: ReceiverProfileRule
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
  { id: 'wr-field-stretcher', name: 'Field Stretcher', group: 'WR', role: 'WR', description: 'A receiver testing profile led by top speed, acceleration, and vertical explosiveness.', primary: ['Speed', 'Acceleration', 'Jump'], size: 'light', receiverProfile: 'field-stretcher' },
  { id: 'wr-chain-mover', name: 'Chain Mover', group: 'WR', role: 'WR', description: 'A repeatable movement profile combining conditioning, change of direction, and pursuit effort; route reliability requires film.', primary: ['Conditioning', 'Change of Direction', 'Pursuit'], receiverProfile: 'chain-mover' },
  { id: 'wr-big-body-boundary', name: 'Big Body Boundary', group: 'WR', role: 'WR', description: 'A larger perimeter profile led by power, strength, and useful jump output.', primary: ['Power', 'Strength', 'Jump'], size: 'heavy', height: 'tall', receiverProfile: 'big-body-boundary' },
  { id: 'wr-route-technician', name: 'Route Technician', group: 'WR', role: 'WR', description: 'A receiver testing proxy led by change of direction that clearly separates from linear speed; route craft requires film confirmation.', primary: ['Change of Direction', 'Acceleration', 'Speed'], receiverProfile: 'route-technician' },
  { id: 'wr-yards-after-menace', name: 'Yards-After Menace', group: 'WR', role: 'WR', description: 'A physical movement profile where acceleration, power, and change of direction rise together.', primary: ['Acceleration', 'Power', 'Change of Direction'], size: 'heavy', receiverProfile: 'yards-after-menace' },
  { id: 'wr-contested-catch-freak', name: 'Contested Catch Freak', group: 'WR', role: 'WR', description: 'A tall springy receiver whose jump score clearly separates from the rest of the physical profile; catch skill requires film.', primary: ['Jump', 'Power', 'Strength'], height: 'tall', receiverProfile: 'contested-catch-freak' },
  { id: 'wr-straight-line-blur', name: 'Straight Line Blur', group: 'WR', role: 'WR', description: 'A pure linear-speed profile where top speed clearly separates from change of direction and jump output.', primary: ['Speed', 'Acceleration', 'Power'], size: 'light', receiverProfile: 'straight-line-blur' },
  { id: 'wr-gadget-weapon', name: 'Gadget Weapon', group: 'WR', role: 'WR', description: 'A versatile space-movement profile with closely balanced change of direction, speed, and acceleration.', primary: ['Change of Direction', 'Speed', 'Acceleration'], size: 'light', receiverProfile: 'gadget-weapon' },

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
    hasPosition(position, /\bMLB\b|\bILB\b|\bLB\b|\bSTAR\b|INSIDE LINEBACKER|MIDDLE LINEBACKER/)
    || (hasPosition(position, /LINEBACKER/) && !edge)
  ) {
    roles.push('LB')
  }

  if (hasPosition(position, /\bCB\b|CORNER/)) roles.push('CB')
  if (hasPosition(position, /\bFS\b|\bSS\b|\bS\b|\bROVER\b|\bNICKEL\b|SAFETY/)) roles.push('S')
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

function receiverProfileAdjustment(
  definition: ArchetypeDefinition,
  result: ComputedSession,
  available: readonly Category[],
  mean: number,
): number {
  if (definition.role !== 'WR' || !definition.receiverProfile) return 0

  const availableSet = new Set(available)
  const score = (category: Category): number =>
    availableSet.has(category) ? result.categories[category] : mean
  const has = (...categories: Category[]): boolean =>
    categories.every((category) => availableSet.has(category))

  const speed = score('Speed')
  const acceleration = score('Acceleration')
  const jump = score('Jump')
  const power = score('Power')
  const pursuit = score('Pursuit')
  const changeOfDirection = score('Change of Direction')
  const conditioning = score('Conditioning')
  const strength = score('Strength')
  const relative = (value: number): number => value - mean

  switch (definition.receiverProfile) {
    case 'field-stretcher': {
      let adjustment =
        relative(speed) * 0.30
        + relative(acceleration) * 0.20
        + relative(jump) * 0.45
      if (has('Speed', 'Change of Direction', 'Jump') && speed >= changeOfDirection + 5 && jump >= mean + 5) adjustment += 8
      if (has('Speed', 'Jump') && jump >= speed - 12) adjustment += 4
      if (has('Speed') && speed < mean) adjustment -= 5
      return adjustment
    }
    case 'straight-line-blur': {
      let adjustment =
        relative(speed) * 0.65
        + relative(acceleration) * 0.25
        - relative(changeOfDirection) * 0.25
        - relative(jump) * 0.18
      if (has('Speed', 'Change of Direction') && speed >= changeOfDirection + 12) adjustment += 8
      if (has('Speed', 'Jump') && speed >= jump + 15) adjustment += 5
      if (has('Speed', 'Jump') && jump >= speed - 10) adjustment -= 6
      return adjustment
    }
    case 'route-technician': {
      let adjustment =
        relative(changeOfDirection) * 0.55
        + relative(acceleration) * 0.30
        + relative(speed) * 0.10
      if (has('Change of Direction', 'Speed') && changeOfDirection >= speed + 6) adjustment += 6
      if (has('Change of Direction') && changeOfDirection < mean) adjustment -= 5
      return adjustment
    }
    case 'gadget-weapon': {
      let adjustment =
        relative(changeOfDirection) * 0.32
        + relative(speed) * 0.30
        + relative(acceleration) * 0.28
      if (has('Change of Direction', 'Speed', 'Acceleration')) {
        const spread = Math.max(changeOfDirection, speed, acceleration) - Math.min(changeOfDirection, speed, acceleration)
        if (spread <= 8) adjustment += 7
        else if (spread <= 12) adjustment += 3
      }
      if (has('Power', 'Change of Direction', 'Speed', 'Acceleration') && power > Math.max(changeOfDirection, speed, acceleration) + 5) adjustment -= 4
      return adjustment
    }
    case 'big-body-boundary': {
      let adjustment =
        relative(power) * 0.30
        + relative(strength) * 0.125
        + relative(jump) * 0.18
      if (sizeClass(result, 'WR') === 'heavy' && heightClass(result, 'WR') === 'tall') adjustment += 7
      if (has('Jump', 'Power') && jump >= power + 10) adjustment -= 6
      return adjustment
    }
    case 'contested-catch-freak': {
      let adjustment =
        relative(jump) * 0.65
        + relative(power) * 0.18
        + relative(strength) * 0.04
      if (has('Jump', 'Power', 'Strength') && jump >= Math.max(power, strength) + 8) adjustment += 8
      if (heightClass(result, 'WR') === 'tall') adjustment += 3
      return adjustment
    }
    case 'yards-after-menace': {
      let adjustment =
        relative(acceleration) * 0.35
        + relative(power) * 0.32
        + relative(changeOfDirection) * 0.30
      if (has('Acceleration', 'Power', 'Change of Direction') && Math.min(acceleration, power, changeOfDirection) >= mean) adjustment += 6
      if (has('Power', 'Speed') && power > speed) adjustment += 3
      return adjustment
    }
    case 'chain-mover': {
      let adjustment =
        relative(conditioning) * 0.42
        + relative(changeOfDirection) * 0.30
        + relative(pursuit) * 0.25
      if (has('Conditioning', 'Speed', 'Pursuit') && conditioning >= speed && pursuit >= mean) adjustment += 6
      if (
        has('Speed', 'Acceleration', 'Conditioning', 'Pursuit')
        && (speed + acceleration) / 2 > (conditioning + pursuit) / 2 + 10
      ) adjustment -= 5
      return adjustment
    }
  }
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

  // Specialization rewards an archetype whose primary traits are this athlete's
  // relative peaks (value above their own mean), not just high absolute scores.
  // Keying off the shape of the card — instead of who has the biggest overall
  // numbers — spreads assignments across the catalog so two players at the same
  // position with different standout traits land on different archetypes.
  let specialization = 0
  definition.primary.forEach((category, index) => {
    const weight = SPECIALIZATION_WEIGHTS[index]
    if (weight === undefined || !availableSet.has(category)) return
    specialization +=
      (result.categories[category] - mean) * weight * categoryInfluence(group, category)
  })

  const coverageBonus = denominator >= 1.68 ? 2 : 0
  const profileAdjustment = receiverProfileAdjustment(definition, result, available, mean)
  return weighted / denominator + specialization + sizeBonus + heightBonus + coverageBonus + profileAdjustment
}

/** Priority weighting for how strongly each primary trait shapes the match. */
const SPECIALIZATION_WEIGHTS = [0.55, 0.3, 0.15]

/**
 * How distinctive an archetype's lead trait is for this athlete — the amount
 * that trait sits above their own mean. Used only to break near-ties, so the
 * winner keys off the athlete's biggest relative peak instead of alphabetical
 * order (which used to funnel similar cards onto the same few archetypes).
 */
function primaryEdge(
  definition: ArchetypeDefinition,
  result: ComputedSession,
  available: readonly Category[],
  group: PositionGroup,
): number {
  if (definition.balanced || definition.developmental) return -Infinity
  const lead = definition.primary[0]
  if (!lead || !available.includes(lead)) return -Infinity
  const mean = weightedMean(result, available, group)
  return (result.categories[lead] - mean) * categoryInfluence(group, lead)
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
      edge: primaryEdge(definition, result, available, group),
    }))
    .sort(
      (a, b) =>
        b.score - a.score
        || b.edge - a.edge
        || a.definition.name.localeCompare(b.definition.name),
    )[0]
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
