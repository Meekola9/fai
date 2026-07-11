import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card, DeltaBadge, Pill } from '../components/ui'
import { FilterBar, EMPTY_FILTERS, applyFilters, type FilterState } from '../components/Filters'
import { formatHeight } from '../data/constants'
import type { Athlete, AthleteResult } from '../types'

function trendOf(v: number) {
  return v > 0.05 ? 'improved' : v < -0.05 ? 'regressed' : ('same' as const)
}

interface Row {
  athlete: Athlete
  result?: AthleteResult
}

export default function Athletes() {
  const { data, results, resultByAthlete } = useStore()
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [sort, setSort] = useState<'fai' | 'name' | 'improve'>('fai')

  const list = useMemo<Row[]>(() => {
    // Athletes that have testing data, after filters (incl. phase/date).
    const tested = new Set(applyFilters(results, filters).map((r) => r.athlete.id))
    // A phase/date filter only makes sense for athletes with sessions, so when
    // either is set we hide untested athletes entirely.
    const hideUntested = Boolean(filters.phase || filters.date)

    const rows: Row[] = data.athletes
      .filter((a) => {
        if (filters.grade && String(a.grade) !== filters.grade) return false
        if (filters.group && a.positionGroup !== filters.group) return false
        if (filters.position && !a.position.toLowerCase().includes(filters.position.toLowerCase()))
          return false
        const result = resultByAthlete.get(a.id)
        if (result) return tested.has(a.id)
        return !hideUntested // untested athlete: keep unless phase/date filter active
      })
      .map((a) => ({ athlete: a, result: resultByAthlete.get(a.id) }))

    rows.sort((x, y) => {
      // Untested athletes always sort to the bottom.
      if (!x.result && !y.result) return x.athlete.name.localeCompare(y.athlete.name)
      if (!x.result) return 1
      if (!y.result) return -1
      if (sort === 'name') return x.athlete.name.localeCompare(y.athlete.name)
      if (sort === 'improve') return y.result.faiImprovement - x.result.faiImprovement
      return y.result.current.fai - x.result.current.fai
    })
    return rows
  }, [data.athletes, results, resultByAthlete, filters, sort])

  const untestedCount = data.athletes.length - results.length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">
          Athletes <span className="text-muted">· {data.athletes.length}</span>
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-semibold outline-none focus:border-fai"
          >
            <option value="fai">Sort: FAI</option>
            <option value="improve">Sort: Improvement</option>
            <option value="name">Sort: Name</option>
          </select>
          <Link
            to="/athletes/new"
            className="rounded-lg bg-fai px-4 py-1.5 text-sm font-bold text-ink hover:bg-fai/90"
          >
            + Add Athlete
          </Link>
        </div>
      </div>

      <FilterBar results={results} value={filters} onChange={setFilters} />

      {untestedCount > 0 && !filters.phase && !filters.date && (
        <div className="rounded-lg border border-line bg-panel-2/40 px-3 py-2 text-xs text-muted">
          {untestedCount} athlete{untestedCount === 1 ? '' : 's'} have no testing data yet — they
          appear here but won't show on leaderboards or the dashboard until a session is logged.
        </div>
      )}

      {!list.length ? (
        <Card className="p-10 text-center text-muted">No athletes match these filters.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ athlete: a, result: r }) => (
            <Card key={a.id} className="p-4 transition hover:border-fai/30">
              <div className="flex items-start gap-3">
                <Avatar name={a.name} photoUrl={a.photoUrl} size={52} />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/athletes/${a.id}`}
                    className="block truncate text-base font-bold text-chalk hover:text-fai"
                  >
                    {a.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <Pill tone="fai">{a.positionGroup}</Pill>
                    <span>{a.position}</span>
                    <span>· Gr {a.grade}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {formatHeight(a.heightIn)} · {a.weightLbs} lbs
                    {r ? ` · Rank #${r.teamRank}` : ''}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                {r ? (
                  <>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        FAI
                      </div>
                      <div className="text-3xl font-black nums text-fai">{r.current.fai.toFixed(1)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Since last
                      </div>
                      {r.previous ? (
                        <DeltaBadge value={r.faiImprovement} trend={trendOf(r.faiImprovement)} size="lg" />
                      ) : (
                        <div className="text-sm text-muted">First test</div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-muted">No testing data yet</div>
                    <Link
                      to={`/entry?athlete=${a.id}`}
                      className="rounded-lg border border-fai/40 px-3 py-1 text-xs font-bold text-fai hover:bg-fai/10"
                    >
                      + Add testing
                    </Link>
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
