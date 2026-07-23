import type { PlayerUsage } from '../types'

export interface PlayerUsageDefinition {
  usage: PlayerUsage
  label: string
  primaryPct: number
  secondaryPct: number
  description: string
}

export const PLAYER_USAGE_DEFINITIONS: Record<PlayerUsage, PlayerUsageDefinition> = {
  'one-way': {
    usage: 'one-way',
    label: 'One Way',
    primaryPct: 100,
    secondaryPct: 0,
    description: 'The athlete is evaluated only at the primary position.',
  },
  'two-way': {
    usage: 'two-way',
    label: 'Two Way',
    primaryPct: 50,
    secondaryPct: 50,
    description: 'The athlete is expected to split meaningful playing time evenly between the primary and secondary positions.',
  },
  'iron-man': {
    usage: 'iron-man',
    label: 'Iron Man',
    primaryPct: 70,
    secondaryPct: 30,
    description: 'The athlete has a dominant primary role while also carrying a substantial secondary-position workload.',
  },
}

export function playerUsageDefinition(usage: PlayerUsage | undefined): PlayerUsageDefinition {
  return PLAYER_USAGE_DEFINITIONS[usage ?? 'one-way']
}
