from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:140]!r}")
    file.write_text(text.replace(old, new, 1))


Path('src/lib/deploymentBoard.ts').write_text(r'''import type {
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
''')


Path('src/lib/deploymentBoard.test.ts').write_text(r'''import { describe, expect, it } from 'vitest'
import type { Athlete, FilmPlay } from '../types'
import {
  deploymentFlagsFor,
  deploymentStatusFor,
  positionSideForGroup,
  trackedDeploymentUsage,
} from './deploymentBoard'
import { recommendDeployment } from './deploymentRecommendation'

const athlete: Athlete = {
  id: 'athlete-1',
  name: 'Board Athlete',
  grade: 11,
  position: 'X',
  positionGroup: 'WR',
  usage: 'iron-man',
  secondaryPosition: 'Boundary Corner',
  secondaryPositionGroup: 'DB',
  heightIn: 72,
  weightLbs: 185,
  ironManPackage: {
    status: 'ready',
    formations: ['Doubles'],
    calls: ['Cloud', 'Sky'],
    secondarySnapCapPct: 30,
    reviewDate: '2026-08-20',
  },
}

function play(id: string, side: FilmPlay['side']): FilmPlay {
  return {
    id,
    side,
    annotations: [{
      id: `track-${id}`,
      kind: 'trail',
      athleteId: athlete.id,
      points: [{ x: 0.4, y: 0.5 }],
    }],
  }
}

describe('deployment board usage tracking', () => {
  it('maps position groups to their side of the ball', () => {
    expect(positionSideForGroup('WR')).toBe('offense')
    expect(positionSideForGroup('DB')).toBe('defense')
    expect(positionSideForGroup('K/P')).toBe('special')
    expect(positionSideForGroup('ATH')).toBeUndefined()
  })

  it('counts distinct tracked film snaps and calculates secondary usage', () => {
    const usage = trackedDeploymentUsage(athlete, [
      play('1', 'offense'),
      play('2', 'defense'),
      play('3', 'defense'),
      play('4', 'defense'),
    ])
    expect(usage.primarySnaps).toBe(1)
    expect(usage.secondarySnaps).toBe(3)
    expect(usage.totalTrackedSnaps).toBe(4)
    expect(usage.secondaryPct).toBe(75)
  })

  it('does not invent a split when both positions are on the same side', () => {
    const usage = trackedDeploymentUsage({
      ...athlete,
      secondaryPosition: 'Slot WR',
      secondaryPositionGroup: 'WR',
    }, [play('1', 'offense')])
    expect(usage.sameSideRoles).toBe(true)
    expect(usage.secondaryPct).toBeUndefined()
  })
})

describe('deployment board flags', () => {
  it('marks over-cap Iron Man usage as action required', () => {
    const recommendation = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 78,
      secondaryScore: 72,
      awarenessScore: 76,
      rosterNeed: 'rotation',
      coachMentalReadiness: 3,
      assignmentReliability: 74,
    })
    const flags = deploymentFlagsFor({
      activeUsage: 'iron-man',
      recommendation,
      ironManPackage: athlete.ironManPackage,
      trackedUsage: {
        primarySnaps: 1,
        secondarySnaps: 3,
        totalTrackedSnaps: 4,
        secondaryPct: 75,
        sameSideRoles: false,
      },
      todayIso: '2026-08-03',
    })
    expect(flags).toContain('over-secondary-cap')
    expect(deploymentStatusFor(flags)).toBe('action')
  })

  it('flags due reviews and incomplete packages without changing the athlete role', () => {
    const recommendation = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 76,
      secondaryScore: 70,
      rosterNeed: 'rotation',
      coachMentalReadiness: 3,
      assignmentReliability: 73,
    })
    const flags = deploymentFlagsFor({
      activeUsage: 'iron-man',
      recommendation,
      ironManPackage: {
        status: 'installing',
        formations: [],
        calls: [],
        secondarySnapCapPct: 30,
        reviewDate: '2026-08-01',
      },
      trackedUsage: {
        primarySnaps: 0,
        secondarySnaps: 0,
        totalTrackedSnaps: 0,
        sameSideRoles: false,
      },
      todayIso: '2026-08-03',
    })
    expect(flags).toContain('review-due')
    expect(flags).toContain('package-incomplete')
  })
})
''')


Path('src/pages/DeploymentBoard.tsx').write_text(r'''import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Pill } from '../components/ui'
import { useAccountAccess } from '../hooks/useAccountAccess'
import {
  buildDeploymentBoardRows,
  DEPLOYMENT_FLAG_LABELS,
  type DeploymentBoardFlag,
  type DeploymentBoardRow,
} from '../lib/deploymentBoard'
import { playerUsageDefinition } from '../lib/playerUsage'
import { useStore } from '../store/useStore'
import type { PlayerUsage } from '../types'

type BoardFilter = 'all' | 'action' | PlayerUsage

const FILTERS: Array<{ value: BoardFilter; label: string }> = [
  { value: 'all', label: 'All athletes' },
  { value: 'action', label: 'Action needed' },
  { value: 'iron-man', label: 'Iron Man' },
  { value: 'two-way', label: 'Two-Way' },
  { value: 'one-way', label: 'Primary Specialists' },
]

function usageTone(usage: PlayerUsage): 'fai' | 'gold' | 'up' {
  if (usage === 'iron-man') return 'gold'
  if (usage === 'two-way') return 'up'
  return 'fai'
}

function flagTone(flag: DeploymentBoardFlag): 'gold' | 'down' {
  return flag === 'missing-evidence' || flag === 'package-incomplete' ? 'gold' : 'down'
}

function metric(value: number | undefined): string {
  return typeof value === 'number' ? value.toFixed(1) : '—'
}

function StatBox({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-ink/45 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="mt-1 text-xl font-black text-chalk nums">{value}</div>
      {note && <div className="mt-1 text-[11px] leading-relaxed text-muted">{note}</div>}
    </div>
  )
}

function AthleteDeploymentCard({ row, canManageRoster }: { row: DeploymentBoardRow; canManageRoster: boolean }) {
  const active = playerUsageDefinition(row.activeUsage)
  const recommended = playerUsageDefinition(row.recommendation.usage)
  const pkg = row.athlete.ironManPackage
  const tracked = row.trackedUsage

  return (
    <Card className={`p-4 ${row.status === 'action' ? 'border-down/35' : row.status === 'watch' ? 'border-gold/30' : ''}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/athletes/${row.athlete.id}`} className="text-lg font-black text-chalk hover:text-fai">
              {row.athlete.name}
            </Link>
            <Pill tone={usageTone(row.activeUsage)}>{active.label}</Pill>
            {row.recommendation.usage !== row.activeUsage && row.recommendation.confidence >= 68 && (
              <Pill tone="down">Recommends {recommended.label}</Pill>
            )}
          </div>
          <div className="mt-1 text-xs font-semibold text-muted">
            {row.athlete.position} · {row.athlete.positionGroup}
            {row.athlete.secondaryPosition && row.athlete.secondaryPositionGroup
              ? ` → ${row.athlete.secondaryPosition} · ${row.athlete.secondaryPositionGroup}`
              : ' · No secondary role'}
          </div>
          <div className="mt-3 text-sm font-black text-chalk">{row.recommendation.headline}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted">
            {row.recommendation.reasons[0]}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link to={`/athletes/${row.athlete.id}`} className="rounded-lg border border-line px-3 py-2 text-xs font-black text-chalk hover:bg-panel-2">Profile</Link>
          {canManageRoster && (
            <Link to={`/athletes/${row.athlete.id}/edit`} className="rounded-lg bg-fai px-3 py-2 text-xs font-black text-ink">Review plan</Link>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <StatBox label="Primary FAI" value={metric(row.primaryScore)} />
        <StatBox label="Secondary FAI" value={metric(row.secondaryScore)} />
        <StatBox label="Awareness" value={row.awarenessScore?.toFixed(0) ?? '—'} />
        <StatBox label="Evidence" value={`${row.recommendation.confidence}%`} note={`${row.recommendation.missingInputs.length} missing inputs`} />
        <StatBox label="Readiness" value={row.recommendation.readinessScore?.toFixed(0) ?? '—'} />
      </div>

      {row.activeUsage === 'iron-man' && (
        <div className="mt-4 grid gap-3 rounded-xl border border-fai/20 bg-fai/5 p-3 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-fai">Restricted package</div>
            {pkg ? (
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <div><strong className="text-chalk">Status:</strong> <span className="capitalize text-muted">{pkg.status}</span></div>
                <div><strong className="text-chalk">Ceiling:</strong> <span className="text-muted">{pkg.secondarySnapCapPct}% secondary</span></div>
                <div><strong className="text-chalk">Formations:</strong> <span className="text-muted">{pkg.formations.join(', ') || 'Not installed'}</span></div>
                <div><strong className="text-chalk">Calls:</strong> <span className="text-muted">{pkg.calls.length}/10 installed</span></div>
                {pkg.reviewDate && <div className="sm:col-span-2"><strong className="text-chalk">Review:</strong> <span className="text-muted">{new Date(`${pkg.reviewDate}T12:00:00`).toLocaleDateString()}</span></div>}
              </div>
            ) : (
              <div className="mt-2 text-xs font-bold text-gold">No restricted package is installed.</div>
            )}
          </div>
          <div className="rounded-lg border border-line bg-ink/45 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">Tracked film workload</div>
            {tracked.sameSideRoles ? (
              <div className="mt-2 text-xs text-muted">Both positions are on the same side, so film cannot separate the role split.</div>
            ) : tracked.totalTrackedSnaps > 0 ? (
              <>
                <div className={`mt-1 text-2xl font-black nums ${row.flags.includes('over-secondary-cap') ? 'text-down' : 'text-chalk'}`}>{tracked.secondaryPct?.toFixed(1)}%</div>
                <div className="text-xs text-muted">{tracked.secondarySnaps} secondary · {tracked.primarySnaps} primary · {tracked.totalTrackedSnaps} tracked snaps</div>
              </>
            ) : (
              <div className="mt-2 text-xs text-muted">No athlete-linked film snaps yet. This is coverage data, not an estimated snap count.</div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {row.flags.length > 0 ? row.flags.map((flag) => (
          <Pill key={flag} tone={flagTone(flag)}>{DEPLOYMENT_FLAG_LABELS[flag]}</Pill>
        )) : <Pill tone="up">Plan clear</Pill>}
      </div>
    </Card>
  )
}

export default function DeploymentBoard() {
  const { data, computed } = useStore()
  const access = useAccountAccess()
  const [filter, setFilter] = useState<BoardFilter>('all')
  const [query, setQuery] = useState('')
  const rows = useMemo(() => buildDeploymentBoardRows({
    athletes: data.athletes,
    computed,
    awarenessResults: data.awarenessResults,
    filmPlays: data.filmPlays,
  }), [computed, data.athletes, data.awarenessResults, data.filmPlays])

  const filteredRows = rows.filter((row) => {
    if (filter === 'action' && row.status !== 'action') return false
    if (filter !== 'all' && filter !== 'action' && row.activeUsage !== filter) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [
      row.athlete.name,
      row.athlete.position,
      row.athlete.secondaryPosition ?? '',
      playerUsageDefinition(row.activeUsage).label,
    ].some((value) => value.toLowerCase().includes(needle))
  })

  const actionCount = rows.filter((row) => row.status === 'action').length
  const ironManCount = rows.filter((row) => row.activeUsage === 'iron-man').length
  const twoWayCount = rows.filter((row) => row.activeUsage === 'two-way').length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="page-kicker">Roster operations</div>
          <h1 className="page-title">Deployment Board</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Review every Primary Specialist, Iron Man, and Two-Way plan in one place. Recommendations remain coach-controlled; tracked workload uses athlete-linked film snaps only.
          </p>
        </div>
        <Link to="/athletes" className="rounded-lg border border-line px-4 py-2 text-sm font-black text-chalk hover:bg-panel-2">Open roster</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox label="Roster" value={String(rows.length)} note="All active athlete profiles" />
        <StatBox label="Iron Man" value={String(ironManCount)} note="Restricted secondary packages" />
        <StatBox label="Two-Way" value={String(twoWayCount)} note="Two complete position plans" />
        <StatBox label="Action needed" value={String(actionCount)} note="Cap, review, pause, or role mismatch" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Deployment board filters">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-lg border px-3 py-2 text-xs font-black ${filter === item.value ? 'border-fai bg-fai text-ink' : 'border-line text-muted hover:text-chalk'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search athlete or position"
            className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai lg:max-w-xs"
          />
        </div>
      </Card>

      <div className="space-y-3">
        {filteredRows.length > 0 ? filteredRows.map((row) => (
          <AthleteDeploymentCard
            key={row.athlete.id}
            row={row}
            canManageRoster={access.capabilities.canManageRoster}
          />
        )) : (
          <Card className="p-8 text-center">
            <div className="text-base font-black text-chalk">No athletes match this view.</div>
            <div className="mt-1 text-sm text-muted">Change the filter or search term.</div>
          </Card>
        )}
      </div>
    </div>
  )
}
''')


Path('e2e/deployment-smoke.spec.ts').write_text(r'''import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('fai:data:v2')) return
    localStorage.removeItem('fai:data:v1')
    const athleteId = 'deployment-qa'
    const trackedPlay = (id: string, side: 'offense' | 'defense') => ({
      id,
      side,
      annotations: [{
        id: `track-${id}`,
        kind: 'trail',
        athleteId,
        points: [{ x: 0.4, y: 0.5 }],
      }],
    })
    localStorage.setItem('fai:data:v2', JSON.stringify({
      athletes: [{
        id: athleteId,
        name: 'Deployment QA',
        grade: 11,
        position: 'X',
        positionGroup: 'WR',
        usage: 'one-way',
        heightIn: 72,
        weightLbs: 185,
      }],
      events: [{
        id: 'deployment-event',
        name: 'Deployment QA 2026',
        phase: 'Preseason',
        startDate: '2026-08-01',
        status: 'open',
      }],
      sessions: [{
        id: 'deployment-session',
        athleteId,
        eventId: 'deployment-event',
        date: '2026-08-01',
        phase: 'Preseason',
        gradeSnapshot: 11,
        positionSnapshot: 'X',
        positionGroupSnapshot: 'WR',
        weightLbsSnapshot: 185,
        benchMax: 275,
        dash40_1: 4.35,
        dash40_2: 4.38,
        dash10_1: 1.45,
        dash10_2: 1.47,
        fly10_1: 0.95,
        fly10_2: 0.97,
        powerCleanMax: 300,
        shuttle20_1: 4.08,
        shuttle20_2: 4.12,
        latShuttle_1: 2.60,
        latShuttle_2: 2.64,
        illinois: 15.45,
        squatMax: 425,
        broadJump: 120,
        verticalJump: 36,
        cond51015: 17,
      }],
      plays: [],
      filmSources: [],
      filmPlays: [
        trackedPlay('film-1', 'offense'),
        trackedPlay('film-2', 'defense'),
        trackedPlay('film-3', 'defense'),
        trackedPlay('film-4', 'defense'),
      ],
      awarenessResults: [{
        id: 'awareness-qa',
        athleteId,
        quizId: 'fai-awareness-v1',
        score: 82,
        correct: 8,
        total: 10,
        takenAt: '2026-08-02T12:00:00.000Z',
      }],
    }))
  })
})

test('coach installs, persists, and audits an Iron Man package', async ({ page }) => {
  await page.goto('/#/athletes/deployment-qa/edit')
  await expect(page.getByRole('heading', { name: 'Edit athlete' })).toBeVisible()

  await page.getByRole('button', { name: /Iron Man/ }).first().click()
  await page.getByPlaceholder('e.g. Star').fill('Boundary Corner')
  await page.getByText('Secondary Group', { exact: true }).locator('..').getByRole('combobox').selectOption('DB')
  await page.getByLabel('Roster need').selectOption('rotation')
  await page.getByLabel('Mental readiness').selectOption('3')
  await page.getByPlaceholder('0-100').fill('74')

  await expect(page.getByText('Iron Man restricted package is recommended', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Apply Iron Man', exact: true }).click()

  await page.locator('select').filter({ has: page.locator('option[value="ready"]') }).selectOption('ready')
  await page.getByPlaceholder('Doubles\nTrips').fill('Doubles\nTrips')
  await page.getByPlaceholder('Cloud\nSky\nBoundary pressure').fill('Cloud\nSky\nBoundary pressure')
  await page.getByLabel('Secondary snap ceiling').fill('30')
  await page.getByLabel('Package review date').fill('2026-08-20')
  await page.getByPlaceholder('Example: field-side only; no motion checks; play Cloud unless the formation is empty.').fill('Field-side only. Keep the check family fixed.')
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()

  await expect(page.getByText('Restricted package', { exact: true })).toBeVisible()
  await expect(page.getByText('Doubles, Trips', { exact: true })).toBeVisible()
  await expect(page.getByText('3/10 installed', { exact: true })).toBeVisible()
  await expect(page.getByText('30% snap ceiling', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText('Doubles, Trips', { exact: true })).toBeVisible()
  await expect(page.getByText('Field-side only. Keep the check family fixed.', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Deployment', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Deployment Board', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Deployment QA', exact: true })).toBeVisible()
  await expect(page.getByText('Over snap ceiling', { exact: true })).toBeVisible()
  await expect(page.getByText('75.0%', { exact: true })).toBeVisible()

  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('fai:data:v2')
    if (!raw) throw new Error('FAI deployment data was not persisted')
    const data = JSON.parse(raw) as {
      athletes: Array<{
        id: string
        usage?: string
        deploymentAssessment?: { rosterNeed?: string; coachMentalReadiness?: number; assignmentReliability?: number }
        ironManPackage?: { status?: string; formations?: string[]; calls?: string[]; secondarySnapCapPct?: number }
      }>
    }
    return data.athletes.find((athlete) => athlete.id === 'deployment-qa')
  })

  expect(saved).toMatchObject({
    usage: 'iron-man',
    deploymentAssessment: {
      rosterNeed: 'rotation',
      coachMentalReadiness: 3,
      assignmentReliability: 74,
    },
    ironManPackage: {
      status: 'ready',
      formations: ['Doubles', 'Trips'],
      calls: ['Cloud', 'Sky', 'Boundary pressure'],
      secondarySnapCapPct: 30,
    },
  })
})
''')


replace_once(
    'src/App.tsx',
    "import Athletes from './pages/Athletes'\n",
    "import Athletes from './pages/Athletes'\nimport DeploymentBoard from './pages/DeploymentBoard'\n",
)

replace_once(
    'src/App.tsx',
    "  if (capabilities.canManageAwards || role === 'owner' || role === 'admin') nav.push({ to: '/playmakers', label: 'Playmakers' })",
    "  if (capabilities.canManageRoster || capabilities.canManageTesting || role === 'owner' || role === 'admin') nav.push({ to: '/deployment', label: 'Deployment' })\n  if (capabilities.canManageAwards || role === 'owner' || role === 'admin') nav.push({ to: '/playmakers', label: 'Playmakers' })",
)

replace_once(
    'src/App.tsx',
    "          <Route path=\"/athletes\" element={staffOrPublic ? <Athletes /> : <Navigate to=\"/account/profile\" replace />} />\n",
    "          <Route path=\"/athletes\" element={staffOrPublic ? <Athletes /> : <Navigate to=\"/account/profile\" replace />} />\n          <Route path=\"/deployment\" element={allowed(!viewerMode && staffOrPublic && (access.capabilities.canManageRoster || access.capabilities.canManageTesting || ownerOrAdmin), <DeploymentBoard />, 'Your coach role does not include deployment planning access.')} />\n",
)

replace_once(
    'e2e/route-health.spec.ts',
    "  '/', '/leaderboards', '/athletes', '/playmakers', '/film', '/development',",
    "  '/', '/leaderboards', '/athletes', '/deployment', '/playmakers', '/film', '/development',",
)

replace_once(
    'e2e/route-health.spec.ts',
    "  for (const route of ['/', '/leaderboards', '/athletes', '/import', '/quiz', '/development']) {",
    "  for (const route of ['/', '/leaderboards', '/athletes', '/deployment', '/import', '/quiz', '/development']) {",
)

print('Deployment Board and smoke test implementation applied.')
