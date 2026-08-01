import type { PlayerUsage } from '../types'

export interface PlayerUsageDefinition {
  usage: PlayerUsage
  label: string
  shortLabel: string
  primaryPct: number
  secondaryPct: number
  description: string
  mentalProfile: string
  installScope: string
  gamePlan: string
}

/**
 * FAI deployment roles describe how a coach should allocate preparation and
 * game-plan responsibility. They are not character judgments and they do not
 * change the athlete's primary-position identity.
 */
export const PLAYER_USAGE_DEFINITIONS: Record<PlayerUsage, PlayerUsageDefinition> = {
  'one-way': {
    usage: 'one-way',
    label: 'Primary Specialist',
    shortLabel: 'Specialist',
    primaryPct: 100,
    secondaryPct: 0,
    description: 'A high-value player whose job is concentrated on one side of the ball, either because that is where the athlete is exceptional or because the roster does not need a second role.',
    mentalProfile: 'Full meeting-room and practice responsibility for the primary position only.',
    installScope: 'Complete primary-position install. No required secondary package.',
    gamePlan: 'Use the athlete at the primary position without forcing a second-side workload.',
  },
  'two-way': {
    usage: 'two-way',
    label: 'Two-Way',
    shortLabel: 'Two-Way',
    primaryPct: 50,
    secondaryPct: 50,
    description: 'An athlete who is physically developed enough to contribute on both sides and mentally prepared to learn, communicate, and execute two full position plans.',
    mentalProfile: 'Can process two meeting rooms, two terminology systems, adjustments, and situational responsibilities without the second role reducing primary execution.',
    installScope: 'Meaningful installation on both sides of the ball, including checks and weekly adjustments.',
    gamePlan: 'Prepare the athlete as a true two-side contributor. The 50/50 score blend represents equal position value, not a mandatory snap split.',
  },
  'iron-man': {
    usage: 'iron-man',
    label: 'Iron Man',
    shortLabel: 'Iron Man',
    primaryPct: 70,
    secondaryPct: 30,
    description: 'An athlete who is physically capable of helping on both sides, but whose secondary mental workload should be deliberately restricted so the primary position stays clear and fast.',
    mentalProfile: 'Primary-side command is trusted. Secondary-side processing is simplified instead of asking the athlete to carry two complete game plans.',
    installScope: 'Full primary install plus a small secondary package—normally one or two formations, a limited call family, or roughly one role in every ten calls.',
    gamePlan: 'Default to 70% primary and 30% secondary value. A coach may keep the athlete entirely at the primary position when the weekly secondary package would create unnecessary mental load.',
  },
}

export function playerUsageDefinition(usage: PlayerUsage | undefined): PlayerUsageDefinition {
  return PLAYER_USAGE_DEFINITIONS[usage ?? 'one-way']
}

export function playerUsagePlanLine(usage: PlayerUsage | undefined): string {
  const definition = playerUsageDefinition(usage)
  return definition.secondaryPct > 0
    ? `${definition.primaryPct}% primary · ${definition.secondaryPct}% secondary`
    : 'Primary position only'
}
