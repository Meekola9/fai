import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card, DeltaBadge, Pill } from '../components/ui'
import { FilterBar, EMPTY_FILTERS, applyFilters, type FilterState } from '../components/Filters'
import { formatHeight } from '../data/constants'
import type { Athlete, AthleteResult } from '../types'

function trendOf(value: number) {
  return value > 0.05 ? 'improved' : value < -0.05 ? 'regressed' : ('same' as const)
}

interface Row {
  athlete: Athlete
  result?: AthleteResult
}

export default function Athletes() {
  const { data, results, resultsForEvent, gradeLabelFor, canEdit } = useStore()
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [sort, setSort] = useState<'fai' | 'name' | 'improve'>('fai')

  const selectedResults = useMemo(
    () => (filters.eventId ? resultsForEvent(filters.eventId) : results),
    [filters.eventId, resultsForEvent, results],
  )
  const filteredResults = useMemo(
    () => applyFilters(selectedResults, filters),
    [selectedResults, filters],
  )
  const resultMap = useMemo(
    () => new Map(filteredResults.map((result) => [result.athlete.id, result])),
    [filteredResults],
  )

  const list = useMemo<Row[]>(() => {
    const rows = data.athletes
      .filter((athlete) => {
        if (filters.grade && String(athlete.grade) !== filters.grade) return false
        if (filters.group && athlete.positionGroup !== filters.group) return false
        if (filters.position && !athlete.position.toLowerCase().includes(filters.position.toLowerCase())) return false
        if (filters.eventId) return resultMap.has(athlete.id)
        return true
      })
      .map((athlete) => ({ athlete, result: resultMap.get(athlete.id) }))

    rows.sort((a, b) => {
      if (!a.result && !b.result) return a.athlete.name.localeCompare(b.athlete.name)
      if (!a.result) return 1
      if (!b.result) return -1
      if (sort === 'name') return a.athlete.name.localeCompare(b.athlete.name)
      if (sort === 'improve') return b.result.faiImprovement - a.result.faiImprovement
      if (a.result.rankEligible !== b.result.rankEligible) return a.result.rankEligible ? -1 : 1
      return b.result.current.fai - a.result.current.fai
    })
    return rows
  }, [data.athletes, filters, resultMap, sort])

  const selectedEvent = data.events.find((event) => event.id === filters.eventId)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Athletes <span className="text-muted">· {data.athletes.length}</span></h1>
          {selectedEvent && <div className="mt-1 text-xs text-muted">Viewing {selectedEvent.name}</div>}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-semibold outline-none focus:border-fai"
          >
            <option value="fai">Sort: FAI</option>
            <option value="improve">Sort: Improvement</option>
            <option value="name">Sort: Name</option>
          </select>
          {canEdit && (
            <Link to="/athletes/new" className="rounded-lg bg-fai px-4 py-1.5 text-sm font-bold text-ink hover:bg-fai/90">+ Add Athlete</Link>
          )}
        </div>
      </div>

      <FilterBar events={data.events} value={filters} onChange={setFilters} />

      {!list.length ? (
        <Card className="p-10 text-center text-muted">No athletes match these filters.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ athlete, result }) => (
            <Card key={athlete.id} className="p-4 transition hover:border-fai/30">
              <div className="flex items-start gap-3">
                <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={52} />
                <div className="min-w-0 flex-1">
                  <Link to={`/athletes/${athlete.id}`} className="block truncate text-base font-bold text-chalk hover:text-fai">{athlete.name}</Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <Pill tone="fai">{athlete.positionGroup}</Pill>
                    <span>{athlete.position}</span>
                    <span>· {gradeLabelFor(athlete)}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {formatHeight(athlete.heightIn)} · {athlete.weightLbs} lbs
                    {result?.rankEligible ? ` · Rank #${result.teamRank}` : ''}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                {result ? (
                  <>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {result.current.scoreStatus === 'complete' ? 'Official FAI' : 'Provisional FAI'}
                      </div>
                      <div className={`text-3xl font-black nums ${result.rankEligible ? 'text-fai' : 'text-flame'}`}>
                        {result.current.fai.toFixed(1)}
                      </div>
                      {!result.rankEligible && (
                        <div className="text-[10px] font-bold text-flame">{result.current.completionPct}% complete</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Since prior event</div>
                      {result.previous ? (
                        <DeltaBadge value={result.faiImprovement} trend={trendOf(result.faiImprovement)} size="lg" />
                      ) : (
                        <div className="text-sm text-muted">First event</div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-muted">No testing data yet</div>
                    {canEdit && (
                      <Link to={`/entry?athlete=${athlete.id}`} className="rounded-lg border border-fai/40 px-3 py-1 text-xs font-bold text-fai hover:bg-fai/10">+ Add testing</Link>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
