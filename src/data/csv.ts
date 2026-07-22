import type {
  AppData,
  Athlete,
  PlayEvent,
  PositionGroup,
  TestSession,
  TestingEvent,
  TestingPhase,
} from '../types'
import { POSITION_GROUPS, TESTING_PHASES, parseHeight } from './constants'
import { normalizeAppData, SESSION_METRIC_KEYS } from '../lib/events'

const COLUMNS = [
  'recordType',
  'athleteId',
  'name',
  'grade',
  'position',
  'positionGroup',
  'heightIn',
  'weightLbs',
  'photoUrl',
  'hudlUrl',
  'eventId',
  'eventName',
  'eventPhase',
  'eventStartDate',
  'eventEndDate',
  'sessionId',
  'date',
  'createdAt',
  'gradeSnapshot',
  'positionSnapshot',
  'positionGroupSnapshot',
  'weightLbsSnapshot',
  ...SESSION_METRIC_KEYS,
  'playId',
  'playType',
  'opponent',
  'note',
] as const

function protectSpreadsheetFormula(value: string): string {
  return /^[=+@]/.test(value) ? `'${value}` : value
}

function escapeCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return ''
  const stringValue = protectSpreadsheetFormula(String(value))
  return /[",\r\n]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue
}

function row(values: Record<string, string | number | undefined>): string {
  return COLUMNS.map((column) => escapeCell(values[column])).join(',')
}

/** Export roster, events, and sessions separately so untested athletes are preserved. */
export function exportCsv(input: AppData): string {
  const data = normalizeAppData(input)
  const lines = [COLUMNS.join(',')]

  for (const athlete of data.athletes) {
    lines.push(row({
      recordType: 'athlete',
      athleteId: athlete.id,
      name: athlete.name,
      grade: athlete.grade,
      position: athlete.position,
      positionGroup: athlete.positionGroup,
      heightIn: athlete.heightIn,
      weightLbs: athlete.weightLbs,
      photoUrl: athlete.photoUrl,
      hudlUrl: athlete.hudlUrl,
    }))
  }

  for (const event of data.events) {
    lines.push(row({
      recordType: 'event',
      eventId: event.id,
      eventName: event.name,
      eventPhase: event.phase,
      eventStartDate: event.startDate,
      eventEndDate: event.endDate,
      createdAt: event.createdAt,
    }))
  }

  for (const session of data.sessions) {
    const values: Record<string, string | number | undefined> = {
      recordType: 'session',
      athleteId: session.athleteId,
      eventId: session.eventId,
      sessionId: session.id,
      date: session.date,
      createdAt: session.createdAt,
      gradeSnapshot: session.gradeSnapshot,
      positionSnapshot: session.positionSnapshot,
      positionGroupSnapshot: session.positionGroupSnapshot,
      weightLbsSnapshot: session.weightLbsSnapshot,
    }
    for (const key of SESSION_METRIC_KEYS) values[key] = session[key]
    lines.push(row(values))
  }

  for (const play of data.plays) {
    lines.push(row({
      recordType: 'play',
      athleteId: play.athleteId,
      playId: play.id,
      playType: play.type,
      date: play.date,
      opponent: play.opponent,
      note: play.note,
      createdAt: play.createdAt,
    }))
  }

  return lines.join('\n')
}

/** Parse full CSV text, including quoted commas and line breaks. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          currentCell += '"'
          index += 1
        } else quoted = false
      } else currentCell += character
      continue
    }

    if (character === '"') quoted = true
    else if (character === ',') {
      currentRow.push(currentCell)
      currentCell = ''
    } else if (character === '\n') {
      currentRow.push(currentCell.replace(/\r$/, ''))
      if (currentRow.some((cell) => cell.trim() !== '')) rows.push(currentRow)
      currentRow = []
      currentCell = ''
    } else currentCell += character
  }

  currentRow.push(currentCell.replace(/\r$/, ''))
  if (currentRow.some((cell) => cell.trim() !== '')) rows.push(currentRow)
  if (quoted) throw new Error('CSV contains an unclosed quoted field.')
  return rows
}

function numberValue(value: string): number | undefined {
  if (!value || value.trim() === '') return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[\s_\-.]/g, '')
}

const COLUMN_ALIASES: Record<string, string[]> = {
  recordType: ['recordtype', 'type'],
  athleteId: ['athleteid', 'playerid'],
  name: ['name', 'athlete', 'player', 'fullname', 'athletename', 'playername'],
  grade: ['grade', 'year', 'class', 'gradelevel', 'yr'],
  position: ['position', 'pos'],
  positionGroup: ['positiongroup', 'group', 'unit', 'posgroup', 'posgrp'],
  heightIn: ['heightin', 'height', 'ht'],
  weightLbs: ['weightlbs', 'weight', 'wt', 'weightlb'],
  photoUrl: ['photourl', 'photo'],
  hudlUrl: ['hudlurl', 'hudl', 'film', 'filmurl', 'filmlink'],
  eventId: ['eventid', 'testingeventid'],
  eventName: ['eventname', 'testingevent', 'combine'],
  eventPhase: ['eventphase', 'phase', 'testingphase', 'period'],
  eventStartDate: ['eventstartdate', 'startdate'],
  eventEndDate: ['eventenddate', 'enddate'],
  sessionId: ['sessionid', 'resultid'],
  date: ['date', 'testingdate', 'testdate'],
  createdAt: ['createdat'],
  gradeSnapshot: ['gradesnapshot'],
  positionSnapshot: ['positionsnapshot'],
  positionGroupSnapshot: ['positiongroupsnapshot'],
  weightLbsSnapshot: ['weightlbssnapshot', 'testsnapshotweight'],
  playId: ['playid'],
  playType: ['playtype', 'play'],
  opponent: ['opponent', 'opp'],
  note: ['note', 'notes'],
}

const POSITION_TO_GROUP: Record<string, PositionGroup> = {
  QB: 'QB',
  RB: 'RB', HB: 'RB', FB: 'RB', TB: 'RB',
  WR: 'WR', SLOT: 'WR', WO: 'WR', SE: 'WR', FL: 'WR', X: 'WR', Z: 'WR',
  TE: 'TE', Y: 'TE',
  OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL', LT: 'OL', RT: 'OL', LG: 'OL', RG: 'OL', G: 'OL', T: 'OL',
  DL: 'DL', DE: 'DL', DT: 'DL', NT: 'DL', NG: 'DL', EDGE: 'DL',
  LB: 'LB', OLB: 'LB', ILB: 'LB', MLB: 'LB', WLB: 'LB', SLB: 'LB', MIKE: 'LB', WILL: 'LB', SAM: 'LB', JACK: 'LB', ROVER: 'LB',
  DB: 'DB', CB: 'DB', S: 'DB', FS: 'DB', SS: 'DB', NB: 'DB', NICKEL: 'DB', CORNER: 'DB', SAFETY: 'DB',
  K: 'K/P', P: 'K/P', 'K/P': 'K/P', KP: 'K/P', PK: 'K/P', LS: 'K/P',
  ATH: 'ATH',
}

function resolveGroup(rawGroup: string, position: string): PositionGroup {
  const clean = (value: string) => value.trim().toUpperCase().replace(/\s/g, '')
  const group = clean(rawGroup)
  const direct = POSITION_GROUPS.find((item) => item.toUpperCase() === group)
  if (direct) return direct
  if (POSITION_TO_GROUP[group]) return POSITION_TO_GROUP[group]

  const cleanedPosition = clean(position)
  if (POSITION_TO_GROUP[cleanedPosition]) return POSITION_TO_GROUP[cleanedPosition]
  for (const token of cleanedPosition.split(/[/\-|]/)) {
    if (POSITION_TO_GROUP[token]) return POSITION_TO_GROUP[token]
  }
  return 'ATH'
}

function generatedId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}

export function importCsv(text: string): AppData {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row.')

  const headerIndex = rows.findIndex((cells) => {
    const normalized = cells.map(normalizeHeader)
    return normalized.includes('recordtype') || normalized.some((cell) => COLUMN_ALIASES.name.includes(cell))
  })
  if (headerIndex < 0) throw new Error('Could not find recognized CSV headers.')

  const headers = rows[headerIndex].map(normalizeHeader)
  const columnIndex: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    columnIndex[field] = headers.findIndex((header) => aliases.includes(header))
  }
  const metricIndex = new Map<string, number>()
  for (const key of SESSION_METRIC_KEYS) {
    const index = headers.indexOf(normalizeHeader(key))
    if (index >= 0) metricIndex.set(key, index)
  }

  const athletes = new Map<string, Athlete>()
  const events = new Map<string, TestingEvent>()
  const sessions: TestSession[] = []
  const plays: PlayEvent[] = []

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const cells = rows[rowIndex]
    const at = (index: number) => (index >= 0 ? (cells[index] ?? '').trim() : '')
    const field = (name: string) => at(columnIndex[name] ?? -1)
    const recordType = field('recordType').toLowerCase()

    const name = field('name')
    const athleteId = field('athleteId') || generatedId('athlete')
    if ((recordType === 'athlete' || !recordType || recordType === 'session') && name) {
      athletes.set(athleteId, {
        id: athleteId,
        name,
        grade: numberValue(field('grade')) ?? 9,
        position: field('position') || 'ATH',
        positionGroup: resolveGroup(field('positionGroup'), field('position') || 'ATH'),
        heightIn: parseHeight(field('heightIn')),
        weightLbs: numberValue(field('weightLbs')) ?? 0,
        photoUrl: field('photoUrl') || undefined,
        hudlUrl: field('hudlUrl') || undefined,
      })
    }

    if (recordType === 'event') {
      const phaseValue = field('eventPhase') as TestingPhase
      const phase = TESTING_PHASES.includes(phaseValue) ? phaseValue : 'Baseline'
      const eventId = field('eventId') || generatedId('event')
      const startDate = field('eventStartDate') || field('date')
      if (!startDate) throw new Error(`Event row ${rowIndex + 1} is missing a start date.`)
      events.set(eventId, {
        id: eventId,
        name: field('eventName') || `${phase} Testing`,
        phase,
        startDate,
        endDate: field('eventEndDate') || undefined,
        status: 'closed',
        createdAt: field('createdAt') || undefined,
      })
      continue
    }

    if (recordType === 'play') {
      const type = field('playType')
      const date = field('date')
      if (type && date) {
        plays.push({
          id: field('playId') || generatedId('play'),
          athleteId,
          type,
          date,
          opponent: field('opponent') || undefined,
          note: field('note') || undefined,
          createdAt: field('createdAt') || undefined,
        })
      }
      continue
    }

    const hasMetrics = [...metricIndex.entries()].some(([key, index]) =>
      numberValue(at(index)) !== undefined && SESSION_METRIC_KEYS.includes(key as never),
    )
    if (recordType !== 'session' && !hasMetrics && !field('date')) continue

    const eventId = field('eventId') || generatedId('event')
    const date = field('date') || field('eventStartDate')
    if (!date) continue
    const phaseValue = (field('eventPhase') || 'Baseline') as TestingPhase
    const phase = TESTING_PHASES.includes(phaseValue) ? phaseValue : 'Baseline'
    if (!events.has(eventId)) {
      events.set(eventId, {
        id: eventId,
        name: field('eventName') || `${phase} Testing`,
        phase,
        startDate: field('eventStartDate') || date,
        status: 'closed',
      })
    }

    const session: TestSession = {
      id: field('sessionId') || generatedId('session'),
      athleteId,
      eventId,
      date,
      phase,
      createdAt: field('createdAt') || undefined,
      gradeSnapshot: numberValue(field('gradeSnapshot')) ?? numberValue(field('grade')),
      positionSnapshot: field('positionSnapshot') || field('position') || undefined,
      positionGroupSnapshot: resolveGroup(
        field('positionGroupSnapshot') || field('positionGroup'),
        field('positionSnapshot') || field('position') || 'ATH',
      ),
      weightLbsSnapshot: numberValue(field('weightLbsSnapshot')) ?? numberValue(field('weightLbs')),
    }
    for (const key of SESSION_METRIC_KEYS) {
      const index = metricIndex.get(key)
      if (index === undefined) continue
      const value = numberValue(at(index))
      if (value !== undefined) (session as unknown as Record<string, unknown>)[key] = value
    }
    sessions.push(session)
  }

  if (athletes.size === 0) throw new Error('CSV did not contain any valid athlete rows.')
  return normalizeAppData({ athletes: [...athletes.values()], events: [...events.values()], sessions, plays })
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
