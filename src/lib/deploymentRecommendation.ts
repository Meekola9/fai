import type {
  DeploymentAssessment,
  DeploymentRosterNeed,
  IronManPackage,
  PlayerUsage,
} from '../types'

export const IRON_MAN_MAX_FORMATIONS = 2
export const IRON_MAN_MAX_CALLS = 10
export const IRON_MAN_MAX_SECONDARY_SNAP_PCT = 30

export interface DeploymentRecommendationInput {
  hasSecondaryPosition: boolean
  primaryScore?: number
  secondaryScore?: number
  awarenessScore?: number
  rosterNeed?: DeploymentRosterNeed
  coachMentalReadiness?: number
  assignmentReliability?: number
}

export interface DeploymentRecommendation {
  usage: PlayerUsage
  confidence: number
  readinessScore?: number
  headline: string
  reasons: string[]
  guardrails: string[]
  missingInputs: string[]
}

const NEED_VALUE: Record<DeploymentRosterNeed, number> = {
  none: 0,
  emergency: 45,
  rotation: 75,
  starter: 100,
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function bounded(value: number | undefined, low: number, high: number): number | undefined {
  return finite(value) ? clamp(value, low, high) : undefined
}

function average(values: Array<number | undefined>): number | undefined {
  const usable = values.filter(finite)
  return usable.length > 0
    ? usable.reduce((sum, value) => sum + value, 0) / usable.length
    : undefined
}

export function parseDeploymentPackageItems(value: string): string[] {
  const seen = new Set<string>()
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase()
      if (!item || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function normalizeIronManPackage(input: Partial<IronManPackage> | undefined): IronManPackage {
  const formations = (input?.formations ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, IRON_MAN_MAX_FORMATIONS)
  const calls = (input?.calls ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, IRON_MAN_MAX_CALLS)

  return {
    status: input?.status ?? 'planning',
    formations,
    calls,
    responsibilities: input?.responsibilities?.trim() || undefined,
    secondarySnapCapPct: clamp(
      finite(input?.secondarySnapCapPct) ? Number(input?.secondarySnapCapPct) : IRON_MAN_MAX_SECONDARY_SNAP_PCT,
      0,
      IRON_MAN_MAX_SECONDARY_SNAP_PCT,
    ),
    reviewDate: input?.reviewDate || undefined,
  }
}

export function deploymentAssessmentFromValues(input: {
  rosterNeed: DeploymentRosterNeed
  coachMentalReadiness?: number
  assignmentReliability?: number
  updatedAt?: string
}): DeploymentAssessment {
  return {
    rosterNeed: input.rosterNeed,
    coachMentalReadiness: bounded(input.coachMentalReadiness, 1, 5),
    assignmentReliability: bounded(input.assignmentReliability, 0, 100),
    updatedAt: input.updatedAt,
  }
}

export function recommendDeployment(input: DeploymentRecommendationInput): DeploymentRecommendation {
  const rosterNeed = input.rosterNeed ?? 'none'
  const primary = bounded(input.primaryScore, 0, 100)
  const secondary = bounded(input.secondaryScore, 0, 100)
  const awareness = bounded(input.awarenessScore, 0, 100)
  const reliability = bounded(input.assignmentReliability, 0, 100)
  const coachMental = bounded(input.coachMentalReadiness, 1, 5)
  const mentalScaled = finite(coachMental) ? coachMental * 20 : undefined

  const missingInputs: string[] = []
  if (!finite(primary)) missingInputs.push('primary-position testing score')
  if (!finite(secondary)) missingInputs.push('secondary-position testing score')
  if (!finite(awareness)) missingInputs.push('awareness quiz')
  if (!finite(reliability)) missingInputs.push('assignment reliability grade')
  if (!finite(coachMental)) missingInputs.push('coach mental-readiness grade')

  const physicalAverage = average([primary, secondary])
  const mentalAverage = average([awareness, reliability, mentalScaled])
  const readinessScore = finite(physicalAverage)
    ? Math.round(
        physicalAverage * 0.58
        + (mentalAverage ?? 50) * 0.32
        + NEED_VALUE[rosterNeed] * 0.1,
      )
    : undefined

  const evidenceCount = [primary, secondary, awareness, reliability, coachMental]
    .filter(finite).length
  const confidence = clamp(35 + evidenceCount * 11 + (input.hasSecondaryPosition ? 10 : 0), 35, 100)

  if (!input.hasSecondaryPosition) {
    return {
      usage: 'one-way',
      confidence,
      readinessScore,
      headline: 'Primary Specialist until a secondary role is assigned',
      reasons: ['FAI cannot recommend a second-side workload without a defined secondary position.'],
      guardrails: ['Keep the complete install and weekly preparation at the primary position.'],
      missingInputs,
    }
  }

  if (rosterNeed === 'none') {
    return {
      usage: 'one-way',
      confidence,
      readinessScore,
      headline: 'Primary Specialist fits the current roster plan',
      reasons: ['The roster does not currently need this athlete to carry a second-side role.'],
      guardrails: ['Do not add mental workload only because the athlete is physically capable.'],
      missingInputs,
    }
  }

  const physicalFloorPassed = finite(primary) && finite(secondary) && primary >= 65 && secondary >= 64
  const fullPhysicalPassed = finite(primary) && finite(secondary) && primary >= 70 && secondary >= 70
  const severeMentalFlag = (finite(reliability) && reliability < 60) || (finite(coachMental) && coachMental <= 1)
  const twoWayMentalPassed = finite(awareness) && awareness >= 80
    && finite(reliability) && reliability >= 85
    && finite(coachMental) && coachMental >= 4
  const meaningfulNeed = rosterNeed === 'rotation' || rosterNeed === 'starter'

  if (fullPhysicalPassed && twoWayMentalPassed && meaningfulNeed) {
    return {
      usage: 'two-way',
      confidence,
      readinessScore,
      headline: 'Two-Way preparation is supported',
      reasons: [
        `Primary and secondary position scores clear the full-load floor (${primary.toFixed(1)} / ${secondary.toFixed(1)}).`,
        `Mental evidence supports two complete plans: awareness ${awareness.toFixed(0)}, reliability ${reliability.toFixed(0)}, coach readiness ${coachMental.toFixed(0)}/5.`,
        `The roster need is ${rosterNeed}, so the second role has meaningful weekly value.`,
      ],
      guardrails: [
        'Recheck assignment reliability after the first full installation week.',
        'Reduce the athlete to an Iron Man package if primary-side execution slows.',
      ],
      missingInputs,
    }
  }

  if (physicalFloorPassed && !severeMentalFlag) {
    const mentalReason = missingInputs.length > 0
      ? 'Mental-readiness evidence is incomplete, so a restricted package is safer than two full installations.'
      : 'The athlete is physically ready, but the mental evidence does not yet support two complete game plans.'
    return {
      usage: 'iron-man',
      confidence,
      readinessScore,
      headline: 'Iron Man restricted package is recommended',
      reasons: [
        `The athlete clears the physical two-side floor (${primary.toFixed(1)} primary / ${secondary.toFixed(1)} secondary).`,
        mentalReason,
        rosterNeed === 'emergency'
          ? 'The roster need is emergency depth, which does not justify a full second-side install.'
          : `The ${rosterNeed} need can be covered with a deliberately small secondary package.`,
      ],
      guardrails: [
        `Limit the secondary package to ${IRON_MAN_MAX_FORMATIONS} formations and ${IRON_MAN_MAX_CALLS} calls.`,
        `Cap planned secondary usage at ${IRON_MAN_MAX_SECONDARY_SNAP_PCT}% and preserve the complete primary install.`,
        'Pause the package after repeated mental errors or any decline in primary-position execution.',
      ],
      missingInputs,
    }
  }

  const reasons = severeMentalFlag
    ? ['The current mental-readiness evidence is below the safe floor for even a restricted secondary package.']
    : finite(secondary)
      ? [`The secondary-position athletic score (${secondary.toFixed(1)}) is below the current two-side readiness floor.`]
      : ['There is not enough verified testing evidence to approve a second-side workload.']

  return {
    usage: 'one-way',
    confidence,
    readinessScore,
    headline: 'Primary Specialist is the safer current deployment',
    reasons,
    guardrails: [
      'Keep the athlete fully prepared at the primary position.',
      'Reassess after updated testing, awareness work, and assignment grading.',
    ],
    missingInputs,
  }
}
