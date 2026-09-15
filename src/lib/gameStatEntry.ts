import type { PlayerGameStat, StatKey } from '../types'
import { STAT_LABEL } from './playerStats'

export function validateGameStats(stats: Partial<Record<StatKey, number>>): string | undefined {
  if (!Object.keys(stats).length) return 'Enter at least one stat. Use 0 for a confirmed zero; leave unknown stats blank.'
  for (const [key, value] of Object.entries(stats) as [StatKey, number][]) {
    if (!Number.isFinite(value)) return `${STAT_LABEL[key].label} must be a number.`
    if (value < 0 && !['rushYds', 'recYds', 'passYds'].includes(key)) return `${STAT_LABEL[key].label} cannot be negative.`
    const halfAllowed = ['tackles', 'tacklesForLoss', 'sacks'].includes(key)
    if (!(halfAllowed ? Number.isInteger(value * 2) : Number.isInteger(value))) return `${STAT_LABEL[key].label} must use ${halfAllowed ? 'whole or half' : 'whole'} numbers.`
  }
  const exceeds = (a: StatKey, b: StatKey) => stats[a] !== undefined && stats[b] !== undefined && stats[a]! > stats[b]!
  if (exceeds('passComp', 'passAtt')) return 'Completions cannot exceed pass attempts.'
  if (exceeds('passInt', 'passAtt')) return 'Interceptions thrown cannot exceed pass attempts.'
  if (exceeds('rec', 'targets')) return 'Receptions cannot exceed targets.'
  if (stats.drops !== undefined && stats.rec !== undefined && stats.targets !== undefined && stats.drops + stats.rec > stats.targets) return 'Receptions plus drops cannot exceed targets.'
  return undefined
}

export function sameStatGame(a: Pick<PlayerGameStat, 'athleteId' | 'date' | 'opponent'>, b: Pick<PlayerGameStat, 'athleteId' | 'date' | 'opponent'>) {
  const normalize = (s?: string) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  return a.athleteId === b.athleteId && a.date === b.date && normalize(a.opponent) === normalize(b.opponent)
}

/** Latest three dated games; only explicitly recorded numerator/denominator pairs count. */
export function gameStatsAdjustment(athleteId: string, games: readonly PlayerGameStat[]): { boostPct: number; signals: string[]; games: number } | undefined {
  const recent = games.filter(g => g.athleteId === athleteId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const signals: string[] = []
  const swings: number[] = []
  function rate(numerator: StatKey, denominator: StatKey, neutral: number, span: number, sample: number, label: string, misses = false) {
    const valid = recent.filter(g => g.stats[numerator] !== undefined && g.stats[denominator] !== undefined && !validateGameStats(g.stats))
    const n = valid.reduce((sum, g) => sum + g.stats[numerator]!, 0)
    const d = valid.reduce((sum, g) => sum + g.stats[denominator]!, 0) + (misses ? n : 0)
    if (d <= 0) return
    const value = n / d
    const swing = Math.max(-1, Math.min(1, (value - neutral) / span)) * 5 * Math.min(1, d / sample)
    swings.push(swing)
    signals.push(`${label}: ${Math.round(value * (label === 'Yards per carry' ? 10 : 1000)) / 10}${label === 'Yards per carry' ? '' : '%'} (${d} opportunities)`)
  }
  rate('passComp', 'passAtt', .6, .2, 30, 'Completion rate')
  rate('rec', 'targets', .65, .25, 15, 'Catch rate')
  rate('rushYds', 'rushAtt', 4, 3, 20, 'Yards per carry')
  rate('tackles', 'missedTackles', .85, .15, 20, 'Tackle completion', true)
  if (!swings.length) return undefined
  return { boostPct: Math.round(swings.reduce((a, b) => a + b, 0) / swings.length * 10) / 10, signals, games: recent.length }
}
