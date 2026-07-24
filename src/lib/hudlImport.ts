import {
  FORMATIONS,
  PASS_CONCEPTS,
  PERSONNEL,
  PLAY_CALLS,
  RUN_CONCEPTS,
} from './filmAnalysis'
import type { FieldHash, FilmPlay, PlayCall, PlaySide } from '../types'

export type HudlField =
  | 'clip'
  | 'side'
  | 'opponent'
  | 'date'
  | 'quarter'
  | 'down'
  | 'distance'
  | 'yardLine'
  | 'hash'
  | 'formation'
  | 'personnel'
  | 'call'
  | 'concept'
  | 'gain'
  | 'result'
  | 'note'
  | 'sourceUrl'

export interface HudlFieldDefinition {
  key: HudlField
  label: string
}

export const HUDL_FIELDS: readonly HudlFieldDefinition[] = [
  { key: 'clip', label: 'Clip #' },
  { key: 'side', label: 'ODK / Side' },
  { key: 'opponent', label: 'Opponent' },
  { key: 'date', label: 'Date' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'down', label: 'Down' },
  { key: 'distance', label: 'Distance' },
  { key: 'yardLine', label: 'Yard line' },
  { key: 'hash', label: 'Hash' },
  { key: 'formation', label: 'Off formation' },
  { key: 'personnel', label: 'Personnel' },
  { key: 'call', label: 'Play type' },
  { key: 'concept', label: 'Off play / concept' },
  { key: 'gain', label: 'Gain/loss' },
  { key: 'result', label: 'Result' },
  { key: 'note', label: 'Notes' },
  { key: 'sourceUrl', label: 'Hudl link' },
]

export type HudlColumnMap = Partial<Record<HudlField, string>>

export interface HudlTable {
  headers: string[]
  rows: Record<string, string>[]
  delimiter: ',' | '\t' | ';'
}

export interface HudlClipLike {
  name: string
  size?: number
  lastModified?: number
}

export interface HudlImportDefaults {
  gameLabel?: string
  opponent?: string
  date?: string
  side?: PlaySide
  sourceUrl?: string
}

export interface HudlImportPreviewRow {
  index: number
  clip?: HudlClipLike
  clipNumber?: number
  play: Omit<FilmPlay, 'id' | 'createdAt'>
  warnings: string[]
  raw: Record<string, string>
}

export interface FormationSpot {
  id: string
  label: string
  x: number
  y: number
}

const HEADER_ALIASES: Record<HudlField, readonly string[]> = {
  clip: ['clip', 'clip #', 'clip number', 'play #', 'play number', 'play no', 'play num'],
  side: ['odk', 'o/d/k', 'side', 'unit', 'off def kick'],
  opponent: ['opponent', 'opp'],
  date: ['date', 'game date'],
  quarter: ['quarter', 'qtr', 'q'],
  down: ['down', 'dn'],
  distance: ['distance', 'dist', 'to go', 'yards to go'],
  yardLine: ['yard line', 'yd line', 'yardline', 'field position'],
  hash: ['hash', 'field hash'],
  formation: ['off form', 'formation', 'off formation', 'offensive formation'],
  personnel: ['personnel', 'pers', 'off personnel'],
  call: ['play type', 'type', 'run pass', 'call type'],
  concept: ['off play', 'play', 'concept', 'offensive play', 'play call'],
  gain: ['gn/ls', 'gain/loss', 'gain', 'yards gained', 'result yards'],
  result: ['result', 'outcome'],
  note: ['notes', 'note', 'comment', 'comments'],
  sourceUrl: ['hudl link', 'hudl url', 'source link', 'video link', 'url'],
}

const FORMATION_SYNONYMS: Record<string, string> = {
  '2x2': 'doubles',
  doubles: 'doubles',
  twins: 'doubles',
  spread: 'doubles',
  '3x1': 'trips',
  trips: 'trips',
  trio: 'trips',
  trey: 'trey',
  bunch: 'bunch',
  empty: 'empty',
  fivewide: 'empty',
  '5wide': 'empty',
  singleback: 'singleback',
  single: 'singleback',
  ace: 'ace',
  iform: 'i_form',
  i: 'i_form',
  offseti: 'offset_i',
  pistol: 'pistol',
  gun: 'shotgun',
  shotgun: 'shotgun',
  wingt: 'wing_t',
  wildcat: 'wildcat',
  goalline: 'goal_line',
  heavy: 'goal_line',
}

function normalizedToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function splitDelimited(text: string, delimiter: ',' | '\t' | ';'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (!quoted && character === delimiter) {
      row.push(cell.trim())
      cell = ''
      continue
    }
    if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += character
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function delimiterScore(line: string, delimiter: ',' | '\t' | ';'): number {
  let score = 0
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted
    else if (!quoted && line[index] === delimiter) score += 1
  }
  return score
}

export function parseHudlTable(text: string): HudlTable {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  if (!cleaned) return { headers: [], rows: [], delimiter: ',' }
  const firstLine = cleaned.split(/\r?\n/, 1)[0]
  const candidates: Array<',' | '\t' | ';'> = [',', '\t', ';']
  const delimiter = [...candidates].sort(
    (a, b) => delimiterScore(firstLine, b) - delimiterScore(firstLine, a),
  )[0]
  const matrix = splitDelimited(cleaned, delimiter)
  if (matrix.length === 0) return { headers: [], rows: [], delimiter }

  const used = new Map<string, number>()
  const headers = matrix[0].map((value, index) => {
    const base = value || `Column ${index + 1}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base} ${seen + 1}`
  })
  const rows = matrix.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  )
  return { headers, rows, delimiter }
}

export function autoMapHudlColumns(headers: readonly string[]): HudlColumnMap {
  const normalized = new Map(headers.map((header) => [normalizedToken(header), header]))
  const mapping: HudlColumnMap = {}
  for (const field of HUDL_FIELDS) {
    const match = HEADER_ALIASES[field.key]
      .map(normalizedToken)
      .map((alias) => normalized.get(alias))
      .find(Boolean)
    if (match) mapping[field.key] = match
  }
  return mapping
}

function valueFor(
  row: Record<string, string>,
  mapping: HudlColumnMap,
  field: HudlField,
): string {
  const header = mapping[field]
  return header ? (row[header] ?? '').trim() : ''
}

function optionalNumber(value: string): number | undefined {
  const matched = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!matched) return undefined
  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : undefined
}

function boundedInteger(value: string, minimum: number, maximum: number): number | undefined {
  const parsed = optionalNumber(value)
  if (parsed === undefined) return undefined
  const rounded = Math.round(parsed)
  return rounded >= minimum && rounded <= maximum ? rounded : undefined
}

function normalizeSide(value: string, fallback?: PlaySide): PlaySide | undefined {
  const token = normalizedToken(value)
  if (token === 'o' || token === 'offense' || token === 'off') return 'offense'
  if (token === 'd' || token === 'defense' || token === 'def') return 'defense'
  if (token === 'k' || token === 'special' || token === 'specialteams' || token === 'kick') {
    return 'special'
  }
  return fallback
}

function normalizeDate(value: string, fallback?: string): string | undefined {
  if (!value) return fallback
  const iso = value.match(/^\d{4}-\d{2}-\d{2}$/)
  if (iso) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10)
}

export function normalizeFormation(value: string): string | undefined {
  if (!value) return undefined
  const token = normalizedToken(value)
  const direct = FORMATIONS.find(
    (item) => normalizedToken(item.key) === token || normalizedToken(item.label) === token,
  )
  if (direct) return direct.key
  for (const [alias, key] of Object.entries(FORMATION_SYNONYMS)) {
    if (token === alias || token.includes(alias)) return key
  }
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizePersonnel(value: string): string | undefined {
  if (!value) return undefined
  const match = value.match(/\b(00|01|02|10|11|12|13|20|21|22|23|30|31|32)\b/)
  if (match) return match[1]
  const token = normalizedToken(value)
  return PERSONNEL.find((item) => normalizedToken(item.label) === token)?.key
}

function normalizeCall(value: string, concept: string): PlayCall | undefined {
  const token = normalizedToken(value)
  const direct = PLAY_CALLS.find(
    (item) => normalizedToken(item.key) === token || normalizedToken(item.label) === token,
  )
  if (direct) return direct.key
  const combined = `${value} ${concept}`.toLowerCase()
  if (/screen|bubble|tunnel|now\b/.test(combined)) return 'screen'
  if (/\brpo\b|read pass|run pass/.test(combined)) return 'rpo'
  if (/punt|kick|field goal|extra point|pat\b/.test(combined)) return 'special'
  if (/pass|dropback|play action|play-action|quick game|shot/.test(combined)) return 'pass'
  if (/run|zone|power|counter|trap|toss|sweep|iso|dive|draw/.test(combined)) return 'run'
  return undefined
}

function normalizeConcept(value: string): string | undefined {
  if (!value) return undefined
  const token = normalizedToken(value)
  const catalog = [...RUN_CONCEPTS, ...PASS_CONCEPTS]
  const direct = catalog.find(
    (item) => normalizedToken(item.key) === token || normalizedToken(item.label) === token,
  )
  return direct?.key ?? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function normalizeHash(value: string): FieldHash | undefined {
  const token = normalizedToken(value)
  if (token === 'l' || token === 'left' || token === 'lefthash') return 'L'
  if (token === 'r' || token === 'right' || token === 'righthash') return 'R'
  if (token === 'm' || token === 'middle' || token === 'mid') return 'M'
  return undefined
}

function normalizeYardLine(value: string): number | undefined {
  const yards = boundedInteger(value, 1, 99)
  if (yards === undefined) return undefined
  const lower = value.toLowerCase()
  if (/opp|opponent|plus|\+/.test(lower) && yards < 50) return 100 - yards
  return yards
}

export function clipNumberFromName(name: string): number | undefined {
  const basename = name.replace(/\.[a-z0-9]+$/i, '')
  const groups = [...basename.matchAll(/\d+/g)]
  if (groups.length === 0) return undefined
  const parsed = Number(groups[groups.length - 1][0])
  return Number.isFinite(parsed) ? parsed : undefined
}

export function naturalClipSort<T extends HudlClipLike>(clips: readonly T[]): T[] {
  return [...clips].sort((a, b) => {
    const aNumber = clipNumberFromName(a.name)
    const bNumber = clipNumberFromName(b.name)
    if (aNumber !== undefined && bNumber !== undefined && aNumber !== bNumber) {
      return aNumber - bNumber
    }
    if (aNumber !== undefined && bNumber === undefined) return -1
    if (aNumber === undefined && bNumber !== undefined) return 1
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
}

function metadataNote(
  sourceUrl: string | undefined,
  clipNumber: number | undefined,
  clipName: string | undefined,
  coachNote: string,
): string | undefined {
  const lines = ['[Hudl Import]']
  if (sourceUrl) lines.push(`Source: ${sourceUrl}`)
  if (clipNumber !== undefined) lines.push(`Clip: ${clipNumber}`)
  if (clipName) lines.push(`File: ${clipName}`)
  if (coachNote) lines.push('', coachNote)
  return lines.length > 1 || coachNote ? lines.join('\n') : undefined
}

export function hudlSourceFromNote(note?: string): string | undefined {
  if (!note?.startsWith('[Hudl Import]')) return undefined
  return note.match(/^Source:\s*(.+)$/m)?.[1]?.trim()
}

export function buildHudlImportPreview(
  table: HudlTable,
  mapping: HudlColumnMap,
  defaults: HudlImportDefaults,
  clips: readonly HudlClipLike[] = [],
): HudlImportPreviewRow[] {
  const sortedClips = naturalClipSort(clips)
  const byNumber = new Map<number, HudlClipLike>()
  for (const clip of sortedClips) {
    const number = clipNumberFromName(clip.name)
    if (number !== undefined && !byNumber.has(number)) byNumber.set(number, clip)
  }

  return table.rows.map((row, index) => {
    const requestedClipNumber = boundedInteger(valueFor(row, mapping, 'clip'), 0, 100000)
    const clip =
      (requestedClipNumber !== undefined ? byNumber.get(requestedClipNumber) : undefined)
      ?? sortedClips[index]
    const clipNumber = requestedClipNumber ?? (clip ? clipNumberFromName(clip.name) : index + 1)
    const conceptRaw = valueFor(row, mapping, 'concept')
    const call = normalizeCall(valueFor(row, mapping, 'call'), conceptRaw)
    const formationRaw = valueFor(row, mapping, 'formation')
    const formation = normalizeFormation(formationRaw)
    const sourceUrl = valueFor(row, mapping, 'sourceUrl') || defaults.sourceUrl
    const opponent = valueFor(row, mapping, 'opponent') || defaults.opponent
    const date = normalizeDate(valueFor(row, mapping, 'date'), defaults.date)
    const gameLabel = defaults.gameLabel?.trim() || opponent || 'Hudl import'
    const clipLabel = clipNumber !== undefined ? `Clip ${clipNumber}` : `Play ${index + 1}`
    const filmLabel = [gameLabel, clipLabel, clip?.name].filter(Boolean).join(' · ')
    const warnings: string[] = []
    if (!clip && clips.length > 0) warnings.push('No clip paired')
    if (!formationRaw) warnings.push('Formation missing')
    if (!call) warnings.push('Play type not recognized')

    const play: Omit<FilmPlay, 'id' | 'createdAt'> = {
      filmLabel,
      opponent: opponent || undefined,
      date,
      side: normalizeSide(valueFor(row, mapping, 'side'), defaults.side),
      quarter: boundedInteger(valueFor(row, mapping, 'quarter'), 1, 9),
      down: boundedInteger(valueFor(row, mapping, 'down'), 1, 4),
      distance: boundedInteger(valueFor(row, mapping, 'distance'), 0, 99),
      yardLine: normalizeYardLine(valueFor(row, mapping, 'yardLine')),
      hash: normalizeHash(valueFor(row, mapping, 'hash')),
      formation,
      personnel: normalizePersonnel(valueFor(row, mapping, 'personnel')),
      call,
      concept: normalizeConcept(conceptRaw),
      gain: optionalNumber(valueFor(row, mapping, 'gain')),
      result: valueFor(row, mapping, 'result') || undefined,
      note: metadataNote(
        sourceUrl || undefined,
        clipNumber,
        clip?.name,
        valueFor(row, mapping, 'note'),
      ),
    }

    return { index, clip, clipNumber, play, warnings, raw: row }
  })
}

const LINE: FormationSpot[] = [
  { id: 'lt', label: 'LT', x: 36, y: 53 },
  { id: 'lg', label: 'LG', x: 43, y: 53 },
  { id: 'c', label: 'C', x: 50, y: 53 },
  { id: 'rg', label: 'RG', x: 57, y: 53 },
  { id: 'rt', label: 'RT', x: 64, y: 53 },
]

function spot(id: string, label: string, x: number, y: number): FormationSpot {
  return { id, label, x, y }
}

export function formationSpots(formation?: string, personnel?: string): FormationSpot[] {
  const key = normalizeFormation(formation ?? '') ?? 'shotgun'
  const qb = spot('qb', 'QB', 50, key === 'i_form' ? 63 : 66)
  const base = [...LINE, qb]

  if (key === 'empty') {
    return [
      ...base,
      spot('x', 'X', 8, 48),
      spot('h', 'H', 25, 46),
      spot('y', 'Y', 68, 46),
      spot('f', 'F', 82, 47),
      spot('z', 'Z', 94, 48),
    ]
  }
  if (key === 'trips' || key === 'trey') {
    return [
      ...base,
      spot('x', 'X', 8, 48),
      spot('y', key === 'trey' ? 'Y' : 'H', 70, 47),
      spot('h', key === 'trey' ? 'H' : 'Y', 82, 44),
      spot('z', 'Z', 94, 48),
      spot('rb', 'RB', 43, 76),
    ]
  }
  if (key === 'bunch') {
    return [
      ...base,
      spot('x', 'X', 8, 48),
      spot('y', 'Y', 75, 46),
      spot('h', 'H', 82, 43),
      spot('z', 'Z', 87, 48),
      spot('rb', 'RB', 43, 76),
    ]
  }
  if (key === 'doubles') {
    return [
      ...base,
      spot('x', 'X', 8, 48),
      spot('h', 'H', 28, 45),
      spot('y', 'Y', 72, 45),
      spot('z', 'Z', 94, 48),
      spot('rb', 'RB', 43, 76),
    ]
  }
  if (key === 'i_form' || key === 'offset_i') {
    return [
      ...base,
      spot('x', 'X', 8, 48),
      spot('te', 'Y', 72, 51),
      spot('z', 'Z', 94, 48),
      spot('fb', 'FB', key === 'offset_i' ? 43 : 50, 73),
      spot('rb', 'RB', 50, 84),
    ]
  }
  if (key === 'pistol') {
    return [
      ...base,
      spot('x', 'X', 8, 48),
      spot('h', 'H', 28, 45),
      spot('y', 'Y', 72, 50),
      spot('z', 'Z', 94, 48),
      spot('rb', 'RB', 50, 82),
    ]
  }
  if (key === 'ace' || personnel === '12') {
    return [
      ...base,
      spot('x', 'X', 8, 48),
      spot('y', 'Y', 30, 51),
      spot('u', 'U', 70, 51),
      spot('z', 'Z', 94, 48),
      spot('rb', 'RB', 50, 78),
    ]
  }
  if (key === 'wing_t') {
    return [
      ...base,
      spot('x', 'X', 8, 48),
      spot('te', 'Y', 72, 51),
      spot('wb', 'WB', 78, 61),
      spot('fb', 'FB', 50, 75),
      spot('hb', 'HB', 42, 82),
    ]
  }
  if (key === 'goal_line') {
    return [
      ...base,
      spot('te1', 'Y', 28, 51),
      spot('te2', 'U', 72, 51),
      spot('wing', 'W', 78, 60),
      spot('fb', 'FB', 50, 74),
      spot('rb', 'RB', 50, 84),
    ]
  }

  return [
    ...base,
    spot('x', 'X', 8, 48),
    spot('h', 'H', 28, 45),
    spot('y', 'Y', 72, 50),
    spot('z', 'Z', 94, 48),
    spot('rb', 'RB', 43, 76),
  ]
}

export function formationSvg(play: Pick<FilmPlay, 'formation' | 'personnel' | 'filmLabel'>): string {
  const spots = formationSpots(play.formation, play.personnel)
  const dots = spots.map((item) => `
    <g transform="translate(${item.x * 8},${item.y * 5})">
      <circle r="15" fill="#111827" stroke="#b7f52a" stroke-width="3" />
      <text text-anchor="middle" dominant-baseline="middle" fill="#f8fafc" font-size="12" font-family="Arial" font-weight="700">${item.label}</text>
    </g>`).join('')
  const safeTitle = (play.filmLabel ?? 'FAI Formation').replace(/[<>&]/g, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="#0a3d24" />
  <g stroke="#ffffff" stroke-opacity=".45" stroke-width="2">
    <line x1="0" x2="800" y1="265" y2="265" stroke="#fbbf24" stroke-width="4" />
    <line x1="0" x2="800" y1="100" y2="100" /><line x1="0" x2="800" y1="200" y2="200" />
    <line x1="0" x2="800" y1="300" y2="300" /><line x1="0" x2="800" y1="400" y2="400" />
  </g>
  <text x="24" y="36" fill="#f8fafc" font-size="22" font-family="Arial" font-weight="700">${safeTitle}</text>
  ${dots}
</svg>`
}
