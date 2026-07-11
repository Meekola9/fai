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

function trendOf(v: number) {
  return v > 0.05 ? 'improved' : v < -0.05 ? 'regressed' : ('same' as const)
}

function BoardRows({ def, results }: { def: LeaderboardDef; results: AthleteResult[] }) {
  const rows = def.rows(results)
  if (!rows.length) return <div className="p-4 text-sm text-muted">No data.</div>
  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const a = row.result.athlete
        return (
          <Link
            key={a.id}
            to={`/athletes/${a.id}`}
            className="flex items-center gap-3 rounded-xl bg-panel-2/40 px-3 py-2 transition hover:bg-panel-2"
          >
            <RankBadge rank={row.rank} />
            <Avatar name={a.name} photoUrl={a.photoUrl} size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-chalk">{a.name}</div>
              <div className="text-xs text-muted">
                {a.positionGroup} · Gr {a.grade}
              </div>
            </div>
            {def.id !== 'improved' && row.result.previous && (
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
  const { results } = useStore()
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [boardId, setBoardId] = useState('fai')

  const filtered = useMemo(() => applyFilters(results, filters), [results, filters])
  const board = ALL_LEADERBOARDS.find((b) => b.id === boardId)!
  const groupBoards = useMemo(() => positionGroupBoards(filtered), [filtered])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Leaderboards</h1>
        <FilterBar results={results} value={filters} onChange={setFilters} />
      </div>

      {/* Board selector */}
      <div className="flex flex-wrap gap-1.5">
        {CORE_LEADERBOARDS.map((b) => (
          <BoardChip key={b.id} active={boardId === b.id} onClick={() => setBoardId(b.id)}>
            {b.title}
          </BoardChip>
        ))}
        <span className="mx-1 self-center text-muted">·</span>
        {TEST_LEADERBOARDS.map((b) => (
          <BoardChip key={b.id} active={boardId === b.id} onClick={() => setBoardId(b.id)}>
            {b.title}
          </BoardChip>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle right={board.subtitle ? <Pill>{board.subtitle}</Pill> : undefined}>
            {board.title}
          </SectionTitle>
          <BoardRows def={board} results={filtered} />
        </Card>

        {/* Position group rankings */}
        <Card className="p-5">
          <SectionTitle>Position Group Rankings</SectionTitle>
          <div className="space-y-4">
            {groupBoards.map((gb) => (
              <div key={gb.group}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-md bg-flame/15 px-2 py-0.5 text-xs font-black text-flame">
                    {gb.group}
                  </span>
                  <span className="text-xs text-muted">{gb.rows.length} athletes</span>
                </div>
                <div className="space-y-1">
                  {gb.rows.slice(0, 3).map((row) => (
                    <Link
                      key={row.result.athlete.id}
                      to={`/athletes/${row.result.athlete.id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-panel-2"
                    >
                      <span className="w-4 text-center font-black nums text-muted">{row.rank}</span>
                      <span className="flex-1 truncate font-semibold text-chalk">
                        {row.result.athlete.name}
                      </span>
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
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
        active ? 'bg-fai text-ink' : 'bg-panel-2 text-muted hover:text-chalk'
      }`}
    >
      {children}
    </button>
  )
}
