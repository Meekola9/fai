import type { Athlete, PlayEvent } from '../types'
import { buildImpact } from './impact'
import { clamp, round1 } from './compute'

// ---------------------------------------------------------------------------
// Game-to-game FAI trend. A player's base FAI (from testing) holds between
// windows, but their boosted overall moves as impact + efficiency accrue game
// by game. This recomputes the boosted overall cumulatively after each game so
// you can see a player climbing or cooling off across the season.
// ---------------------------------------------------------------------------

export interface FaiTrendPoint {
  /** Opponent if known, else the date — the label under the point. */
  gameLabel: string
  date: string
  /** Boosted FAI as of this game (base × all boosts through this game). */
  fai: number
  impactBoostPct: number
  efficiencyBoostPct: number
  /** This athlete's impact plays counted through this game. */
  playCount: number
}

export interface FaiTrend {
  baseFai: number
  points: FaiTrendPoint[]
  /** Boosted FAI at the most recent game (baseFai when no games logged). */
  latest: number
  /** latest − baseFai: how far production has moved the overall. */
  delta: number
}

function gameKey(play: PlayEvent): string {
  return `${play.date ?? ''}|${play.opponent ?? ''}`
}

/**
 * Build the cumulative boosted-FAI series for one athlete, one point per game
 * they logged impact plays in. `extraBoostPct` folds in fixed boosts (e.g.
 * awareness) that don't change game to game, so the last point matches the
 * player's displayed overall.
 */
export function buildFaiTrend(
  athlete: Athlete,
  baseFai: number,
  plays: readonly PlayEvent[],
  extraBoostPct = 0,
): FaiTrend {
  const own = plays.filter((play) => play.athleteId === athlete.id && Boolean(play.date))

  const rank = new Map<string, number>()
  const games: Array<{ date: string; opponent?: string }> = []
  for (const play of [...own].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = gameKey(play)
    if (!rank.has(key)) {
      rank.set(key, games.length)
      games.push({ date: play.date, opponent: play.opponent })
    }
  }

  const points: FaiTrendPoint[] = games.map((game, index) => {
    const cumulative = own.filter((play) => (rank.get(gameKey(play)) ?? Infinity) <= index)
    const summary = buildImpact(cumulative, [athlete])
    const impactBoostPct = summary.boostByAthlete.get(athlete.id) ?? 0
    const efficiencyBoostPct = summary.efficiencyBoostByAthlete.get(athlete.id) ?? 0
    const total = impactBoostPct + efficiencyBoostPct + extraBoostPct
    return {
      gameLabel: game.opponent?.trim() || game.date,
      date: game.date,
      fai: round1(clamp(baseFai * (1 + total / 100), 0, 100)),
      impactBoostPct,
      efficiencyBoostPct,
      playCount: cumulative.length,
    }
  })

  const latest = points.length ? points[points.length - 1].fai : round1(baseFai)
  return { baseFai: round1(baseFai), points, latest, delta: round1(latest - baseFai) }
}
