import type { StatKey } from '../types'
import { STAT_LABEL } from './playerStats'
import { parseHudlTable, type HudlTable } from './hudlImport'

export type StatSection = 'defense' | 'passing' | 'rushing' | 'receiving'
const token = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const aliases: Partial<Record<StatKey, string[]>> = {
  passAtt: ['passingattempts', 'passatt'], passComp: ['cmp', 'comp', 'completions'], passYds: ['passingyards', 'passyds'],
  passTD: ['passingtd', 'passtd'], passInt: ['interceptionsthrown', 'passint'],
  rushAtt: ['carries', 'car', 'rushatt'], rushYds: ['rushingyards', 'rushyds'], rushTD: ['rushingtd', 'rushtd'],
  targets: ['tgt', 'tar'], rec: ['receptions', 'rec'], recYds: ['receivingyards', 'recyds'], recTD: ['receivingtd', 'rectd'],
  tackles: ['totaltackles', 'tkl', 'tkls'], missedTackles: ['mt', 'miss', 'missedtackles'],
  tacklesForLoss: ['tfl'], sacks: ['sack', 'sacks'], passBreakups: ['pbu', 'pd'], forcedFumbles: ['ff'], fumbles: ['fum', 'fumbleslost'], drops: ['drp'],
}
export function statKeyForHeader(header: string, section: StatSection): StatKey | undefined {
  const key = token(header)
  const contextual: Record<string, Partial<Record<StatSection, StatKey>>> = {
    att: { passing: 'passAtt', rushing: 'rushAtt' },
    yds: { passing: 'passYds', rushing: 'rushYds', receiving: 'recYds' },
    yards: { passing: 'passYds', rushing: 'rushYds', receiving: 'recYds' },
    td: { passing: 'passTD', rushing: 'rushTD', receiving: 'recTD' },
    int: { passing: 'passInt', defense: 'interceptions' },
    interceptions: { passing: 'passInt', defense: 'interceptions' },
    tot: { defense: 'tackles' },
  }
  if (contextual[key]) return contextual[key][section]
  return (Object.keys(STAT_LABEL) as StatKey[]).find(stat => token(stat) === key || token(STAT_LABEL[stat].label) === key || aliases[stat]?.includes(key))
}

/** Label/value screenshots and delimited stat exports; no roster or number guessing. */
export function parseStatSheet(text: string, section: StatSection): HudlTable {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim())
  const pairs = lines.map(line => line.match(/^\s*([A-Za-z][A-Za-z /_-]*?)\s*[:=]?\s+(-?\d+(?:\.\d+)?)\s*$/))
    .filter((match): match is RegExpMatchArray => Boolean(match && statKeyForHeader(match[1], section)))
  if (pairs.length) {
    const headers = pairs.map(pair => pair[1].trim())
    if (new Set(headers).size !== headers.length) throw new Error('Multiple players or games detected. Crop to one player and one game, or use a CSV export.')
    return { headers, rows: [Object.fromEntries(pairs.map(pair => [pair[1].trim(), pair[2]]))], delimiter: '\t' }
  }
  return parseHudlTable(text.includes('\t') || text.includes(',') || text.includes(';') ? text : lines.map(line => line.trim().replace(/\s{2,}/g, '\t')).join('\n'))
}
