import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import {
  ALL_LEADERBOARDS,
  CORE_LEADERBOARDS,
  TEST_LEADERBOARDS,
  positionGroupBoards,
  type LeaderboardDef,
} from '../lib/leaderboards'
import { Avatar, Card, DeltaBadge, Pill, RankBadge, SectionTitle } from '../components/ui'
import { FilterBar, EMPTY_FILTERS, applyFilters, type FilterState } from '../components/Filters'
import type { AthleteResult } from '../types'

function trendOf(value: number) {
  return value > 0.05 ? 'improved' : value < -0.05 ? 'regressed' : ('same' as const)
}

function BoardRows({ definition, results }: { definition: LeaderboardDef; results: AthleteResult[] }) {
  const rows = definition.rows(results)
  if (!rows.length) {
    return <div className="p-4 text-sm text-muted">No complete scores are available for this board.</div>
  }
  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const athlete = row.result.athlete
        return (
          <Link
            key={athlete.id}
            to={`/athletes/${athlete.id}`}
            className="flex items-center gap-3 rounded-xl bg-panel-2/40 px-3 py-2 transition hover:bg-panel-2"
          >
            <RankBadge rank={row.rank} />
            <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-chalk">{athlete.name}</div>
              <div className="text-xs text-muted">
                {row.result.current.session.positionGroupSnapshot ?? athlete.positionGroup} · Gr{' '}
                {row.result.current.session.gradeSnapshot ?? athlete.grade}
              </div>
            </div>
            {definition.id !== 'improved' && row.result.previous && (
              <DeltaBadge value={row.result.faiImprovement} trend={trendOf(row.result.faiImprovement)} />
            )}
            <div className="w-20 text-right text-xl font-black nums text-fai">{row.display}</div>
          </Link>
        )
      })}
    </div>
  )
}

export default function Leaderboards() {
  const { data, results, resultsForEvent } = useStore()
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [boardId, setBoardId] = useState('fai')

  const selectedResults = useMemo(
    () => (filters.eventId ? resultsForEvent(filters.eventId) : results),
    [filters.eventId, resultsForEvent, results],
  )
  const filtered = useMemo(
    () => applyFilters(selectedResults, filters),
    [selectedResults, filters],
  )
  const board = ALL_LEADERBOARDS.find((item) => item.id === boardId) ?? ALL_LEADERBOARDS[0]
  const groupBoards = useMemo(() => positionGroupBoards(filtered), [filtered])
  const provisional = filtered.filter((result) => !result.rankEligible).length
  const selectedEvent = data.events.find((event) => event.id === filters.eventId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Leaderboards</h1>
          {selectedEvent && (
            <div className="mt-1 text-xs text-muted">
              Historical event: {selectedEvent.name} · {selectedEvent.startDate}
            </div>
          )}
        </div>
        <FilterBar events={data.events} value={filters} onChange={setFilters} />
      </div>

      {provisional > 0 && (
        <div className="rounded-lg border border-flame/30 bg-flame/5 px-4 py-3 text-sm text-muted">
          {provisional} provisional or insufficient score{provisional === 1 ? '' : 's'} are excluded from official rankings.
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {CORE_LEADERBOARDS.map((item) => (
          <BoardChip key={item.id} active={boardId === item.id} onClick={() => setBoardId(item.id)}>
            {item.title}
          </BoardChip>
        ))}
        <span className="mx-1 self-center text-muted">·</span>
        {TEST_LEADERBOARDS.map((item) => (
          <BoardChip key={item.id} active={boardId === item.id} onClick={() => setBoardId(item.id)}>
            {item.title}
          </BoardChip>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle right={board.subtitle ? <Pill>{board.subtitle}</Pill> : undefined}>
            {board.title}
          </SectionTitle>
          <BoardRows definition={board} results={filtered} />
        </Card>

        <Card className="p-5">
          <SectionTitle>Position Group Rankings</SectionTitle>
          <div className="space-y-4">
            {groupBoards.length === 0 && <div className="text-sm text-muted">No complete group rankings.</div>}
            {groupBoards.map((groupBoard) => (
              <div key={groupBoard.group}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-md bg-flame/15 px-2 py-0.5 text-xs font-black text-flame">{groupBoard.group}</span>
                  <span className="text-xs text-muted">{groupBoard.rows.length} ranked</span>
                </div>
                <div className="space-y-1">
                  {groupBoard.rows.slice(0, 3).map((row) => (
                    <Link
                      key={row.result.athlete.id}
                      to={`/athletes/${row.result.athlete.id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-panel-2"
                    >
                      <span className="w-4 text-center font-black nums text-muted">{row.rank}</span>
                      <span className="flex-1 truncate font-semibold text-chalk">{row.result.athlete.name}</span>
                      <span className="font-black nums text-fai">{row.display}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function BoardChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${active ? 'bg-fai text-ink' : 'bg-panel-2 text-muted hover:text-chalk'}`}
    >
      {children}
    </button>
  )
}
