import type { AthleteResult, TestingEvent } from '../types'
import { GRADES, POSITION_GROUPS } from '../data/constants'

export interface FilterState {
  grade: string
  group: string
  position: string
  eventId: string
}

// eslint-disable-next-line react-refresh/only-export-components
export const EMPTY_FILTERS: FilterState = {
  grade: '',
  group: '',
  position: '',
  eventId: '',
}

// eslint-disable-next-line react-refresh/only-export-components
export function applyFilters(results: AthleteResult[], filters: FilterState): AthleteResult[] {
  return results.filter((result) => {
    const group = result.current.session.positionGroupSnapshot ?? result.athlete.positionGroup
    if (filters.grade && String(result.current.session.gradeSnapshot ?? result.athlete.grade) !== filters.grade) return false
    if (filters.group && group !== filters.group) return false
    if (
      filters.position &&
      !(result.current.session.positionSnapshot ?? result.athlete.position)
        .toLowerCase()
        .includes(filters.position.toLowerCase())
    ) return false
    return true
  })
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-semibold text-chalk outline-none focus:border-fai"
    >
      {children}
    </select>
  )
}

export function FilterBar({
  events,
  value,
  onChange,
}: {
  events: TestingEvent[]
  value: FilterState
  onChange: (filters: FilterState) => void
}) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch })
  const active = value.grade || value.group || value.position || value.eventId
  const orderedEvents = [...events].sort((a, b) => b.startDate.localeCompare(a.startDate))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.eventId} onChange={(eventId) => set({ eventId })}>
        <option value="">Latest event per athlete</option>
        {orderedEvents.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name} · {event.startDate}
          </option>
        ))}
      </Select>
      <Select value={value.group} onChange={(group) => set({ group })}>
        <option value="">All Groups</option>
        {POSITION_GROUPS.map((group) => <option key={group}>{group}</option>)}
      </Select>
      <Select value={value.grade} onChange={(grade) => set({ grade })}>
        <option value="">All Grades</option>
        {GRADES.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
      </Select>
      <input
        value={value.position}
        onChange={(event) => set({ position: event.target.value })}
        placeholder="Position…"
        className="w-28 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai"
      />
      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:text-chalk"
        >
          Clear
        </button>
      )}
    </div>
  )
}
