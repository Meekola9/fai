from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


Path('src/lib/deploymentRecommendation.ts').write_text(r'''import type {
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
''')

Path('src/lib/deploymentRecommendation.test.ts').write_text(r'''import { describe, expect, it } from 'vitest'
import {
  IRON_MAN_MAX_CALLS,
  IRON_MAN_MAX_FORMATIONS,
  normalizeIronManPackage,
  parseDeploymentPackageItems,
  recommendDeployment,
} from './deploymentRecommendation'
import { decodeCloudPosition, encodeCloudPosition } from '../data/positions'
import type { Athlete } from '../types'

describe('deployment recommendation', () => {
  it('recommends Two-Way only when physical, mental, and roster-need gates clear', () => {
    const result = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 82,
      secondaryScore: 78,
      awarenessScore: 87,
      rosterNeed: 'starter',
      coachMentalReadiness: 4,
      assignmentReliability: 91,
    })
    expect(result.usage).toBe('two-way')
    expect(result.reasons.join(' ')).toContain('two complete plans')
  })

  it('routes a physically ready athlete with incomplete mental evidence to Iron Man', () => {
    const result = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 76,
      secondaryScore: 71,
      rosterNeed: 'rotation',
      coachMentalReadiness: 3,
      assignmentReliability: 74,
    })
    expect(result.usage).toBe('iron-man')
    expect(result.guardrails.join(' ')).toContain('10 calls')
  })

  it('protects the primary role when the roster has no second-side need', () => {
    const result = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 90,
      secondaryScore: 88,
      awarenessScore: 100,
      rosterNeed: 'none',
      coachMentalReadiness: 5,
      assignmentReliability: 100,
    })
    expect(result.usage).toBe('one-way')
  })

  it('keeps a severe mental-readiness flag out of the secondary package', () => {
    const result = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 80,
      secondaryScore: 75,
      awarenessScore: 72,
      rosterNeed: 'rotation',
      coachMentalReadiness: 1,
      assignmentReliability: 55,
    })
    expect(result.usage).toBe('one-way')
  })
})

describe('Iron Man package limits', () => {
  it('deduplicates coach-entered lines', () => {
    expect(parseDeploymentPackageItems('Trips\nTrips\nDoubles, Goal Line')).toEqual([
      'Trips',
      'Doubles',
      'Goal Line',
    ])
  })

  it('enforces two formations, ten calls, and a 30 percent snap cap', () => {
    const normalized = normalizeIronManPackage({
      formations: ['Trips', 'Doubles', 'Empty'],
      calls: Array.from({ length: 14 }, (_, index) => `Call ${index + 1}`),
      secondarySnapCapPct: 55,
    })
    expect(normalized.formations).toHaveLength(IRON_MAN_MAX_FORMATIONS)
    expect(normalized.calls).toHaveLength(IRON_MAN_MAX_CALLS)
    expect(normalized.secondarySnapCapPct).toBe(30)
  })

  it('round-trips assessment and package metadata through cloud position packing', () => {
    const athlete: Athlete = {
      id: 'athlete-1',
      name: 'Test Athlete',
      grade: 11,
      position: 'X',
      positionGroup: 'WR',
      usage: 'iron-man',
      secondaryPosition: 'Boundary Corner',
      secondaryPositionGroup: 'DB',
      heightIn: 72,
      weightLbs: 185,
      deploymentAssessment: {
        rosterNeed: 'rotation',
        coachMentalReadiness: 3,
        assignmentReliability: 78,
      },
      ironManPackage: {
        status: 'installing',
        formations: ['Doubles'],
        calls: ['Cloud', 'Sky'],
        secondarySnapCapPct: 25,
      },
    }
    const decoded = decodeCloudPosition(encodeCloudPosition(athlete))
    expect(decoded.deploymentAssessment?.rosterNeed).toBe('rotation')
    expect(decoded.ironManPackage?.calls).toEqual(['Cloud', 'Sky'])
  })
})
''')

replace_once(
    'src/types.ts',
    "export type PlayerUsage = 'one-way' | 'two-way' | 'iron-man'\n",
    "export type PlayerUsage = 'one-way' | 'two-way' | 'iron-man'\n\nexport type DeploymentRosterNeed = 'none' | 'emergency' | 'rotation' | 'starter'\nexport type IronManPackageStatus = 'planning' | 'installing' | 'ready' | 'paused'\n\nexport interface DeploymentAssessment {\n  rosterNeed: DeploymentRosterNeed\n  /** Coach rating from 1-5 for handling a second terminology and adjustment load. */\n  coachMentalReadiness?: number\n  /** Coach or film grade from 0-100 for executing the correct assignment. */\n  assignmentReliability?: number\n  updatedAt?: string\n}\n\nexport interface IronManPackage {\n  status: IronManPackageStatus\n  /** Restricted to one or two secondary formations. */\n  formations: string[]\n  /** Restricted to ten calls / assignments. */\n  calls: string[]\n  responsibilities?: string\n  /** Planned secondary snap ceiling; FAI caps this at 30%. */\n  secondarySnapCapPct: number\n  reviewDate?: string\n}\n",
)

replace_once(
    'src/types.ts',
    "  /** Hudl (or other) film link shown on the athlete profile. */\n  hudlUrl?: string\n",
    "  /** Hudl (or other) film link shown on the athlete profile. */\n  hudlUrl?: string\n  /** Coach evidence used by the deployment recommendation engine. */\n  deploymentAssessment?: DeploymentAssessment\n  /** Restricted second-side installation for an Iron Man athlete. */\n  ironManPackage?: IronManPackage\n",
)

replace_once(
    'src/data/positions.ts',
    "import type { Athlete, PlayerUsage, PositionGroup } from '../types'",
    "import type {\n  Athlete,\n  DeploymentAssessment,\n  DeploymentRosterNeed,\n  IronManPackage,\n  IronManPackageStatus,\n  PlayerUsage,\n  PositionGroup,\n} from '../types'",
)

replace_once(
    'src/data/positions.ts',
    "interface PackedPosition {\n  position: string\n  usage: PlayerUsage\n  secondaryPosition?: string\n  secondaryPositionGroup?: PositionGroup\n}",
    "interface PackedPosition {\n  position: string\n  usage: PlayerUsage\n  secondaryPosition?: string\n  secondaryPositionGroup?: PositionGroup\n  deploymentAssessment?: DeploymentAssessment\n  ironManPackage?: IronManPackage\n}",
)

replace_once(
    'src/data/positions.ts',
    "export function encodeCloudPosition(athlete: Athlete): string {\n  const usage = athlete.usage ?? 'one-way'\n  if (usage === 'one-way' && !athlete.secondaryPosition) return athlete.position\n  const payload = encodeURIComponent(JSON.stringify({\n    usage,\n    secondaryPosition: athlete.secondaryPosition,\n    secondaryPositionGroup: athlete.secondaryPositionGroup,\n  }))",
    "export function encodeCloudPosition(athlete: Athlete): string {\n  const usage = athlete.usage ?? 'one-way'\n  if (usage === 'one-way' && !athlete.secondaryPosition && !athlete.deploymentAssessment && !athlete.ironManPackage) return athlete.position\n  const payload = encodeURIComponent(JSON.stringify({\n    usage,\n    secondaryPosition: athlete.secondaryPosition,\n    secondaryPositionGroup: athlete.secondaryPositionGroup,\n    deploymentAssessment: athlete.deploymentAssessment,\n    ironManPackage: athlete.ironManPackage,\n  }))",
)

replace_once(
    'src/data/positions.ts',
    "      secondaryPositionGroup?: unknown\n    }",
    "      secondaryPositionGroup?: unknown\n      deploymentAssessment?: unknown\n      ironManPackage?: unknown\n    }",
)

replace_once(
    'src/data/positions.ts',
    "    return {\n      position,\n      usage: normalizePlayerUsage(parsed.usage),\n      secondaryPosition,\n      secondaryPositionGroup,\n    }",
    "    const assessmentRaw = parsed.deploymentAssessment && typeof parsed.deploymentAssessment === 'object'\n      ? parsed.deploymentAssessment as Record<string, unknown>\n      : undefined\n    const needValues: DeploymentRosterNeed[] = ['none', 'emergency', 'rotation', 'starter']\n    const rosterNeedRaw = String(assessmentRaw?.rosterNeed ?? 'none') as DeploymentRosterNeed\n    const deploymentAssessment: DeploymentAssessment | undefined = assessmentRaw\n      ? {\n          rosterNeed: needValues.includes(rosterNeedRaw) ? rosterNeedRaw : 'none',\n          coachMentalReadiness: typeof assessmentRaw.coachMentalReadiness === 'number'\n            ? assessmentRaw.coachMentalReadiness\n            : undefined,\n          assignmentReliability: typeof assessmentRaw.assignmentReliability === 'number'\n            ? assessmentRaw.assignmentReliability\n            : undefined,\n          updatedAt: typeof assessmentRaw.updatedAt === 'string' ? assessmentRaw.updatedAt : undefined,\n        }\n      : undefined\n\n    const packageRaw = parsed.ironManPackage && typeof parsed.ironManPackage === 'object'\n      ? parsed.ironManPackage as Record<string, unknown>\n      : undefined\n    const statusValues: IronManPackageStatus[] = ['planning', 'installing', 'ready', 'paused']\n    const statusRaw = String(packageRaw?.status ?? 'planning') as IronManPackageStatus\n    const ironManPackage: IronManPackage | undefined = packageRaw\n      ? {\n          status: statusValues.includes(statusRaw) ? statusRaw : 'planning',\n          formations: Array.isArray(packageRaw.formations)\n            ? packageRaw.formations.filter((item): item is string => typeof item === 'string')\n            : [],\n          calls: Array.isArray(packageRaw.calls)\n            ? packageRaw.calls.filter((item): item is string => typeof item === 'string')\n            : [],\n          responsibilities: typeof packageRaw.responsibilities === 'string'\n            ? packageRaw.responsibilities\n            : undefined,\n          secondarySnapCapPct: typeof packageRaw.secondarySnapCapPct === 'number'\n            ? packageRaw.secondarySnapCapPct\n            : 30,\n          reviewDate: typeof packageRaw.reviewDate === 'string' ? packageRaw.reviewDate : undefined,\n        }\n      : undefined\n\n    return {\n      position,\n      usage: normalizePlayerUsage(parsed.usage),\n      secondaryPosition,\n      secondaryPositionGroup,\n      deploymentAssessment,\n      ironManPackage,\n    }",
)

replace_once(
    'src/store/cloud.ts',
    "      hudlUrl: optionalText(row.hudl_url),\n    }",
    "      hudlUrl: optionalText(row.hudl_url),\n      deploymentAssessment: packed.deploymentAssessment,\n      ironManPackage: packed.ironManPackage,\n    }",
)

replace_once(
    'src/components/PlayerUsageGuide.tsx',
    "import type { PlayerUsage } from '../types'",
    "import type { Athlete, PlayerUsage } from '../types'",
)

replace_once(
    'src/components/PlayerUsageGuide.tsx',
    "export function PlayerUsageSummary({ usage }: { usage?: PlayerUsage }) {\n  const definition = PLAYER_USAGE_DEFINITIONS[usage ?? 'one-way']\n  return (\n    <div className=\"deployment-summary\">\n      <div className=\"deployment-summary-kicker\">Deployment plan</div>\n      <div className=\"deployment-summary-title\">{definition.label}</div>\n      <div className=\"deployment-summary-split\">{playerUsagePlanLine(usage)}</div>\n      <p>{definition.gamePlan}</p>\n    </div>\n  )\n}",
    "export function PlayerUsageSummary({ usage, athlete }: { usage?: PlayerUsage; athlete?: Athlete }) {\n  const resolvedUsage = athlete?.usage ?? usage ?? 'one-way'\n  const definition = PLAYER_USAGE_DEFINITIONS[resolvedUsage]\n  const restrictedPackage = resolvedUsage === 'iron-man' ? athlete?.ironManPackage : undefined\n  return (\n    <div className=\"deployment-summary\">\n      <div className=\"deployment-summary-kicker\">Deployment plan</div>\n      <div className=\"deployment-summary-title\">{definition.label}</div>\n      <div className=\"deployment-summary-split\">{playerUsagePlanLine(resolvedUsage)}</div>\n      <p>{definition.gamePlan}</p>\n      {resolvedUsage === 'iron-man' && (\n        <div className=\"mt-4 border-t border-line pt-4\">\n          <div className=\"flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted\">\n            <span>Restricted package</span>\n            <span className=\"rounded-full border border-fai/30 px-2 py-1 text-fai\">{restrictedPackage?.status ?? 'planning'}</span>\n            <span>{restrictedPackage?.secondarySnapCapPct ?? 30}% snap ceiling</span>\n          </div>\n          {restrictedPackage ? (\n            <div className=\"mt-3 grid gap-3 text-sm sm:grid-cols-2\">\n              <div><strong className=\"text-chalk\">Formations:</strong> <span className=\"text-muted\">{restrictedPackage.formations.join(', ') || 'Not assigned'}</span></div>\n              <div><strong className=\"text-chalk\">Calls:</strong> <span className=\"text-muted\">{restrictedPackage.calls.length}/10 installed</span></div>\n              {restrictedPackage.responsibilities && <div className=\"sm:col-span-2\"><strong className=\"text-chalk\">Responsibilities:</strong> <span className=\"text-muted\">{restrictedPackage.responsibilities}</span></div>}\n              {restrictedPackage.reviewDate && <div className=\"sm:col-span-2 text-xs text-muted\">Review {new Date(`${restrictedPackage.reviewDate}T12:00:00`).toLocaleDateString()}</div>}\n            </div>\n          ) : (\n            <div className=\"mt-2 text-sm text-gold\">No restricted package has been installed yet.</div>\n          )}\n        </div>\n      )}\n    </div>\n  )\n}",
)

replace_once(
    'src/pages/AthleteProfile.tsx',
    "<PlayerUsageSummary usage={athlete.usage} />",
    "<PlayerUsageSummary athlete={athlete} />",
)
replace_once(
    'src/pages/AthleteProfile.tsx',
    "<PlayerUsageSummary usage={athlete.usage} />",
    "<PlayerUsageSummary athlete={athlete} />",
)

replace_once(
    'src/pages/AthleteEditor.tsx',
    "import { playerUsageDefinition } from '../lib/playerUsage'\nimport type { Athlete, PlayerUsage, PositionGroup } from '../types'",
    "import { playerUsageDefinition } from '../lib/playerUsage'\nimport { athleteTimeline, computeSessionForPositionGroup } from '../lib/compute'\nimport { latestAwarenessFor } from '../lib/awarenessQuiz'\nimport {\n  IRON_MAN_MAX_CALLS,\n  IRON_MAN_MAX_FORMATIONS,\n  deploymentAssessmentFromValues,\n  normalizeIronManPackage,\n  parseDeploymentPackageItems,\n  recommendDeployment,\n} from '../lib/deploymentRecommendation'\nimport type {\n  Athlete,\n  DeploymentRosterNeed,\n  IronManPackageStatus,\n  PlayerUsage,\n  PositionGroup,\n} from '../types'",
)

replace_once(
    'src/pages/AthleteEditor.tsx',
    "  const { data, teamId, addAthlete, updateAthlete, deleteAthlete } = useStore()",
    "  const { data, computed, teamId, addAthlete, updateAthlete, deleteAthlete } = useStore()",
)

replace_once(
    'src/pages/AthleteEditor.tsx',
    "  const [error, setError] = useState<string>()\n",
    "  const [error, setError] = useState<string>()\n  const [rosterNeed, setRosterNeed] = useState<DeploymentRosterNeed>(\n    existing?.deploymentAssessment?.rosterNeed ?? 'none',\n  )\n  const [mentalReadiness, setMentalReadiness] = useState(\n    existing?.deploymentAssessment?.coachMentalReadiness\n      ? String(existing.deploymentAssessment.coachMentalReadiness)\n      : '',\n  )\n  const [assignmentReliability, setAssignmentReliability] = useState(\n    typeof existing?.deploymentAssessment?.assignmentReliability === 'number'\n      ? String(existing.deploymentAssessment.assignmentReliability)\n      : '',\n  )\n  const [packageStatus, setPackageStatus] = useState<IronManPackageStatus>(\n    existing?.ironManPackage?.status ?? 'planning',\n  )\n  const [packageFormations, setPackageFormations] = useState(\n    existing?.ironManPackage?.formations.join('\\n') ?? '',\n  )\n  const [packageCalls, setPackageCalls] = useState(\n    existing?.ironManPackage?.calls.join('\\n') ?? '',\n  )\n  const [packageResponsibilities, setPackageResponsibilities] = useState(\n    existing?.ironManPackage?.responsibilities ?? '',\n  )\n  const [secondarySnapCapPct, setSecondarySnapCapPct] = useState(\n    String(existing?.ironManPackage?.secondarySnapCapPct ?? 30),\n  )\n  const [packageReviewDate, setPackageReviewDate] = useState(\n    existing?.ironManPackage?.reviewDate ?? '',\n  )\n",
)

replace_once(
    'src/pages/AthleteEditor.tsx',
    "      const isTwoWay = usage !== 'one-way'\n      const cleanSecondary = isTwoWay ? secondaryPosition.trim() : ''\n      const athleteId = existing?.id ?? newId('athlete')",
    "      const isTwoWay = usage !== 'one-way'\n      const cleanSecondary = isTwoWay ? secondaryPosition.trim() : ''\n      if (isTwoWay && !cleanSecondary) {\n        throw new Error('Choose a secondary position before assigning an Iron Man or Two-Way role.')\n      }\n      const formations = parseDeploymentPackageItems(packageFormations)\n      const calls = parseDeploymentPackageItems(packageCalls)\n      if (usage === 'iron-man' && formations.length > IRON_MAN_MAX_FORMATIONS) {\n        throw new Error(`Iron Man packages are limited to ${IRON_MAN_MAX_FORMATIONS} formations.`)\n      }\n      if (usage === 'iron-man' && calls.length > IRON_MAN_MAX_CALLS) {\n        throw new Error(`Iron Man packages are limited to ${IRON_MAN_MAX_CALLS} calls or assignments.`)\n      }\n      const athleteId = existing?.id ?? newId('athlete')",
)

replace_once(
    'src/pages/AthleteEditor.tsx',
    "        hudlUrl: hudlUrl.trim() || undefined,\n      }",
    "        hudlUrl: hudlUrl.trim() || undefined,\n        deploymentAssessment: deploymentAssessmentFromValues({\n          rosterNeed,\n          coachMentalReadiness: mentalReadiness ? Number(mentalReadiness) : undefined,\n          assignmentReliability: assignmentReliability ? Number(assignmentReliability) : undefined,\n          updatedAt: new Date().toISOString(),\n        }),\n        ironManPackage: usage === 'iron-man'\n          ? normalizeIronManPackage({\n              status: packageStatus,\n              formations,\n              calls,\n              responsibilities: packageResponsibilities,\n              secondarySnapCapPct: Number(secondarySnapCapPct),\n              reviewDate: packageReviewDate,\n            })\n          : undefined,\n      }",
)

replace_once(
    'src/pages/AthleteEditor.tsx',
    "  const primaryDetail = positionOptionFor(position)\n  const secondaryDetail = positionOptionFor(secondaryPosition)\n  const usageDetail = playerUsageDefinition(usage)\n",
    "  const primaryDetail = positionOptionFor(position)\n  const secondaryDetail = positionOptionFor(secondaryPosition)\n  const usageDetail = playerUsageDefinition(usage)\n  const latestTesting = existing\n    ? athleteTimeline(computed, existing.id).slice(-1)[0]\n    : undefined\n  const primaryScore = latestTesting && existing\n    ? computeSessionForPositionGroup(\n        latestTesting.session,\n        { ...existing, position: position.trim() || group, positionGroup: group },\n        latestTesting.event,\n        group,\n      ).fai\n    : undefined\n  const secondaryScore = latestTesting && existing && secondaryPosition.trim()\n    ? computeSessionForPositionGroup(\n        {\n          ...latestTesting.session,\n          positionSnapshot: secondaryPosition.trim(),\n          positionGroupSnapshot: secondaryGroup,\n        },\n        {\n          ...existing,\n          position: secondaryPosition.trim(),\n          positionGroup: secondaryGroup,\n        },\n        latestTesting.event,\n        secondaryGroup,\n      ).fai\n    : undefined\n  const latestAwareness = existing\n    ? latestAwarenessFor(data.awarenessResults, existing.id)\n    : undefined\n  const recommendation = recommendDeployment({\n    hasSecondaryPosition: Boolean(secondaryPosition.trim()),\n    primaryScore,\n    secondaryScore,\n    awarenessScore: latestAwareness?.score,\n    rosterNeed,\n    coachMentalReadiness: mentalReadiness ? Number(mentalReadiness) : undefined,\n    assignmentReliability: assignmentReliability ? Number(assignmentReliability) : undefined,\n  })\n  const formationItems = parseDeploymentPackageItems(packageFormations)\n  const callItems = parseDeploymentPackageItems(packageCalls)\n",
)

replace_once(
    'src/pages/AthleteEditor.tsx',
    "          <PlayerUsageGuide value={usage} onChange={setUsage} />\n        </div>\n\n        <div className=\"grid grid-cols-1 gap-4 sm:grid-cols-3\">",
    "          <PlayerUsageGuide value={usage} onChange={setUsage} />\n        </div>\n\n        <div className=\"rounded-xl border border-line bg-ink/40 p-4\">\n          <div className=\"flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between\">\n            <div>\n              <div className=\"text-[10px] font-black uppercase tracking-[0.18em] text-fai\">FAI deployment recommendation</div>\n              <div className=\"mt-1 text-lg font-black text-chalk\">{recommendation.headline}</div>\n              <div className=\"mt-1 text-xs text-muted\">{recommendation.confidence}% evidence confidence{typeof recommendation.readinessScore === 'number' ? ` · ${recommendation.readinessScore} readiness` : ''}</div>\n            </div>\n            <button\n              type=\"button\"\n              onClick={() => setUsage(recommendation.usage)}\n              className=\"rounded-lg border border-fai/40 bg-fai/10 px-4 py-2 text-xs font-black text-fai\"\n            >\n              Apply {playerUsageDefinition(recommendation.usage).label}\n            </button>\n          </div>\n\n          <div className=\"mt-4 grid gap-3 sm:grid-cols-3\">\n            <label>\n              <span className={labelCls}>Roster need</span>\n              <select className={inputCls} value={rosterNeed} onChange={(event) => setRosterNeed(event.target.value as DeploymentRosterNeed)}>\n                <option value=\"none\">No secondary need</option>\n                <option value=\"emergency\">Emergency depth</option>\n                <option value=\"rotation\">Rotation role</option>\n                <option value=\"starter\">Starter-level need</option>\n              </select>\n            </label>\n            <label>\n              <span className={labelCls}>Mental readiness</span>\n              <select className={inputCls} value={mentalReadiness} onChange={(event) => setMentalReadiness(event.target.value)}>\n                <option value=\"\">Not graded</option>\n                <option value=\"1\">1 · Overloaded</option>\n                <option value=\"2\">2 · Needs heavy support</option>\n                <option value=\"3\">3 · Limited package ready</option>\n                <option value=\"4\">4 · Two-plan ready</option>\n                <option value=\"5\">5 · Full command</option>\n              </select>\n            </label>\n            <label>\n              <span className={labelCls}>Assignment reliability</span>\n              <input className={inputCls} type=\"number\" min=\"0\" max=\"100\" value={assignmentReliability} onChange={(event) => setAssignmentReliability(event.target.value)} placeholder=\"0-100\" />\n            </label>\n          </div>\n\n          <div className=\"mt-4 grid gap-3 lg:grid-cols-2\">\n            <div>\n              <div className=\"text-[10px] font-black uppercase tracking-wider text-muted\">Why</div>\n              <ul className=\"mt-2 space-y-1 text-xs leading-relaxed text-chalk\">\n                {recommendation.reasons.map((reason) => <li key={reason}>• {reason}</li>)}\n              </ul>\n            </div>\n            <div>\n              <div className=\"text-[10px] font-black uppercase tracking-wider text-muted\">Guardrails</div>\n              <ul className=\"mt-2 space-y-1 text-xs leading-relaxed text-muted\">\n                {recommendation.guardrails.map((guardrail) => <li key={guardrail}>• {guardrail}</li>)}\n              </ul>\n            </div>\n          </div>\n          {recommendation.missingInputs.length > 0 && (\n            <div className=\"mt-3 rounded-lg border border-gold/30 bg-gold/5 p-2 text-xs text-gold\">\n              Missing evidence: {recommendation.missingInputs.join(', ')}. The engine stays conservative until these are recorded.\n            </div>\n          )}\n        </div>\n\n        <div className=\"grid grid-cols-1 gap-4 sm:grid-cols-3\">",
)

replace_once(
    'src/pages/AthleteEditor.tsx',
    "            </div>\n          </div>\n        )}\n\n        <div>\n          <label className={labelCls}>Photo URL fallback (optional)</label>",
    "            </div>\n\n            {usage === 'iron-man' && (\n              <div className=\"mt-4 border-t border-fai/20 pt-4\">\n                <div className=\"flex flex-wrap items-center justify-between gap-2\">\n                  <div>\n                    <div className=\"text-sm font-black text-chalk\">Restricted Iron Man Package</div>\n                    <p className=\"mt-1 text-xs text-muted\">One or two formations, no more than ten calls, and a maximum 30% planned secondary workload.</p>\n                  </div>\n                  <select className=\"rounded-lg border border-line bg-panel px-3 py-2 text-xs font-bold text-chalk\" value={packageStatus} onChange={(event) => setPackageStatus(event.target.value as IronManPackageStatus)}>\n                    <option value=\"planning\">Planning</option>\n                    <option value=\"installing\">Installing</option>\n                    <option value=\"ready\">Ready</option>\n                    <option value=\"paused\">Paused</option>\n                  </select>\n                </div>\n\n                <div className=\"mt-4 grid gap-4 sm:grid-cols-2\">\n                  <label>\n                    <span className={labelCls}>Allowed formations</span>\n                    <textarea className={`${inputCls} min-h-24`} value={packageFormations} onChange={(event) => setPackageFormations(event.target.value)} placeholder=\"Doubles&#10;Trips\" />\n                    <span className={`mt-1 block text-[11px] ${formationItems.length > IRON_MAN_MAX_FORMATIONS ? 'text-down' : 'text-muted'}`}>{formationItems.length}/{IRON_MAN_MAX_FORMATIONS} formations</span>\n                  </label>\n                  <label>\n                    <span className={labelCls}>Allowed calls / assignments</span>\n                    <textarea className={`${inputCls} min-h-24`} value={packageCalls} onChange={(event) => setPackageCalls(event.target.value)} placeholder=\"Cloud&#10;Sky&#10;Boundary pressure\" />\n                    <span className={`mt-1 block text-[11px] ${callItems.length > IRON_MAN_MAX_CALLS ? 'text-down' : 'text-muted'}`}>{callItems.length}/{IRON_MAN_MAX_CALLS} calls</span>\n                  </label>\n                  <label>\n                    <span className={labelCls}>Secondary snap ceiling</span>\n                    <div className=\"flex items-center gap-2\"><input className={inputCls} type=\"number\" min=\"0\" max=\"30\" value={secondarySnapCapPct} onChange={(event) => setSecondarySnapCapPct(event.target.value)} /><span className=\"text-sm font-black text-muted\">%</span></div>\n                  </label>\n                  <label>\n                    <span className={labelCls}>Package review date</span>\n                    <input className={inputCls} type=\"date\" value={packageReviewDate} onChange={(event) => setPackageReviewDate(event.target.value)} />\n                  </label>\n                  <label className=\"sm:col-span-2\">\n                    <span className={labelCls}>Simplified responsibility rules</span>\n                    <textarea className={`${inputCls} min-h-20`} value={packageResponsibilities} onChange={(event) => setPackageResponsibilities(event.target.value)} placeholder=\"Example: field-side only; no motion checks; play Cloud unless the formation is empty.\" />\n                  </label>\n                </div>\n              </div>\n            )}\n          </div>\n        )}\n\n        <div>\n          <label className={labelCls}>Photo URL fallback (optional)</label>",
)

print('Deployment recommendation implementation applied.')
