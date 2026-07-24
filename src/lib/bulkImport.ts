// ---------------------------------------------------------------------------
// Bulk import — the pure parsing / mapping / matching / validation core.
//
// This module is deliberately side-effect free: it turns pasted or uploaded
// spreadsheet text into validated, athlete-matched draft records and a plan the
// UI can preview. Nothing here writes to the store, cloud, or DOM, so it is
// fully unit-testable and the rest of the app never depends on it. Persistence
// happens later, only after a coach approves the preview, through the existing
// safe store paths.
// ---------------------------------------------------------------------------

import type { PositionGroup, TestingPhase } from '../types'
import { TESTING_PHASES, parseHeight } from '../data/constants'
import { positionGroupFor } from '../data/positions'
import { normalizeAthleteName } from './athleteIdentity'
import type { SessionMetricKey } from './events'

// ---------------------------------------------------------------------------
// 1. Delimited parsing (CSV, TSV, and pasted Google Sheets / Excel data)
// ---------------------------------------------------------------------------

export interface ParsedTable {
  headers: string[]
  rows: string[][]
}

/** Guess the delimiter from the first line: tab (pasted sheets) vs comma. */
export function detectDelimiter(text: string): ',' | '\t' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return tabs > commas ? '\t' : ','
}

/**
 * Parse delimited text into a header row + data rows, honoring quoted fields
 * (which may contain the delimiter, newlines, and escaped `""` quotes). Blank
 * trailing lines are ignored; the first non-empty line is treated as headers.
 */
export function parseDelimited(text: string, delimiter?: string): ParsedTable {
  const delim = delimiter ?? detectDelimiter(text)
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  let rowHasContent = false

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    if (rowHasContent) rows.push(row)
    row = []
    rowHasContent = false
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      rowHasContent = true
      continue
    }
    if (char === delim) {
      rowHasContent = true
      pushField()
      continue
    }
    if (char === '\r') continue
    if (char === '\n') {
      pushRow()
      continue
    }
    field += char
    if (char.trim() !== '') rowHasContent = true
  }
  // Flush the final field / row if the text did not end with a newline.
  if (field !== '' || row.length > 0) pushRow()

  const headers = rows.shift() ?? []
  return { headers: headers.map((cell) => cell.trim()), rows }
}

// ---------------------------------------------------------------------------
// 2. Field catalog + column auto-mapping
// ---------------------------------------------------------------------------

export type ImportFieldKind =
  | 'identity'
  | 'name'
  | 'integer'
  | 'number'
  | 'time'
  | 'date'
  | 'position'
  | 'positionGroup'
  | 'phase'
  | 'text'

export type ImportFieldGroup = 'roster' | 'session'

export interface ImportFieldDef {
  key: string
  label: string
  aliases: string[]
  kind: ImportFieldKind
  group: ImportFieldGroup
  /** The TestSession metric this maps to, when it is a measured result. */
  sessionMetric?: SessionMetricKey
  /** For measured results: is a higher raw value better? (drives best-of + sanity) */
  higherBetter?: boolean
  /** Plausible range for a valid value; outside it is flagged for review. */
  sane?: [number, number]
  /** Example value used in the downloadable template. */
  example?: string
}

/** Normalize a header/alias to a comparable token: lowercase alphanumerics. */
export function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export const IMPORT_FIELDS: readonly ImportFieldDef[] = [
  // Identity (shared by roster + results)
  { key: 'athlete_id', label: 'Athlete ID', aliases: ['athleteid', 'playerid', 'id'], kind: 'identity', group: 'roster', example: '' },
  { key: 'student_id', label: 'Student ID', aliases: ['studentid', 'sid', 'lunchnumber'], kind: 'identity', group: 'roster', example: '' },
  { key: 'first_name', label: 'First Name', aliases: ['firstname', 'first', 'fname', 'givenname'], kind: 'name', group: 'roster', example: 'Demek' },
  { key: 'middle_name', label: 'Middle Name', aliases: ['middlename', 'middle', 'mname', 'middleinitial', 'mi'], kind: 'name', group: 'roster', example: '' },
  { key: 'last_name', label: 'Last Name', aliases: ['lastname', 'last', 'lname', 'surname', 'familyname'], kind: 'name', group: 'roster', example: 'Kemp' },
  { key: 'suffix', label: 'Suffix', aliases: ['suffix', 'namesuffix'], kind: 'name', group: 'roster', example: '' },
  { key: 'display_name', label: 'Display Name', aliases: ['displayname', 'name', 'athlete', 'player', 'fullname', 'athletename', 'playername'], kind: 'name', group: 'roster', example: 'Demek Kemp' },
  { key: 'grade', label: 'Grade', aliases: ['grade', 'gradelevel', 'yr', 'classyear'], kind: 'integer', group: 'roster', sane: [7, 12], example: '11' },
  { key: 'graduation_year', label: 'Graduation Year', aliases: ['graduationyear', 'gradyear', 'classof', 'gradyr', 'yog'], kind: 'integer', group: 'roster', sane: [2020, 2040], example: '2027' },
  { key: 'primary_position', label: 'Primary Position', aliases: ['primaryposition', 'position', 'pos', 'primarypos'], kind: 'position', group: 'roster', example: 'WR' },
  { key: 'secondary_position', label: 'Secondary Position', aliases: ['secondaryposition', 'position2', 'secondarypos', 'secondposition'], kind: 'position', group: 'roster', example: 'CB' },
  { key: 'jersey_number', label: 'Jersey Number', aliases: ['jerseynumber', 'jersey', 'number', 'no', 'num'], kind: 'integer', group: 'roster', sane: [0, 99], example: '7' },
  { key: 'team', label: 'Team', aliases: ['team', 'roster', 'squad', 'group', 'unit'], kind: 'text', group: 'roster', example: 'Varsity' },
  { key: 'height', label: 'Height', aliases: ['height', 'ht', 'heightin'], kind: 'text', group: 'roster', example: "5'11" },
  { key: 'weight', label: 'Weight', aliases: ['weight', 'wt', 'weightlbs', 'bodyweight', 'bw'], kind: 'number', group: 'roster', sane: [80, 400], example: '175' },
  { key: 'status', label: 'Status', aliases: ['status', 'active', 'rosterstatus'], kind: 'text', group: 'roster', example: 'active' },

  // Testing session context
  { key: 'testing_date', label: 'Testing Date', aliases: ['testingdate', 'date', 'testdate'], kind: 'date', group: 'session', example: '2026-07-15' },
  { key: 'testing_event', label: 'Testing Event', aliases: ['testingevent', 'event', 'eventname', 'combine', 'session'], kind: 'text', group: 'session', example: '2026 Summer Testing' },
  { key: 'testing_period', label: 'Testing Period', aliases: ['testingperiod', 'period', 'phase', 'testingphase', 'season'], kind: 'phase', group: 'session', example: 'Summer' },
  { key: 'body_weight', label: 'Body Weight (at test)', aliases: ['bodyweight', 'testweight', 'weightattest', 'bw'], kind: 'number', group: 'session', sane: [80, 400], example: '175' },

  // Strength (higher is better)
  { key: 'bench_max', label: 'Bench Max', aliases: ['benchmax', 'bench', 'benchpress', 'bp'], kind: 'number', group: 'session', sessionMetric: 'benchMax', higherBetter: true, sane: [25, 700], example: '225' },
  { key: 'squat_max', label: 'Squat Max', aliases: ['squatmax', 'squat', 'backsquat'], kind: 'number', group: 'session', sessionMetric: 'squatMax', higherBetter: true, sane: [25, 1000], example: '315' },
  { key: 'power_clean_max', label: 'Power Clean Max', aliases: ['powercleanmax', 'powerclean', 'clean', 'pc'], kind: 'number', group: 'session', sessionMetric: 'powerCleanMax', higherBetter: true, sane: [25, 500], example: '205' },
  { key: 'hang_clean_reps', label: 'Hang Clean Reps (body weight)', aliases: ['hangcleanreps', 'hangclean', 'cleanreps'], kind: 'integer', group: 'session', sessionMetric: 'hangCleanReps', higherBetter: true, sane: [0, 50], example: '8' },

  // Speed / agility (lower is better)
  { key: 'forty_yard_dash_1', label: '40 Dash 1', aliases: ['fortyyarddash1', '40yarddash1', '40dash1', '40time1', 'fortyone'], kind: 'time', group: 'session', sessionMetric: 'dash40_1', higherBetter: false, sane: [4, 8], example: '4.82' },
  { key: 'forty_yard_dash_2', label: '40 Dash 2', aliases: ['fortyyarddash2', '40yarddash2', '40dash2', '40time2', 'fortytwo'], kind: 'time', group: 'session', sessionMetric: 'dash40_2', higherBetter: false, sane: [4, 8], example: '4.79' },
  { key: 'forty_yard_dash_best', label: '40 Dash Best', aliases: ['fortyyarddashbest', '40yarddash', '40dash', '40time', '40', 'forty', 'fortybest'], kind: 'time', group: 'session', higherBetter: false, sane: [4, 8], example: '4.79' },
  { key: 'ten_yard_fly_1', label: '10 Fly 1', aliases: ['tenyardfly1', '10fly1', 'fly1'], kind: 'time', group: 'session', sessionMetric: 'fly10_1', higherBetter: false, sane: [0.8, 3], example: '1.05' },
  { key: 'ten_yard_fly_2', label: '10 Fly 2', aliases: ['tenyardfly2', '10fly2', 'fly2'], kind: 'time', group: 'session', sessionMetric: 'fly10_2', higherBetter: false, sane: [0.8, 3], example: '1.02' },
  { key: 'ten_yard_fly_best', label: '10 Fly Best', aliases: ['tenyardflybest', '10fly', 'fly', 'flybest', 'flyin'], kind: 'time', group: 'session', higherBetter: false, sane: [0.8, 3], example: '1.02' },
  { key: 'twenty_yard_shuttle_1', label: '20 Shuttle 1', aliases: ['twentyyardshuttle1', '20shuttle1', 'proagility1', 'shuttle1'], kind: 'time', group: 'session', sessionMetric: 'shuttle20_1', higherBetter: false, sane: [3.2, 8], example: '4.55' },
  { key: 'twenty_yard_shuttle_2', label: '20 Shuttle 2', aliases: ['twentyyardshuttle2', '20shuttle2', 'proagility2', 'shuttle2'], kind: 'time', group: 'session', sessionMetric: 'shuttle20_2', higherBetter: false, sane: [3.2, 8], example: '4.50' },
  { key: 'twenty_yard_shuttle_best', label: '20 Shuttle Best', aliases: ['twentyyardshuttlebest', '20shuttle', 'proagility', 'shuttle', 'fivetenfive'], kind: 'time', group: 'session', higherBetter: false, sane: [3.2, 8], example: '4.50' },
  { key: 'lateral_ten_yard_shuttle_1', label: 'Lateral 10 Shuttle 1', aliases: ['lateraltenyardshuttle1', 'lateralshuttle1', 'lat1', 'latshuttle1'], kind: 'time', group: 'session', sessionMetric: 'latShuttle_1', higherBetter: false, sane: [1.5, 6], example: '2.95' },
  { key: 'lateral_ten_yard_shuttle_2', label: 'Lateral 10 Shuttle 2', aliases: ['lateraltenyardshuttle2', 'lateralshuttle2', 'lat2', 'latshuttle2'], kind: 'time', group: 'session', sessionMetric: 'latShuttle_2', higherBetter: false, sane: [1.5, 6], example: '2.90' },
  { key: 'lateral_ten_yard_shuttle_best', label: 'Lateral 10 Shuttle Best', aliases: ['lateraltenyardshuttlebest', 'lateralshuttle', 'latshuttle'], kind: 'time', group: 'session', higherBetter: false, sane: [1.5, 6], example: '2.90' },
  { key: 'illinois_agility', label: 'Illinois Agility', aliases: ['illinoisagility', 'illinois'], kind: 'time', group: 'session', sessionMetric: 'illinois', higherBetter: false, sane: [10, 30], example: '16.1' },

  // Jumps (higher is better)
  { key: 'broad_jump', label: 'Broad Jump (in)', aliases: ['broadjump', 'standingbroadjump', 'bj'], kind: 'number', group: 'session', sessionMetric: 'broadJump', higherBetter: true, sane: [48, 180], example: '112' },
  { key: 'vertical_jump', label: 'Vertical Jump (in)', aliases: ['verticaljump', 'vertical', 'vert', 'vj'], kind: 'number', group: 'session', sessionMetric: 'verticalJump', higherBetter: true, sane: [5, 60], example: '31' },

  { key: 'coach_notes', label: 'Coach Notes', aliases: ['coachnotes', 'notes', 'note', 'comment', 'comments'], kind: 'text', group: 'session', example: '' },
] as const

const FIELD_BY_KEY = new Map(IMPORT_FIELDS.map((field) => [field.key, field]))

export function importFieldDef(key: string): ImportFieldDef | undefined {
  return FIELD_BY_KEY.get(key)
}

/** field key -> column index in the parsed table. */
export type ColumnMapping = Record<string, number>

export interface AutoMapResult {
  mapping: ColumnMapping
  /** Column indexes that no field claimed. */
  unmapped: number[]
}

/**
 * Suggest a field for each column by matching normalized headers against the
 * catalog aliases (and the field key itself). Each column and field is used at
 * most once; the coach can correct the result before importing.
 */
export function autoMapColumns(headers: string[]): AutoMapResult {
  const aliasToField = new Map<string, string>()
  for (const field of IMPORT_FIELDS) {
    aliasToField.set(normalizeToken(field.key), field.key)
    aliasToField.set(normalizeToken(field.label), field.key)
    for (const alias of field.aliases) aliasToField.set(normalizeToken(alias), field.key)
  }

  const mapping: ColumnMapping = {}
  const usedFields = new Set<string>()
  const unmapped: number[] = []

  headers.forEach((header, index) => {
    const token = normalizeToken(header)
    const fieldKey = token ? aliasToField.get(token) : undefined
    if (fieldKey && !usedFields.has(fieldKey)) {
      mapping[fieldKey] = index
      usedFields.add(fieldKey)
    } else {
      unmapped.push(index)
    }
  })

  return { mapping, unmapped }
}

// ---------------------------------------------------------------------------
// 3. Value parsing
// ---------------------------------------------------------------------------

export function parseNumberCell(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const cleaned = raw.replace(/[,$\s]/g, '').replace(/(lbs?|kg|in|s|sec)$/i, '')
  if (cleaned === '') return undefined
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : undefined
}

export function parseIntegerCell(raw: string | undefined): number | undefined {
  const value = parseNumberCell(raw)
  return value === undefined ? undefined : Math.round(value)
}

export function parseHeightCell(raw: string | undefined): number | undefined {
  if (!raw || raw.trim() === '') return undefined
  const inches = parseHeight(raw)
  return inches > 0 ? inches : undefined
}

/** Normalize a date to ISO yyyy-mm-dd, accepting m/d/yy(yy) and yyyy-mm-dd. */
export function parseDateCell(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const value = raw.trim()
  if (value === '') return undefined
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const slash = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/)
  if (slash) {
    const [, m, d, y] = slash
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return undefined
}

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])

export interface PersonName {
  first?: string
  last?: string
  suffix?: string
  display: string
}

/** Parse a free-form name, handling "Last, First" and trailing suffixes. */
export function parsePersonName(raw: string | undefined): PersonName {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!value) return { display: '' }

  let working = value
  let suffix: string | undefined
  const commaSplit = working.split(',').map((part) => part.trim()).filter(Boolean)
  let first: string | undefined
  let last: string | undefined

  if (commaSplit.length === 2) {
    // "Kemp, Demek" — last, first
    last = commaSplit[0]
    working = commaSplit[1]
  }

  const tokens = working.split(' ').filter(Boolean)
  const lastToken = tokens[tokens.length - 1]
  if (lastToken && SUFFIXES.has(lastToken.replace(/\./g, '').toLowerCase())) {
    suffix = lastToken.replace(/\./g, '')
    tokens.pop()
  }

  if (last) {
    first = tokens.join(' ') || undefined
  } else {
    first = tokens[0]
    last = tokens.length > 1 ? tokens[tokens.length - 1] : undefined
  }

  const display = [first, last].filter(Boolean).join(' ') || value
  return { first, last, suffix, display }
}

/** Best of two attempts. Timed events are lower-better; strength/jumps higher. */
export function bestAttempt(
  a: number | undefined,
  b: number | undefined,
  higherBetter: boolean,
): number | undefined {
  const values = [a, b].filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)
  if (values.length === 0) return undefined
  return higherBetter ? Math.max(...values) : Math.min(...values)
}

// ---------------------------------------------------------------------------
// 4. Draft records + validation
// ---------------------------------------------------------------------------

export interface RosterDraft {
  athleteId?: string
  studentId?: string
  firstName?: string
  lastName?: string
  suffix?: string
  fullName?: string
  grade?: number
  graduationYear?: number
  position?: string
  positionGroup?: PositionGroup
  secondaryPosition?: string
  jersey?: number
  team?: string
  heightIn?: number
  weightLbs?: number
  status?: string
}

export interface SessionDraft {
  athleteId?: string
  studentId?: string
  athleteName?: string
  date?: string
  eventName?: string
  phase?: TestingPhase
  bodyWeight?: number
  metrics: Partial<Record<SessionMetricKey, number>>
  notes?: string
}

function cell(row: string[], mapping: ColumnMapping, key: string): string | undefined {
  const index = mapping[key]
  if (index === undefined) return undefined
  const value = row[index]
  return value === undefined ? undefined : value.trim()
}

/** Build the roster identity/bio draft from a mapped row. */
export function buildRosterDraft(row: string[], mapping: ColumnMapping): RosterDraft {
  const first = cell(row, mapping, 'first_name')
  const last = cell(row, mapping, 'last_name')
  const display = cell(row, mapping, 'display_name')
  const parsed = parsePersonName(display ?? [first, last].filter(Boolean).join(' '))
  const position = cell(row, mapping, 'primary_position')
  const positionGroup = position ? positionGroupFor(position, 'ATH') : undefined

  return {
    athleteId: cell(row, mapping, 'athlete_id') || undefined,
    studentId: cell(row, mapping, 'student_id') || undefined,
    firstName: first || parsed.first,
    lastName: last || parsed.last,
    suffix: cell(row, mapping, 'suffix') || parsed.suffix,
    fullName: parsed.display || undefined,
    grade: parseIntegerCell(cell(row, mapping, 'grade')),
    graduationYear: parseIntegerCell(cell(row, mapping, 'graduation_year')),
    position: position || undefined,
    positionGroup,
    secondaryPosition: cell(row, mapping, 'secondary_position') || undefined,
    jersey: parseIntegerCell(cell(row, mapping, 'jersey_number')),
    team: cell(row, mapping, 'team') || undefined,
    heightIn: parseHeightCell(cell(row, mapping, 'height')),
    weightLbs: parseNumberCell(cell(row, mapping, 'weight')),
    status: cell(row, mapping, 'status') || undefined,
  }
}

/** Build the testing-result draft from a mapped row. */
export function buildSessionDraft(row: string[], mapping: ColumnMapping): SessionDraft {
  const metrics: Partial<Record<SessionMetricKey, number>> = {}
  for (const field of IMPORT_FIELDS) {
    if (!field.sessionMetric) continue
    const value = parseNumberCell(cell(row, mapping, field.key))
    if (value !== undefined) metrics[field.sessionMetric] = value
  }

  // Fold "best" columns into the first-attempt slot when raw attempts are absent,
  // and always keep the true best across attempt-1, attempt-2, and any best cell.
  const bestOfPair = (
    a: SessionMetricKey,
    b: SessionMetricKey,
    bestKey: string,
    higherBetter: boolean,
  ) => {
    const bestCell = parseNumberCell(cell(row, mapping, bestKey))
    const best = bestAttempt(bestAttempt(metrics[a], metrics[b], higherBetter), bestCell, higherBetter)
    if (best !== undefined) metrics[a] = best
  }
  bestOfPair('dash40_1', 'dash40_2', 'forty_yard_dash_best', false)
  bestOfPair('fly10_1', 'fly10_2', 'ten_yard_fly_best', false)
  bestOfPair('shuttle20_1', 'shuttle20_2', 'twenty_yard_shuttle_best', false)
  bestOfPair('latShuttle_1', 'latShuttle_2', 'lateral_ten_yard_shuttle_best', false)

  const phaseRaw = cell(row, mapping, 'testing_period')
  const phase = phaseRaw
    ? TESTING_PHASES.find((item) => normalizeToken(item) === normalizeToken(phaseRaw))
    : undefined

  return {
    athleteId: cell(row, mapping, 'athlete_id') || undefined,
    studentId: cell(row, mapping, 'student_id') || undefined,
    athleteName: parsePersonName(cell(row, mapping, 'display_name')).display || undefined,
    date: parseDateCell(cell(row, mapping, 'testing_date')),
    eventName: cell(row, mapping, 'testing_event') || undefined,
    phase,
    bodyWeight: parseNumberCell(cell(row, mapping, 'body_weight')),
    metrics,
    notes: cell(row, mapping, 'coach_notes') || undefined,
  }
}

export type IssueSeverity = 'error' | 'warning' | 'review'

export interface RowIssue {
  field?: string
  severity: IssueSeverity
  message: string
}

/** Validate a roster draft. Errors block import; reviews need a human look. */
export function validateRosterDraft(draft: RosterDraft): RowIssue[] {
  const issues: RowIssue[] = []
  if (!draft.fullName && !draft.firstName && !draft.lastName && !draft.athleteId) {
    issues.push({ severity: 'error', field: 'display_name', message: 'A name (or athlete ID) is required to create an athlete.' })
  }
  if (draft.grade !== undefined && (draft.grade < 7 || draft.grade > 12)) {
    issues.push({ severity: 'review', field: 'grade', message: `Grade ${draft.grade} is outside 7–12.` })
  }
  if (
    draft.grade !== undefined &&
    draft.graduationYear !== undefined &&
    (draft.graduationYear < 2020 || draft.graduationYear > 2040)
  ) {
    issues.push({ severity: 'review', field: 'graduation_year', message: `Graduation year ${draft.graduationYear} looks off.` })
  }
  if (draft.position && !isKnownPosition(draft.position)) {
    issues.push({ severity: 'review', field: 'primary_position', message: `Position "${draft.position}" is unrecognized; it will map to ${draft.positionGroup ?? 'ATH'}.` })
  }
  if (draft.weightLbs !== undefined && (draft.weightLbs <= 0 || draft.weightLbs > 400)) {
    issues.push({ severity: 'review', field: 'weight', message: `Weight ${draft.weightLbs} lbs is outside a realistic range.` })
  }
  return issues
}

function isKnownPosition(position: string): boolean {
  const group = positionGroupFor(position, 'ATH')
  // positionGroupFor falls back to ATH for anything unrecognized; treat an
  // explicit ATH input as known, otherwise a fallback-to-ATH means unknown.
  return group !== 'ATH' || normalizeToken(position) === 'ath'
}

/**
 * Validate a testing draft, including unit-sanity checks (e.g. a 40 time of 45
 * almost certainly means 4.5). Suspicious values are flagged, never silently
 * changed.
 */
export function validateSessionDraft(draft: SessionDraft): RowIssue[] {
  const issues: RowIssue[] = []
  const metricKeys = Object.keys(draft.metrics) as SessionMetricKey[]
  const hasMetric = metricKeys.some((key) => typeof draft.metrics[key] === 'number')

  if (!draft.athleteId && !draft.athleteName && !draft.studentId) {
    issues.push({ severity: 'error', message: 'A result row needs an athlete name, athlete ID, or student ID.' })
  }
  if (!hasMetric) {
    issues.push({ severity: 'warning', message: 'No measured results were found in this row.' })
  }
  if (!draft.date) {
    issues.push({ severity: 'review', field: 'testing_date', message: 'No testing date — the result will use the session default.' })
  }
  if (draft.bodyWeight !== undefined && (draft.bodyWeight < 80 || draft.bodyWeight > 400)) {
    issues.push({ severity: 'review', field: 'body_weight', message: `Body weight ${draft.bodyWeight} lbs is outside a realistic range.` })
  }

  for (const field of IMPORT_FIELDS) {
    if (!field.sessionMetric || !field.sane) continue
    const value = draft.metrics[field.sessionMetric]
    if (typeof value !== 'number') continue
    if (value <= 0) {
      issues.push({ severity: 'error', field: field.key, message: `${field.label} must be positive.` })
      continue
    }
    const [lo, hi] = field.sane
    if (value < lo || value > hi) {
      const suggestion = suggestUnitFix(value, lo, hi)
      issues.push({
        severity: 'review',
        field: field.key,
        message: `${field.label} of ${value} is outside the expected range (${lo}–${hi})${suggestion ? ` — did you mean ${suggestion}?` : ''}.`,
      })
    }
  }
  return issues
}

/** Suggest a decimal-shift fix for an obviously mis-scaled value (45 → 4.5). */
function suggestUnitFix(value: number, lo: number, hi: number): string | undefined {
  for (const factor of [10, 100]) {
    const scaled = value / factor
    if (scaled >= lo && scaled <= hi) return String(scaled)
  }
  return undefined
}

export function worstSeverity(issues: RowIssue[]): IssueSeverity | undefined {
  if (issues.some((issue) => issue.severity === 'error')) return 'error'
  if (issues.some((issue) => issue.severity === 'review')) return 'review'
  if (issues.some((issue) => issue.severity === 'warning')) return 'warning'
  return undefined
}

// ---------------------------------------------------------------------------
// 5. Athlete matching
// ---------------------------------------------------------------------------

export type MatchConfidence = 'exact' | 'high' | 'ambiguous' | 'none'

export interface RosterAthlete {
  id: string
  name: string
  grade?: number
  graduationYear?: number
}

export interface MatchResult {
  athleteId?: string
  confidence: MatchConfidence
  candidates: RosterAthlete[]
}

function nameParts(value: string): string[] {
  return normalizeAthleteName(value).split(' ').filter(Boolean)
}

function isInitialStyle(value: string): boolean {
  const [first] = nameParts(value)
  return Boolean(first && first.length <= 2)
}

/**
 * Match a draft to an existing athlete without ever auto-merging an uncertain
 * result. Returns `exact`/`high` when confident, `ambiguous` (with candidates)
 * when several plausibly fit, and `none` when nothing matches.
 */
export function matchAthlete(
  draft: { athleteId?: string; fullName?: string; athleteName?: string; grade?: number; graduationYear?: number },
  roster: readonly RosterAthlete[],
  aliases?: ReadonlyMap<string, string>,
): MatchResult {
  // 1. Stable ID wins outright.
  if (draft.athleteId) {
    const byId = roster.find((athlete) => athlete.id === draft.athleteId)
    if (byId) return { athleteId: byId.id, confidence: 'exact', candidates: [byId] }
  }

  const rawName = draft.fullName ?? draft.athleteName ?? ''
  if (!rawName.trim()) return { confidence: 'none', candidates: [] }
  const normalized = normalizeAthleteName(rawName)

  // 2. Coach-saved alias.
  const aliasId = aliases?.get(normalized)
  if (aliasId) {
    const aliased = roster.find((athlete) => athlete.id === aliasId)
    if (aliased) return { athleteId: aliased.id, confidence: 'high', candidates: [aliased] }
  }

  // 3. Exact normalized full-name match.
  const exact = roster.filter((athlete) => normalizeAthleteName(athlete.name) === normalized)
  if (exact.length === 1) return { athleteId: exact[0].id, confidence: 'exact', candidates: exact }
  if (exact.length > 1) {
    const narrowed = disambiguate(exact, draft)
    return narrowed
      ? { athleteId: narrowed.id, confidence: 'high', candidates: exact }
      : { confidence: 'ambiguous', candidates: exact }
  }

  // 4. Initial-style match: "D Kemp" ~ "Demek Kemp".
  const parts = nameParts(rawName)
  const first = parts[0]
  const last = parts.at(-1)
  if (first && last) {
    const candidates = roster.filter((athlete) => {
      const candidateParts = nameParts(athlete.name)
      const candidateFirst = candidateParts[0]
      const candidateLast = candidateParts.at(-1)
      if (!candidateFirst || candidateLast !== last) return false
      return isInitialStyle(rawName)
        ? candidateFirst.startsWith(first[0])
        : candidateFirst[0] === first[0]
    })
    if (candidates.length === 1) return { athleteId: candidates[0].id, confidence: 'high', candidates }
    if (candidates.length > 1) {
      const narrowed = disambiguate(candidates, draft)
      return narrowed
        ? { athleteId: narrowed.id, confidence: 'high', candidates }
        : { confidence: 'ambiguous', candidates }
    }
  }

  return { confidence: 'none', candidates: [] }
}

/** Break ties between same-name candidates using grade / graduation year. */
function disambiguate(
  candidates: RosterAthlete[],
  draft: { grade?: number; graduationYear?: number },
): RosterAthlete | undefined {
  if (draft.graduationYear !== undefined) {
    const byYear = candidates.filter((athlete) => athlete.graduationYear === draft.graduationYear)
    if (byYear.length === 1) return byYear[0]
  }
  if (draft.grade !== undefined) {
    const byGrade = candidates.filter((athlete) => athlete.grade === draft.grade)
    if (byGrade.length === 1) return byGrade[0]
  }
  return undefined
}

// ---------------------------------------------------------------------------
// 6. Downloadable templates
// ---------------------------------------------------------------------------

const ROSTER_TEMPLATE_KEYS = [
  'athlete_id', 'student_id', 'first_name', 'middle_name', 'last_name', 'suffix',
  'display_name', 'grade', 'graduation_year', 'primary_position', 'secondary_position',
  'jersey_number', 'team', 'height', 'weight', 'status',
]

const RESULTS_TEMPLATE_KEYS = [
  'athlete_id', 'student_id', 'display_name', 'testing_date', 'testing_event', 'testing_period',
  'grade', 'primary_position', 'body_weight', 'bench_max', 'squat_max', 'power_clean_max',
  'hang_clean_reps', 'forty_yard_dash_1', 'forty_yard_dash_2', 'forty_yard_dash_best',
  'ten_yard_fly_1', 'ten_yard_fly_2', 'ten_yard_fly_best', 'twenty_yard_shuttle_1',
  'twenty_yard_shuttle_2', 'twenty_yard_shuttle_best', 'lateral_ten_yard_shuttle_1',
  'lateral_ten_yard_shuttle_2', 'lateral_ten_yard_shuttle_best', 'illinois_agility',
  'broad_jump', 'vertical_jump', 'coach_notes',
]

function templateCsv(keys: string[]): string {
  const header = keys.join(',')
  const example = keys
    .map((key) => {
      const value = FIELD_BY_KEY.get(key)?.example ?? ''
      return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
    })
    .join(',')
  return `${header}\n${example}\n`
}

export function rosterTemplateCsv(): string {
  return templateCsv(ROSTER_TEMPLATE_KEYS)
}

export function resultsTemplateCsv(): string {
  return templateCsv(RESULTS_TEMPLATE_KEYS)
}
