import { useMemo, useState } from 'react'
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
