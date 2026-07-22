import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card, Pill } from '../components/ui'
import { PlayerBadgeStrip } from '../components/PlayerBadges'
import { FilterBar, EMPTY_FILTERS, applyFilters, type FilterState } from '../components/Filters'
import { athleteTimeline } from '../lib/compute'
import { archetypeFor } from '../lib/archetypes'
import { playerBadgesFor } from '../lib/badges'
import { formatHeight } from '../data/constants'
import { athletePositionLine, usageLabel } from '../data/positions'
import type { Athlete, AthleteResult } from '../types'

const ATHLETE_SEASON_ID = 'season-2026'

interface Row {
  athlete: Athlete
  result?: AthleteResult
}

export default function Athletes() {
  const { data, computed, resultsForEvent, gradeLabelFor, canEdit } = useStore()
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [sort, setSort] = useState<'fai' | 'name'>('fai')

  // Athlete-facing roster cards are intentionally current-season only.
  // Historical seasons remain available from Rankings.
  const seasonResults = resultsForEvent(ATHLETE_SEASON_ID)
  const filteredResults = useMemo(
    () => applyFilters(seasonResults, filters),
    [seasonResults, filters],
  )
  const resultMap = useMemo(
    () => new Map(filteredResults.map((result) => [result.athlete.id, result])),
    [filteredResults],
  )

  const list = useMemo<Row[]>(() => {
    const rows = data.athletes
      .filter((athlete) => {
        if (filters.grade && String(athlete.grade) !== filters.grade) return false
        if (
          filters.group
          && athlete.positionGroup !== filters.group
          && athlete.secondaryPositionGroup !== filters.group
        ) return false
        if (filters.position) {
          const searchable = `${athlete.position} ${athlete.secondaryPosition ?? ''}`.toLowerCase()
          if (!searchable.includes(filters.position.toLowerCase())) return false
        }
        return true
      })
      .map((athlete) => ({ athlete, result: resultMap.get(athlete.id) }))

    rows.sort((a, b) => {
      if (!a.result && !b.result) return a.athlete.name.localeCompare(b.athlete.name)
      if (!a.result) return 1
      if (!b.result) return -1
      if (sort === 'name') return a.athlete.name.localeCompare(b.athlete.name)
      if (a.result.rankEligible !== b.result.rankEligible) return a.result.rankEligible ? -1 : 1
      return b.result.current.fai - a.result.current.fai
    })
    return rows
  }, [data.athletes, filters, resultMap, sort])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Athletes <span className="text-muted">· {data.athletes.length}</span></h1>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-fai">2026 season only</div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-semibold outline-none focus:border-fai"
          >
            <option value="fai">Sort: 2026 FAI</option>
            <option value="name">Sort: Name</option>
          </select>
          {canEdit && (
            <Link to="/athletes/new" className="rounded-lg bg-fai px-4 py-1.5 text-sm font-bold text-ink hover:bg-fai/90">+ Add Athlete</Link>
          )}
        </div>
      </div>

      <FilterBar events={[]} value={filters} onChange={setFilters} showEventFilter={false} />

      {!list.length ? (
        <Card className="p-10 text-center text-muted">No athletes match these filters.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ athlete, result }) => {
            const archetype = result ? archetypeFor(result.current) : undefined
            const seasonTimeline = athleteTimeline(computed, athlete.id).filter(
              (item) => item.event.id === ATHLETE_SEASON_ID,
            )
            const badges = result
              ? playerBadgesFor({ result: { ...result, previous: undefined, faiImprovement: 0, faiImprovementPct: 0 }, timeline: seasonTimeline })
              : []
            const usage = athlete.usage ?? 'one-way'
            return (
              <Card key={athlete.id} className="p-4 transition hover:border-fai/30">
                <div className="flex items-start gap-3">
                  <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={52} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/athletes/${athlete.id}`} className="block truncate text-base font-bold text-chalk hover:text-fai">{athlete.name}</Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <Pill tone="fai">{athlete.positionGroup}</Pill>
                      {usage !== 'one-way' && (
                        <Pill tone={usage === 'iron-man' ? 'gold' : 'up'}>{usageLabel(usage)}</Pill>
                      )}
                      <span>{athletePositionLine(athlete)}</span>
                      <span>· {gradeLabelFor(athlete)}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {formatHeight(athlete.heightIn)} · {athlete.weightLbs} lbs
                      {result?.rankEligible ? ` · 2026 Rank #${result.teamRank}` : ''}
                    </div>
                    <PlayerBadgeStrip badges={badges} />
                    {archetype && (
                      <Link
                        to={`/archetypes#${archetype.id}`}
                        className="mt-2 block rounded-lg border border-fai/20 bg-fai/5 px-2.5 py-2 transition hover:border-fai/50 hover:bg-fai/10"
                        title={`${archetype.description} Based on: ${archetype.evidence.join(', ')}.`}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
                          2026 archetype · {archetype.confidence} confidence
                        </div>
                        <div className="mt-0.5 truncate text-xs font-black text-fai">{archetype.name}</div>
                        <div className="mt-0.5 truncate text-[10px] text-muted">{archetype.evidence.join(' · ')}</div>
                        <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-fai/80">View meaning →</div>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
                  {result ? (
                    <>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                          {result.current.scoreStatus === 'complete' ? '2026 Official FAI' : '2026 Provisional FAI'}
                        </div>
                        <div className={`text-3xl font-black nums ${result.rankEligible ? 'text-fai' : 'text-flame'}`}>
                          {result.current.fai.toFixed(1)}
                        </div>
                        {!result.rankEligible && (
                          <div className="text-[10px] font-bold text-flame">{result.current.completionPct}% complete</div>
                        )}
                      </div>
                      <Pill tone="fai">2026 season</Pill>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-muted">No 2026 testing data</div>
                      {canEdit && (
                        <Link to={`/entry?athlete=${athlete.id}`} className="rounded-lg border border-fai/40 px-3 py-1 text-xs font-bold text-fai hover:bg-fai/10">+ Add 2026 testing</Link>
                      )}
                    </>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
