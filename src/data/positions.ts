import type { Athlete, PlayerUsage, PositionGroup } from '../types'

export interface PositionOption {
  value: string
  group: PositionGroup
  description: string
  special?: boolean
}

export const PLAYER_USAGE_OPTIONS: readonly {
  value: PlayerUsage
  label: string
  description: string
}[] = [
  {
    value: 'one-way',
    label: 'One Way',
    description: 'Primary position only.',
  },
  {
    value: 'two-way',
    label: 'Two Way',
    description: 'Regular offensive and defensive role.',
  },
  {
    value: 'iron-man',
    label: 'Iron Man',
    description: 'Expected to stay on the field for nearly every meaningful snap.',
  },
]

/**
 * Coach-facing football positions. Special program terminology is kept beside
 * common positions so roster entry stays fast without losing custom text entry.
 */
export const POSITION_OPTIONS: readonly PositionOption[] = [
  { value: 'QB', group: 'QB', description: 'Quarterback' },

  { value: 'RB', group: 'RB', description: 'Running back' },
  { value: 'HB', group: 'RB', description: 'Halfback' },
  { value: 'FB', group: 'RB', description: 'Fullback' },

  { value: 'WR', group: 'WR', description: 'Wide receiver' },
  { value: 'X', group: 'WR', description: 'Boundary or isolated receiver' },
  { value: 'Z', group: 'WR', description: 'Movement receiver' },
  { value: 'Slot WR', group: 'WR', description: 'Inside receiver' },
  { value: 'H', group: 'WR', description: 'Slot receiver in this system', special: true },

  { value: 'TE', group: 'TE', description: 'Tight end' },
  { value: 'Y', group: 'TE', description: 'Attached tight end' },
  {
    value: 'B Back',
    group: 'TE',
    description: 'Tight end / fullback hybrid',
    special: true,
  },

  { value: 'LT', group: 'OL', description: 'Left tackle' },
  { value: 'LG', group: 'OL', description: 'Left guard' },
  { value: 'C', group: 'OL', description: 'Center' },
  { value: 'RG', group: 'OL', description: 'Right guard' },
  { value: 'RT', group: 'OL', description: 'Right tackle' },
  { value: 'OL', group: 'OL', description: 'Offensive line' },

  { value: 'DT', group: 'DL', description: 'Defensive tackle' },
  { value: 'NT', group: 'DL', description: 'Nose tackle' },
  { value: 'DE', group: 'DL', description: 'Defensive end' },
  { value: 'EDGE', group: 'DL', description: 'Edge defender' },
  {
    value: 'Jack',
    group: 'DL',
    description: 'Speed edge defensive lineman',
    special: true,
  },

  { value: 'Mike', group: 'LB', description: 'Middle linebacker', special: true },
  { value: 'Will', group: 'LB', description: 'Weak-side linebacker', special: true },
  { value: 'Sam', group: 'LB', description: 'Strong-side linebacker' },
  { value: 'ILB', group: 'LB', description: 'Inside linebacker' },
  { value: 'OLB', group: 'LB', description: 'Outside linebacker' },
  {
    value: 'Rover',
    group: 'LB',
    description: 'Linebacker / safety hybrid',
    special: true,
  },

  { value: 'CB', group: 'DB', description: 'Cornerback' },
  {
    value: 'Boundary Corner',
    group: 'DB',
    description: 'Corner aligned to the short side of the field',
    special: true,
  },
  {
    value: 'Field Corner',
    group: 'DB',
    description: 'Corner aligned to the wide side of the field',
    special: true,
  },
  {
    value: 'Star',
    group: 'DB',
    description: 'Nickel / overhang defensive back',
    special: true,
  },
  { value: 'FS', group: 'DB', description: 'Free safety' },
  { value: 'SS', group: 'DB', description: 'Strong safety' },
  {
    value: 'Badger',
    group: 'DB',
    description: 'Free-safety role in this system',
    special: true,
  },
  { value: 'Nickel', group: 'DB', description: 'Slot defensive back' },

  { value: 'K', group: 'K/P', description: 'Kicker' },
  { value: 'P', group: 'K/P', description: 'Punter' },
  { value: 'LS', group: 'K/P', description: 'Long snapper' },

  { value: 'ATH', group: 'ATH', description: 'Athlete / role not assigned' },
]

const NORMALIZED_OPTIONS = new Map(
  POSITION_OPTIONS.map((option) => [normalizePosition(option.value), option]),
)

const POSITION_ALIASES: Record<string, PositionGroup> = {
  QUARTERBACK: 'QB',
  RUNNINGBACK: 'RB',
  HALFBACK: 'RB',
  FULLBACK: 'RB',
  RECEIVER: 'WR',
  WIDERECEIVER: 'WR',
  SLOT: 'WR',
  SLOTRECEIVER: 'WR',
  TIGHTEND: 'TE',
  BBACK: 'TE',
  HBACK: 'TE',
  OFFENSIVELINE: 'OL',
  OFFENSIVETACKLE: 'OL',
  GUARD: 'OL',
  CENTER: 'OL',
  DEFENSIVELINE: 'DL',
  DEFENSIVEEND: 'DL',
  DEFENSIVETACKLE: 'DL',
  NOSETACKLE: 'DL',
  JACK: 'DL',
  LINEBACKER: 'LB',
  MIDDLELINEBACKER: 'LB',
  INSIDELINEBACKER: 'LB',
  OUTSIDELINEBACKER: 'LB',
  MIKE: 'LB',
  WILL: 'LB',
  ROVER: 'LB',
  DEFENSIVEBACK: 'DB',
  CORNER: 'DB',
  CORNERBACK: 'DB',
  BOUNDARYCORNER: 'DB',
  FIELDCORNER: 'DB',
  SAFETY: 'DB',
  FREESAFETY: 'DB',
  STRONGSAFETY: 'DB',
  STAR: 'DB',
  BADGER: 'DB',
  NICKEL: 'DB',
  KICKER: 'K/P',
  PUNTER: 'K/P',
  LONGSNAPPER: 'K/P',
  ATHLETE: 'ATH',
}

export function normalizePosition(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '')
}

export function positionOptionFor(value?: string): PositionOption | undefined {
  if (!value) return undefined
  return NORMALIZED_OPTIONS.get(normalizePosition(value))
}

export function positionGroupFor(
  value: string | undefined,
  fallback: PositionGroup = 'ATH',
): PositionGroup {
  if (!value) return fallback
  const normalized = normalizePosition(value)
  return NORMALIZED_OPTIONS.get(normalized)?.group ?? POSITION_ALIASES[normalized] ?? fallback
}

export function normalizePlayerUsage(value: unknown): PlayerUsage {
  const normalized = String(value ?? '').toLowerCase().replace(/[_\s]+/g, '-')
  if (normalized === 'two-way' || normalized === 'twoway' || normalized === '2-way') return 'two-way'
  if (normalized === 'iron-man' || normalized === 'ironman') return 'iron-man'
  return 'one-way'
}

export function usageLabel(value?: PlayerUsage): string {
  return PLAYER_USAGE_OPTIONS.find((option) => option.value === (value ?? 'one-way'))?.label ?? 'One Way'
}

export function athletePositionLine(athlete: Athlete): string {
  const primary = athlete.position || athlete.positionGroup
  if ((athlete.usage ?? 'one-way') === 'one-way' || !athlete.secondaryPosition) return primary
  return `${primary} / ${athlete.secondaryPosition}`
}

interface PackedPosition {
  position: string
  usage: PlayerUsage
  secondaryPosition?: string
  secondaryPositionGroup?: PositionGroup
}

const CLOUD_META_PATTERN = /\s*\[\[FAI:([^\]]+)\]\]\s*$/

/**
 * Backward-compatible storage for teams that have not run migration 006 yet.
 * New databases use dedicated columns; older ones retain the metadata in the
 * existing position field without losing it on the next cloud reload.
 */
export function encodeCloudPosition(athlete: Athlete): string {
  const usage = athlete.usage ?? 'one-way'
  if (usage === 'one-way' && !athlete.secondaryPosition) return athlete.position
  const payload = encodeURIComponent(JSON.stringify({
    usage,
    secondaryPosition: athlete.secondaryPosition,
    secondaryPositionGroup: athlete.secondaryPositionGroup,
  }))
  return `${athlete.position} [[FAI:${payload}]]`
}

export function decodeCloudPosition(value: string): PackedPosition {
  const match = value.match(CLOUD_META_PATTERN)
  if (!match) return { position: value, usage: 'one-way' }
  const position = value.replace(CLOUD_META_PATTERN, '').trim()
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as {
      usage?: unknown
      secondaryPosition?: unknown
      secondaryPositionGroup?: unknown
    }
    const secondaryPosition = typeof parsed.secondaryPosition === 'string'
      ? parsed.secondaryPosition
      : undefined
    const secondaryGroupRaw = String(parsed.secondaryPositionGroup ?? '') as PositionGroup
    const secondaryPositionGroup = secondaryPosition
      ? positionGroupFor(secondaryPosition, secondaryGroupRaw || 'ATH')
      : undefined
    return {
      position,
      usage: normalizePlayerUsage(parsed.usage),
      secondaryPosition,
      secondaryPositionGroup,
    }
  } catch {
    return { position, usage: 'one-way' }
  }
}
