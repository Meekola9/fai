import type { PlayerGameStat, PositionGroup, StatKey } from '../types'

// ---------------------------------------------------------------------------
// Box-score stats: per-game entry fields by position, and season aggregation
// with the rate metrics (YPC, catch %, completion %, tackle efficiency) that
// feed the efficiency read.
// ---------------------------------------------------------------------------

export const STAT_LABEL: Record<StatKey, { label: string; short: string }> = {
  passAtt: { label: 'Pass attempts', short: 'ATT' },
  passComp: { label: 'Completions', short: 'CMP' },
  passYds: { label: 'Pass yards', short: 'PYDS' },
  passTD: { label: 'Pass TD', short: 'PTD' },
  passInt: { label: 'Interceptions thrown', short: 'INT' },
  rushAtt: { label: 'Carries', short: 'CAR' },
  rushYds: { label: 'Rush yards', short: 'RYDS' },
  rushTD: { label: 'Rush TD', short: 'RTD' },
  fumbles: { label: 'Fumbles lost', short: 'FUM' },
  targets: { label: 'Targets', short: 'TGT' },
  rec: { label: 'Receptions', short: 'REC' },
  recYds: { label: 'Rec yards', short: 'RECYDS' },
  recTD: { label: 'Rec TD', short: 'RECTD' },
  drops: { label: 'Drops', short: 'DRP' },
  tackles: { label: 'Tackles', short: 'TKL' },
  tacklesForLoss: { label: 'Tackles for loss', short: 'TFL' },
  sacks: { label: 'Sacks', short: 'SACK' },
  missedTackles: { label: 'Missed tackles', short: 'MT' },
  passBreakups: { label: 'Pass breakups', short: 'PBU' },
  interceptions: { label: 'Interceptions', short: 'INT' },
  forcedFumbles: { label: 'Forced fumbles', short: 'FF' },
}

const OFFENSE_SKILL: StatKey[] = ['rushAtt', 'rushYds', 'rushTD', 'targets', 'rec', 'recYds', 'recTD', 'drops', 'fumbles']
const RECEIVING: StatKey[] = ['targets', 'rec', 'recYds', 'recTD', 'drops']
const PASSING: StatKey[] = ['passAtt', 'passComp', 'passYds', 'passTD', 'passInt']
const FRONT_SEVEN: StatKey[] = ['tackles', 'tacklesForLoss', 'sacks', 'missedTackles', 'forcedFumbles']
const SECONDARY: StatKey[] = ['tackles', 'missedTackles', 'passBreakups', 'interceptions', 'tacklesForLoss']

/** The stat fields worth entering for a position group. */
export function statFieldsForPosition(group: PositionGroup): StatKey[] {
  switch (group) {
    case 'QB': return [...PASSING, 'rushAtt', 'rushYds', 'rushTD']
    case 'RB': return ['rushAtt', 'rushYds', 'rushTD', 'fumbles', 'targets', 'rec', 'recYds']
    case 'WR':
    case 'TE': return RECEIVING
    case 'DL':
    case 'LB': return [...FRONT_SEVEN, 'interceptions', 'passBreakups']
    case 'DB': return SECONDARY
    case 'ATH': {
      const all: StatKey[] = [...OFFENSE_SKILL, ...PASSING, ...FRONT_SEVEN, 'passBreakups', 'interceptions']
      return [...new Set(all)]
    }
    case 'OL':
    case 'K/P':
    default: return []
  }
}

export interface AthleteSeasonStats {
  games: number
  totals: Partial<Record<StatKey, number>>
  rates: {
    ypc?: number
    catchPct?: number
    ypr?: number
    compPct?: number
    ypa?: number
    tacklePct?: number
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function buildAthleteSeasonStats(
  athleteId: string,
  playerStats: readonly PlayerGameStat[],
): AthleteSeasonStats {
  const own = playerStats.filter((stat) => stat.athleteId === athleteId)
  const totals: Partial<Record<StatKey, number>> = {}
  for (const stat of own) {
    for (const [key, value] of Object.entries(stat.stats) as Array<[StatKey, number]>) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        totals[key] = (totals[key] ?? 0) + value
      }
    }
  }

  const t = (key: StatKey) => totals[key] ?? 0
  const rates: AthleteSeasonStats['rates'] = {}
  if (t('rushAtt') > 0) rates.ypc = round1(t('rushYds') / t('rushAtt'))
  if (t('targets') > 0) rates.catchPct = round1((t('rec') / t('targets')) * 100)
  if (t('rec') > 0) rates.ypr = round1(t('recYds') / t('rec'))
  if (t('passAtt') > 0) {
    rates.compPct = round1((t('passComp') / t('passAtt')) * 100)
    rates.ypa = round1(t('passYds') / t('passAtt'))
  }
  const tackleChances = t('tackles') + t('missedTackles')
  if (tackleChances > 0) rates.tacklePct = round1((t('tackles') / tackleChances) * 100)

  return { games: own.length, totals, rates }
}
