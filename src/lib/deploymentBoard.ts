import type {
  Athlete,
  AwarenessResult,
  ComputedSession,
  FilmPlay,
  IronManPackage,
  PlaySide,
  PlayerUsage,
  PositionGroup,
} from '../types'
import { latestAwarenessFor } from './awarenessQuiz'
import { athleteTimeline, computeSessionForPositionGroup } from './compute'
import {
  recommendDeployment,
  type DeploymentRecommendation,
} from './deploymentRecommendation'

export type DeploymentBoardFlag =
  | 'missing-evidence'
  | 'role-mismatch'
  | 'review-due'
  | 'over-secondary-cap'
  | 'package-incomplete'
  | 'package-paused'

export type DeploymentBoardStatus = 'clear' | 'watch' | 'action'

export interface TrackedDeploymentUsage {
  primarySnaps: number
  secondarySnaps: number
  totalTrackedSnaps: number
  secondaryPct?: number
  sameSideRoles: boolean
}

export interface DeploymentBoardRow {
  athlete: Athlete
  activeUsage: PlayerUsage
  primaryScore?: number
  secondaryScore?: number
  awarenessScore?: number
  recommendation: DeploymentRecommendation
  trackedUsage: TrackedDeploymentUsage
  flags: DeploymentBoardFlag[]
  status: DeploymentBoardStatus
}

export const DEPLOYMENT_FLAG_LABELS: Record<DeploymentBoardFlag, string> = {
  'missing-evidence': 'Missing evidence',
  'role-mismatch': 'Role review recommended',
  'review-due': 'Package review due',
  'over-secondary-cap': 'Over snap ceiling',
  'package-incomplete': 'Package incomplete',
  'package-paused': 'Package paused',
}

const OFFENSE_GROUPS = new Set<PositionGroup>(['QB', 'RB', 'WR', 'TE', 'OL'])
const DEFENSE_GROUPS = new Set<PositionGroup>(['DL', 'LB', 'DB'])

export function positionSideForGroup(group: PositionGroup | undefined): PlaySide | undefined {
  if (!group || group === 'ATH') return undefined
  if (OFFENSE_GROUPS.has(group)) return 'offense'
  if (DEFENSE_GROUPS.has(group)) return 'defense'
  if (group === 'K/P') return 'special'
  return undefined
}

export function filmPlayContainsAthlete(play: FilmPlay, athleteId: string): boolean {
  return play.ballCarrierId === athleteId
    || play.targetId === athleteId
    || Boolean(play.annotations?.some((annotation) => annotation.athleteId === athleteId))
}

export function trackedDeploymentUsage(
  athlete: Athlete,
  filmPlays: readonly FilmPlay[],
): TrackedDeploymentUsage {
  const primarySide = positionSideForGroup(athlete.positionGroup)
  const secondarySide = positionSideForGroup(athlete.secondaryPositionGroup)
  const sameSideRoles = Boolean(primarySide && secondarySide && primarySide === secondarySide)

  if (!primarySide || !secondarySide || sameSideRoles) {
    return {
      primarySnaps: 0,
      secondarySnaps: 0,
      totalTrackedSnaps: 0,
      sameSideRoles,
    }
  }

  let primarySnaps = 0
  let secondarySnaps = 0
  for (const play of filmPlays) {
    if (!filmPlayContainsAthlete(play, athlete.id)) continue
    if (play.side === primarySide) primarySnaps += 1
    if (play.side === secondarySide) secondarySnaps += 1
  }
  const totalTrackedSnaps = primarySnaps + secondarySnaps

  return {
    primarySnaps,
    secondarySnaps,
    totalTrackedSnaps,
    secondaryPct: totalTrackedSnaps > 0
      ? Math.round((secondarySnaps / totalTrackedSnaps) * 1000) / 10
      : undefined,
    sameSideRoles,
  }
}

export function deploymentFlagsFor(input: {
  activeUsage: PlayerUsage
  recommendation: DeploymentRecommendation
  ironManPackage?: IronManPackage
  trackedUsage: TrackedDeploymentUsage
  todayIso?: string
}): DeploymentBoardFlag[] {
  const flags: DeploymentBoardFlag[] = []
  const todayIso = input.todayIso ?? new Date().toISOString().slice(0, 10)

  if (input.recommendation.missingInputs.length > 0) flags.push('missing-evidence')
  if (
    input.recommendation.confidence >= 68
    && input.recommendation.usage !== input.activeUsage
  ) flags.push('role-mismatch')

  if (input.activeUsage === 'iron-man') {
    const pkg = input.ironManPackage
    if (!pkg || pkg.formations.length === 0 || pkg.calls.length === 0) flags.push('package-incomplete')
    if (pkg?.status === 'paused') flags.push('package-paused')
    if (pkg?.reviewDate && pkg.reviewDate <= todayIso) flags.push('review-due')
    if (
      typeof input.trackedUsage.secondaryPct === 'number'
      && input.trackedUsage.secondaryPct > (pkg?.secondarySnapCapPct ?? 30)
    ) flags.push('over-secondary-cap')
  }

  return flags
}

export function deploymentStatusFor(flags: readonly DeploymentBoardFlag[]): DeploymentBoardStatus {
  if (flags.some((flag) => (
    flag === 'role-mismatch'
    || flag === 'review-due'
    || flag === 'over-secondary-cap'
    || flag === 'package-paused'
  ))) return 'action'
  if (flags.length > 0) return 'watch'
  return 'clear'
}

function scoresForAthlete(
  athlete: Athlete,
  computed: readonly ComputedSession[],
): { primaryScore?: number; secondaryScore?: number } {
  const latest = athleteTimeline([...computed], athlete.id).slice(-1)[0]
  if (!latest) return {}

  const primaryGroup = latest.session.positionGroupSnapshot ?? athlete.positionGroup
  const primaryScore = computeSessionForPositionGroup(
    latest.session,
    athlete,
    latest.event,
    primaryGroup,
  ).fai

  const secondaryGroup = athlete.secondaryPositionGroup
  if (!secondaryGroup || !athlete.secondaryPosition) return { primaryScore }

  const secondaryScore = computeSessionForPositionGroup(
    {
      ...latest.session,
      positionSnapshot: athlete.secondaryPosition,
      positionGroupSnapshot: secondaryGroup,
    },
    {
      ...athlete,
      position: athlete.secondaryPosition,
      positionGroup: secondaryGroup,
    },
    latest.event,
    secondaryGroup,
  ).fai

  return { primaryScore, secondaryScore }
}

export function buildDeploymentBoardRows(input: {
  athletes: readonly Athlete[]
  computed: readonly ComputedSession[]
  awarenessResults: readonly AwarenessResult[]
  filmPlays: readonly FilmPlay[]
  todayIso?: string
}): DeploymentBoardRow[] {
  const rows = input.athletes.map((athlete) => {
    const activeUsage = athlete.usage ?? 'one-way'
    const scores = scoresForAthlete(athlete, input.computed)
    const awarenessScore = latestAwarenessFor([...input.awarenessResults], athlete.id)?.score
    const recommendation = recommendDeployment({
      hasSecondaryPosition: Boolean(athlete.secondaryPosition && athlete.secondaryPositionGroup),
      primaryScore: scores.primaryScore,
      secondaryScore: scores.secondaryScore,
      awarenessScore,
      rosterNeed: athlete.deploymentAssessment?.rosterNeed,
      coachMentalReadiness: athlete.deploymentAssessment?.coachMentalReadiness,
      assignmentReliability: athlete.deploymentAssessment?.assignmentReliability,
    })
    const trackedUsage = trackedDeploymentUsage(athlete, input.filmPlays)
    const flags = deploymentFlagsFor({
      activeUsage,
      recommendation,
      ironManPackage: athlete.ironManPackage,
      trackedUsage,
      todayIso: input.todayIso,
    })

    return {
      athlete,
      activeUsage,
      primaryScore: scores.primaryScore,
      secondaryScore: scores.secondaryScore,
      awarenessScore,
      recommendation,
      trackedUsage,
      flags,
      status: deploymentStatusFor(flags),
    }
  })

  const statusOrder: Record<DeploymentBoardStatus, number> = { action: 0, watch: 1, clear: 2 }
  return rows.sort((left, right) => (
    statusOrder[left.status] - statusOrder[right.status]
    || left.athlete.name.localeCompare(right.athlete.name)
  ))
}
