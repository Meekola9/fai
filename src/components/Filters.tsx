import { useMemo } from 'react'
import type { AthleteResult } from '../types'
import { GRADES, POSITION_GROUPS, TESTING_PHASES } from '../data/constants'

export interface FilterState {
  grade: string
  group: string
  position: string
  phase: string
  date: string
}

// eslint-disable-next-line react-refresh/only-export-components
export const EMPTY_FILTERS: FilterState = {
  grade: '',
  group: '',
  position: '',
  phase: '',
  date: '',
}

/** Predicate applying the filter set to a computed athlete result. */
// eslint-disable-next-line react-refresh/only-export-components
export function applyFilters(results: AthleteResult[], f: FilterState): AthleteResult[] {
  return results.filter((r) => {
    if (f.grade && String(r.athlete.grade) !== f.grade) return false
    if (f.group && r.athlete.positionGroup !== f.group) return false
    if (f.position && !r.athlete.position.toLowerCase().includes(f.position.toLowerCase()))
      return false
    if (f.phase && r.current.session.phase !== f.phase) return false
    if (f.date && r.current.session.date !== f.date) return false
    return true
  })
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-semibold text-chalk outline-none focus:border-fai"
    >
      {children}
    </select>
  )
}

export function FilterBar({
  results,
  value,
  onChange,
}: {
  results: AthleteResult[]
  value: FilterState
  onChange: (f: FilterState) => void
}) {
  const dates = useMemo(
    () =>
      Array.from(new Set(results.map((r) => r.current.session.date))).sort().reverse(),
    [results],
  )
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch })
  const active =
    value.grade || value.group || value.position || value.phase || value.date

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.group} onChange={(v) => set({ group: v })}>
        <option value="">All Groups</option>
        {POSITION_GROUPS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </Select>
      <Select value={value.grade} onChange={(v) => set({ grade: v })}>
        <option value="">All Grades</option>
        {GRADES.map((g) => (
          <option key={g} value={g}>
            Grade {g}
          </option>
        ))}
      </Select>
      <Select value={value.phase} onChange={(v) => set({ phase: v })}>
        <option value="">All Phases</option>
        {TESTING_PHASES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>
      <Select value={value.date} onChange={(v) => set({ date: v })}>
        <option value="">All Dates</option>
        {dates.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
      <input
        value={value.position}
        onChange={(e) => set({ position: e.target.value })}
        placeholder="Position…"
        className="w-28 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai"
      />
      {active && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:text-chalk"
        >
          Clear
        </button>
      )}
    </div>
  )
}
