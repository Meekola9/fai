import type { Athlete } from '../types'
import { PLAY_TYPE_BY_KEY } from './impact'
import { parseHudlTable } from './hudlImport'

// ---------------------------------------------------------------------------
// Game-impact import: turn a Hudl game breakdown (CSV/TSV) into Havoc/Playmaker
// PlayEvent candidates. It detects WHAT happened on each play from RESULT / GN-LS
// / ODK, and — when the export tags players (RUSHER/PASSER/RECEIVER name) — maps
// them to the roster. Names are matched EXACTLY (normalized); anything uncertain is
// left for the coach to assign, so look-alike names (e.g. Keanu vs Kenan Crump) are
// never auto-merged and no athlete is ever invented.
// ---------------------------------------------------------------------------

export type ImpactUnit = 'offense' | 'defense' | 'special'
export type ImpactRole = 'rusher' | 'passer' | 'receiver' | 'kicker' | 'defender'

export interface GameImpactCandidate {
  /** Stable identity for React keys + de-duping (play number + type + role). */
  id: string
  playNumber: string
  unit: ImpactUnit
  role: ImpactRole
  typeKey: string
  label: string
  emoji: string
  points: number
  category: 'havoc' | 'playmaker'
  resultText: string
  gain?: number
  /** Player name read from the export for this role, if any. */
  playerName?: string
  playerJersey?: string
  /** Confident, single roster match — never a guess. */
  matchedAthleteId?: string
  /** More than one roster athlete shares this normalized name — coach must pick. */
  ambiguous: boolean
}

export interface GameImpactColumns {
  odk?: string
  result?: string
  gain?: string
  playType?: string
  rusherName?: string
  passerName?: string
  receiverName?: string
  kickerName?: string
  defenderName?: string
}

export interface GameImpactParseResult {
  candidates: GameImpactCandidate[]
  columns: GameImpactColumns
  playsScanned: number
  autoMatched: number
}

const EXPLOSION_YARDS = 20

function normalizedToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Normalized full-name key for exact roster matching. */
function nameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const HEADER_ALIASES: Record<keyof GameImpactColumns, string[]> = {
  odk: ['odk', 'od', 'unit', 'odks'],
  result: ['result', 'playresult', 'outcome'],
  gain: ['gnls', 'gainloss', 'gain', 'yards', 'yds', 'net', 'gain/loss'],
  playType: ['playtype', 'type'],
  rusherName: ['rushername', 'rusher', 'ballcarrier', 'carrier', 'runner'],
  passerName: ['passername', 'passer', 'qb', 'quarterback', 'thrower'],
  receiverName: ['receivername', 'receiver', 'target', 'targetname'],
  kickerName: ['kickername', 'kicker', 'punter'],
  defenderName: ['tackler', 'tacklers', 'defender', 'sackby', 'intby', 'tackleby', 'madeby'],
}

export function detectGameImpactColumns(headers: readonly string[]): GameImpactColumns {
  const byToken = new Map(headers.map((header) => [normalizedToken(header), header]))
  const columns: GameImpactColumns = {}
  for (const field of Object.keys(HEADER_ALIASES) as Array<keyof GameImpactColumns>) {
    for (const alias of HEADER_ALIASES[field]) {
      const match = byToken.get(normalizedToken(alias))
      if (match) {
        columns[field] = match
        break
      }
    }
  }
  return columns
}

function unitFromOdk(value: string): ImpactUnit | undefined {
  const token = normalizedToken(value)
  if (token === 'o' || token === 'off' || token === 'offense') return 'offense'
  if (token === 'd' || token === 'def' || token === 'defense') return 'defense'
  if (token === 'k' || token === 'kick' || token === 'special' || token === 'st') return 'special'
  return undefined
}

function parseGain(value: string | undefined): number | undefined {
  if (!value) return undefined
  const matched = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!matched) return undefined
  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : undefined
}

interface DerivedEvent {
  typeKey: string
  role: ImpactRole
}

/** The scorable impact events implied by one play row. */
function eventsForRow(unit: ImpactUnit, result: string, playType: string, gain?: number): DerivedEvent[] {
  const text = `${result} ${playType}`.toLowerCase()
  const isPass = /pass|complete|incomplete|scramble|sack|drop/.test(text) && !/rush|run/.test(result.toLowerCase())
  const events: DerivedEvent[] = []

  if (unit === 'offense') {
    if (/\btd\b|touchdown/.test(text)) {
      events.push({ typeKey: 'touchdown', role: isPass ? 'receiver' : 'rusher' })
    }
    if (gain !== undefined && gain >= EXPLOSION_YARDS) {
      events.push({ typeKey: 'explosion', role: isPass ? 'receiver' : 'rusher' })
    }
    if (/interception|\bint\b/.test(text)) events.push({ typeKey: 'interception_thrown', role: 'passer' })
    if (/drop/.test(text)) events.push({ typeKey: 'dropped_pass', role: 'receiver' })
    if (/fumble/.test(text) && /lost|lst/.test(text)) events.push({ typeKey: 'fumble_lost', role: 'rusher' })
    return events
  }

  if (unit === 'defense') {
    // Opponent has the ball; only credit clear defensive wins to a defender.
    if (/interception|\bint\b/.test(text)) events.push({ typeKey: 'interception', role: 'defender' })
    if (/sack/.test(text)) events.push({ typeKey: 'sack', role: 'defender' })
    if (/fumble/.test(text) && /(forced|ff)/.test(text)) events.push({ typeKey: 'forced_fumble', role: 'defender' })
    if (/(run|rush)/.test(text) && gain !== undefined && gain < 0) {
      events.push({ typeKey: 'tfl', role: 'defender' })
    }
    return events
  }

  // Special teams: only unambiguous game-changers.
  if (/block/.test(text)) events.push({ typeKey: 'punt_block', role: 'defender' })
  if (/\btd\b|touchdown/.test(text) && /return|ret/.test(text)) events.push({ typeKey: 'return_td', role: 'kicker' })
  return events
}

function playerFieldForRole(role: ImpactRole): keyof GameImpactColumns | undefined {
  switch (role) {
    case 'rusher': return 'rusherName'
    case 'passer': return 'passerName'
    case 'receiver': return 'receiverName'
    case 'kicker': return 'kickerName'
    case 'defender': return 'defenderName'
  }
}

/** Exact, normalized roster match. Returns the id only when exactly one athlete matches. */
export function matchRosterAthlete(
  name: string,
  athletes: readonly Athlete[],
): { athleteId?: string; ambiguous: boolean } {
  const key = nameKey(name)
  if (!key) return { ambiguous: false }
  const matches = athletes.filter((athlete) => nameKey(athlete.name) === key)
  if (matches.length === 1) return { athleteId: matches[0].id, ambiguous: false }
  if (matches.length > 1) return { ambiguous: true }
  return { ambiguous: false }
}

export function deriveGameImpactCandidates(
  input: string,
  athletes: readonly Athlete[],
): GameImpactParseResult {
  const table = parseHudlTable(input)
  const columns = detectGameImpactColumns(table.headers)
  const candidates: GameImpactCandidate[] = []
  let playsScanned = 0
  let autoMatched = 0

  table.rows.forEach((row, index) => {
    const playNumber = String(row[table.headers[0]] ?? index + 1).trim() || String(index + 1)
    const odk = columns.odk ? row[columns.odk] ?? '' : ''
    const unit = unitFromOdk(odk)
    const result = (columns.result ? row[columns.result] ?? '' : '').trim()
    if (!unit || !result) return
    playsScanned += 1

    const playType = columns.playType ? row[columns.playType] ?? '' : ''
    const gain = parseGain(columns.gain ? row[columns.gain] : undefined)

    for (const event of eventsForRow(unit, result, playType, gain)) {
      const type = PLAY_TYPE_BY_KEY.get(event.typeKey)
      if (!type) continue
      const field = playerFieldForRole(event.role)
      const rawName = field && columns[field] ? (row[columns[field] as string] ?? '').trim() : ''
      const match = rawName ? matchRosterAthlete(rawName, athletes) : { ambiguous: false }
      if (match.athleteId) autoMatched += 1
      candidates.push({
        id: `${playNumber}:${event.typeKey}:${event.role}`,
        playNumber,
        unit,
        role: event.role,
        typeKey: event.typeKey,
        label: type.label,
        emoji: type.emoji,
        points: type.points,
        category: type.category,
        resultText: result,
        gain,
        playerName: rawName || undefined,
        matchedAthleteId: match.athleteId,
        ambiguous: match.ambiguous,
      })
    }
  })

  return { candidates, columns, playsScanned, autoMatched }
}
