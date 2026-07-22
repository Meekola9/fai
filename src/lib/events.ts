import type { AppData, Athlete, TestSession, TestingEvent, TestingPhase } from '../types'
import { estimatePowerClean1RM } from './powerClean'

export const SESSION_METRIC_KEYS = [
  'benchMax',
  'dash40_1',
  'dash40_2',
  'dash10_1',
  'dash10_2',
  'fly10_1',
  'fly10_2',
  'powerCleanMax',
  'hangCleanReps',
  'shuttle20_1',
  'shuttle20_2',
  'latShuttle_1',
  'latShuttle_2',
  'illinois',
  'squatMax',
  'broadJump',
  'verticalJump',
  'cond51015',
] as const satisfies readonly (keyof TestSession)[]

export type SessionMetricKey = (typeof SESSION_METRIC_KEYS)[number]

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function legacyEventId(phase: string): string {
  return `legacy-${slug(phase) || 'testing'}`
}

/** Upgrade legacy datasets in memory without deleting or rewriting source data. */
export function normalizeAppData(input: AppData): Required<AppData> {
  const athletes = Array.isArray(input.athletes) ? input.athletes : []
  const sessions = Array.isArray(input.sessions) ? input.sessions : []
  const suppliedEvents = Array.isArray(input.events) ? input.events : []
  const events = [...suppliedEvents]
  const eventById = new Map(events.map((event) => [event.id, event]))

  for (const session of sessions) {
    const id = session.eventId || legacyEventId(session.phase)
    if (!eventById.has(id)) {
      const matching = sessions.filter((item) => (item.eventId || legacyEventId(item.phase)) === id)
      const dates = matching.map((item) => item.date).filter(Boolean).sort()
      const event: TestingEvent = {
        id,
        name: `${session.phase} Testing`,
        phase: session.phase,
        startDate: dates[0] || session.date,
        endDate: dates[dates.length - 1] || session.date,
        status: 'closed',
        createdAt: `${dates[0] || session.date}T12:00:00.000Z`,
      }
      events.push(event)
      eventById.set(id, event)
    }
  }

  const athleteById = new Map(athletes.map((athlete) => [athlete.id, athlete]))
  const upgradedSessions = sessions.map((session, index) => {
    const athlete = athleteById.get(session.athleteId)
    return {
      ...session,
      eventId: session.eventId || legacyEventId(session.phase),
      createdAt: session.createdAt || `${session.date}T12:00:${String(index % 60).padStart(2, '0')}.000Z`,
      gradeSnapshot: session.gradeSnapshot ?? athlete?.grade,
      positionSnapshot: session.positionSnapshot ?? athlete?.position,
      positionGroupSnapshot: session.positionGroupSnapshot ?? athlete?.positionGroup,
      weightLbsSnapshot: session.weightLbsSnapshot ?? athlete?.weightLbs,
    }
  })

  const plays = Array.isArray(input.plays) ? input.plays : []
  const filmPlays = Array.isArray(input.filmPlays) ? input.filmPlays : []
  return { athletes, sessions: upgradedSessions, events, plays, filmPlays }
}

/** Timed tests where a lower result is better; everything else is higher-better. */
const LOWER_IS_BETTER: ReadonlySet<SessionMetricKey> = new Set<SessionMetricKey>([
  'dash40_1',
  'dash40_2',
  'dash10_1',
  'dash10_2',
  'fly10_1',
  'fly10_2',
  'shuttle20_1',
  'shuttle20_2',
  'latShuttle_1',
  'latShuttle_2',
  'illinois',
])

/**
 * Fold one session's metrics into the running best. Testing happens on many
 * different days across a year, so each metric keeps the athlete's best mark
 * from any session that year — a coach only needs to have done the test, not
 * done every test on one day.
 */
function overlayBest(target: TestSession, source: TestSession): void {
  for (const key of SESSION_METRIC_KEYS) {
    const value = source[key]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue

    // The old clean test used body weight as the load. Compare converted maxes,
    // not rep totals, because an athlete's testing weight can change by season.
    if (key === 'hangCleanReps') {
      const bodyWeight = source.hangCleanWeightLbsSnapshot ?? source.weightLbsSnapshot
      const estimated = estimatePowerClean1RM(bodyWeight, value)
      if (!estimated) continue
      const currentEstimate = target.estimatedPowerCleanMax
      if (typeof currentEstimate !== 'number' || estimated > currentEstimate) {
        target.hangCleanReps = value
        target.hangCleanWeightLbsSnapshot = bodyWeight
        target.estimatedPowerCleanMax = estimated
      }
      continue
    }

    const current = (target as unknown as Record<string, number | undefined>)[key]
    const next =
      typeof current !== 'number'
        ? value
        : LOWER_IS_BETTER.has(key)
          ? Math.min(current, value)
          : Math.max(current, value)
    ;(target as unknown as Record<string, unknown>)[key] = next
  }
}

function seasonYear(date: string): string {
  return (date || '').slice(0, 4)
}

/** One synthetic "season" event per calendar year present in the data. */
export function seasonEvents(data: AppData): TestingEvent[] {
  const normalized = normalizeAppData(data)
  const byYear = new Map<string, { dates: string[]; phase: TestingPhase; stamp: string }>()
  for (const session of normalized.sessions) {
    const year = seasonYear(session.date)
    if (!year) continue
    const stamp = `${session.date}|${session.createdAt ?? ''}`
    const existing = byYear.get(year)
    if (!existing) {
      byYear.set(year, { dates: [session.date], phase: session.phase, stamp })
    } else {
      existing.dates.push(session.date)
      if (stamp > existing.stamp) {
        existing.stamp = stamp
        existing.phase = session.phase
      }
    }
  }

  return [...byYear.entries()]
    .map(([year, info]) => {
      const dates = info.dates.filter(Boolean).sort()
      return {
        id: `season-${year}`,
        name: year,
        phase: info.phase,
        startDate: dates[0] ?? `${year}-01-01`,
        endDate: dates[dates.length - 1] ?? `${year}-12-31`,
        status: 'closed' as const,
        createdAt: `${dates[0] ?? `${year}-01-01`}T12:00:00.000Z`,
      }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/**
 * Merge every testing session into one athlete result per calendar year.
 * Tests taken on different days across the year are combined, and each metric
 * keeps the athlete's best mark for that year.
 */
export function mergeEventSessions(data: AppData): Array<{
  athlete: Athlete
  event: TestingEvent
  session: TestSession
}> {
  const normalized = normalizeAppData(data)
  const athleteById = new Map(normalized.athletes.map((athlete) => [athlete.id, athlete]))
  const seasonById = new Map(seasonEvents(data).map((event) => [event.id, event]))
  const groups = new Map<string, TestSession[]>()

  for (const session of normalized.sessions) {
    const year = seasonYear(session.date)
    if (!year) continue
    const key = `${year}:${session.athleteId}`
    const list = groups.get(key) ?? []
    list.push(session)
    groups.set(key, list)
  }

  const merged: Array<{ athlete: Athlete; event: TestingEvent; session: TestSession }> = []
  for (const sessions of groups.values()) {
    sessions.sort((a, b) =>
      `${a.date}|${a.createdAt ?? ''}|${a.id}`.localeCompare(`${b.date}|${b.createdAt ?? ''}|${b.id}`),
    )
    const latest = sessions[sessions.length - 1]
    const athlete = athleteById.get(latest.athleteId)
    const event = seasonById.get(`season-${seasonYear(latest.date)}`)
    if (!athlete || !event) continue

    const composite: TestSession = {
      id: `season-${event.name}-${athlete.id}`,
      athleteId: athlete.id,
      eventId: event.id,
      date: latest.date,
      phase: event.phase,
      createdAt: latest.createdAt,
      gradeSnapshot: latest.gradeSnapshot ?? athlete.grade,
      positionSnapshot: latest.positionSnapshot ?? athlete.position,
      positionGroupSnapshot: latest.positionGroupSnapshot ?? athlete.positionGroup,
      weightLbsSnapshot: latest.weightLbsSnapshot ?? athlete.weightLbs,
    }
    for (const source of sessions) overlayBest(composite, source)
    merged.push({ athlete, event, session: composite })
  }

  return merged
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  metricCount: number
}

const LIMITS: Partial<Record<SessionMetricKey, [number, number]>> = {
  benchMax: [25, 1000],
  dash40_1: [3.5, 8],
  dash40_2: [3.5, 8],
  dash10_1: [1.2, 3],
  dash10_2: [1.2, 3],
  fly10_1: [0.8, 3],
  fly10_2: [0.8, 3],
  powerCleanMax: [25, 700],
  hangCleanReps: [1, 50],
  shuttle20_1: [3.2, 8],
  shuttle20_2: [3.2, 8],
  latShuttle_1: [1.5, 6],
  latShuttle_2: [1.5, 6],
  illinois: [10, 30],
  squatMax: [25, 1500],
  broadJump: [48, 180],
  verticalJump: [5, 60],
  cond51015: [20, 300],
}

export function validateSession(session: Partial<TestSession>): ValidationResult {
  const errors: string[] = []
  let metricCount = 0
  for (const key of SESSION_METRIC_KEYS) {
    const value = session[key]
    if (value === undefined) continue
    metricCount += 1
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${String(key)} must be a number.`)
      continue
    }
    const limits = LIMITS[key]
    if (limits && (value < limits[0] || value > limits[1])) {
      errors.push(`${String(key)} is outside the allowed range (${limits[0]}–${limits[1]}).`)
    }
  }
  if (!session.athleteId) errors.push('Select an athlete.')
  if (!session.eventId) errors.push('Select a testing event.')
  if (!session.date) errors.push('Enter a testing date.')
  if (metricCount === 0) errors.push('Enter at least one test result before saving.')
  return { valid: errors.length === 0, errors, metricCount }
}
