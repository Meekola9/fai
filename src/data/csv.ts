// ---------------------------------------------------------------------------
// CSV export / import. One row per testing session (athlete bio repeated).
// ---------------------------------------------------------------------------

import type { AppData, Athlete, TestSession, PositionGroup, TestingPhase } from '../types'
import { POSITION_GROUPS, TESTING_PHASES, parseHeight } from './constants'

const NUMERIC_SESSION_KEYS = [
  'benchMax', 'dash40_1', 'dash40_2', 'fly10_1', 'fly10_2',
  'hangCleanReps', 'shuttle20_1', 'shuttle20_2', 'latShuttle_1', 'latShuttle_2',
  'illinois', 'squatMax', 'broadJump', 'verticalJump', 'cond51015',
] as const satisfies readonly (keyof TestSession)[]

type NumericKey = (typeof NUMERIC_SESSION_KEYS)[number]

const COLUMNS = [
  'athleteId', 'name', 'grade', 'position', 'positionGroup', 'heightIn', 'weightLbs',
  'date', 'phase', ...NUMERIC_SESSION_KEYS,
] as const

function esc(v: string | number | undefined): string {
  if (v === undefined || v === null) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv(data: AppData): string {
  const athleteById = new Map(data.athletes.map((a) => [a.id, a]))
  const lines = [COLUMNS.join(',')]
  for (const s of data.sessions) {
    const a = athleteById.get(s.athleteId)
    if (!a) continue
    const row: (string | number | undefined)[] = [
      a.id, a.name, a.grade, a.position, a.positionGroup, a.heightIn, a.weightLbs,
      s.date, s.phase, ...NUMERIC_SESSION_KEYS.map((k) => s[k] as number | undefined),
    ]
    lines.push(row.map(esc).join(','))
  }
  return lines.join('\n')
}

/** Minimal RFC-4180-ish CSV line parser (handles quotes + embedded commas). */
function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

function num(v: string): number | undefined {
  if (v === undefined || v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function id(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Normalize a header for tolerant matching: lowercase, strip spaces/_/-/dots.
function normHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-.]/g, '')
}

// Accepted column-name aliases -> canonical field. Compared after normHeader.
const COLUMN_ALIASES: Record<string, string[]> = {
  athleteId: ['athleteid', 'id'],
  name: ['name', 'athlete', 'player', 'fullname', 'athletename', 'playername'],
  grade: ['grade', 'year', 'class', 'gradelevel', 'yr'],
  position: ['position', 'pos'],
  positionGroup: ['positiongroup', 'group', 'unit', 'posgroup', 'posgrp'],
  heightIn: ['heightin', 'height', 'ht'],
  weightLbs: ['weightlbs', 'weight', 'wt', 'weightlb'],
  date: ['date', 'testingdate', 'testdate'],
  phase: ['phase', 'testingphase', 'period'],
}

// Map a specific position abbreviation to a FAI position group.
const POSITION_TO_GROUP: Record<string, PositionGroup> = {
  QB: 'QB',
  RB: 'RB', HB: 'RB', FB: 'RB', TB: 'RB', ATH: 'RB',
  WR: 'WR', SLOT: 'WR', WO: 'WR', SE: 'WR', FL: 'WR', X: 'WR', Z: 'WR',
  TE: 'TE', HB2: 'TE', Y: 'TE',
  OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL', LT: 'OL', RT: 'OL', LG: 'OL', RG: 'OL', G: 'OL', T: 'OL', CL: 'OL',
  DL: 'DL', DE: 'DL', DT: 'DL', NT: 'DL', NG: 'DL', EDGE: 'DL',
  LB: 'LB', OLB: 'LB', ILB: 'LB', MLB: 'LB', WLB: 'LB', SLB: 'LB', MIKE: 'LB', WILL: 'LB', SAM: 'LB', JACK: 'LB', ROVER: 'LB',
  DB: 'DB', CB: 'DB', S: 'DB', FS: 'DB', SS: 'DB', NB: 'DB', NICKEL: 'DB', CORNER: 'DB', SAFETY: 'DB',
  K: 'K/P', P: 'K/P', 'K/P': 'K/P', KP: 'K/P', PK: 'K/P', LS: 'K/P', ATHK: 'K/P',
}

// Resolve a position group: prefer an explicit group column, else infer it from
// the position. Dual positions like "WR/DB" or "OL/DL" use the first token
// (offense listed first), and common abbreviations (DE, CB, MLB, …) are mapped.
function resolveGroup(rawGroup: string, position: string): PositionGroup {
  const clean = (s: string) => s.trim().toUpperCase().replace(/\s/g, '')

  // 1) explicit group column that is already a valid group
  const grp = clean(rawGroup)
  const directGroup = POSITION_GROUPS.find((g) => g.toUpperCase() === grp)
  if (directGroup) return directGroup
  if (grp && POSITION_TO_GROUP[grp]) return POSITION_TO_GROUP[grp]

  // 2) infer from the position — try the whole thing, then each "/"-separated token
  const pos = clean(position)
  if (POSITION_TO_GROUP[pos]) return POSITION_TO_GROUP[pos]
  const direct = POSITION_GROUPS.find((g) => g.toUpperCase() === pos)
  if (direct) return direct
  for (const token of pos.split(/[/\-|]/)) {
    if (POSITION_TO_GROUP[token]) return POSITION_TO_GROUP[token]
    const g = POSITION_GROUPS.find((x) => x.toUpperCase() === token)
    if (g) return g
  }
  return 'RB'
}

/**
 * Import CSV text into AppData. Column headers are matched case-insensitively
 * against common aliases (Name/Athlete, Grade/Year, Position Group/Group, …), so
 * a plain roster export from a spreadsheet imports cleanly. A testing session is
 * only created for a row when it actually carries test data (or an explicit
 * date/phase) — a names-only roster just adds athletes. Existing data is NOT
 * touched; the caller decides how to merge.
 */
export function importCsv(text: string): AppData {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (rows.length < 2) return { athletes: [], sessions: [] }

  // Find the header row: the first line whose cells include a recognizable
  // "name" column. This skips junk/blank leading rows (e.g. a spreadsheet that
  // starts with an empty ",,," line before the real headers).
  let headerRow = 0
  for (let i = 0; i < rows.length; i++) {
    const cells = parseLine(rows[i]).map((h) => normHeader(h))
    if (cells.some((c) => COLUMN_ALIASES.name.includes(c))) {
      headerRow = i
      break
    }
  }
  const header = parseLine(rows[headerRow]).map((h) => normHeader(h))

  // Resolve a canonical field name to its column index (first alias that hits).
  const colIndex: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    colIndex[field] = header.findIndex((h) => aliases.includes(h))
  }
  // Metric columns match on the normalized metric key (e.g. "dash40_1" -> "dash401").
  const metricIndex: Partial<Record<NumericKey, number>> = {}
  for (const k of NUMERIC_SESSION_KEYS) {
    const i = header.indexOf(normHeader(String(k)))
    if (i >= 0) metricIndex[k] = i
  }

  const athletes = new Map<string, Athlete>()
  const sessions: TestSession[] = []

  for (let r = headerRow + 1; r < rows.length; r++) {
    const cells = parseLine(rows[r])
    const at = (i: number): string => (i >= 0 ? (cells[i] ?? '').trim() : '')
    const field = (f: string): string => at(colIndex[f] ?? -1)

    const name = field('name')
    if (!name) continue
    const grade = num(field('grade')) ?? 9
    const athleteIdRaw = field('athleteId')
    const dedupeKey = athleteIdRaw || `${name}|${grade}`

    // find or create athlete (dedupe within this import)
    let athlete = [...athletes.values()].find((a) =>
      athleteIdRaw ? a.id === athleteIdRaw : `${a.name}|${a.grade}` === dedupeKey,
    )
    if (!athlete) {
      const position = field('position') || 'ATH'
      athlete = {
        id: athleteIdRaw || id(),
        name,
        grade,
        position,
        positionGroup: resolveGroup(field('positionGroup'), position),
        heightIn: parseHeight(field('heightIn')),
        weightLbs: num(field('weightLbs')) ?? 0,
      }
      athletes.set(athlete.id, athlete)
    }

    // Gather any test metrics present on this row.
    const metrics: Partial<Record<NumericKey, number>> = {}
    let hasMetric = false
    for (const k of NUMERIC_SESSION_KEYS) {
      const i = metricIndex[k]
      if (i === undefined) continue
      const v = num(at(i))
      if (v !== undefined) {
        metrics[k] = v
        hasMetric = true
      }
    }

    const dateRaw = field('date')
    const phaseRaw = field('phase') as TestingPhase
    const hasPhase = TESTING_PHASES.includes(phaseRaw)
    // Only record a session if this row carries real testing data.
    if (!hasMetric && !dateRaw && !hasPhase) continue

    const session: TestSession = {
      id: id(),
      athleteId: athlete.id,
      date: dateRaw || new Date().toISOString().slice(0, 10),
      phase: hasPhase ? phaseRaw : 'Baseline',
      ...metrics,
    }
    sessions.push(session)
  }

  return { athletes: [...athletes.values()], sessions }
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
