import type { Athlete, PlayEvent } from '../types'
import { buildImpact } from './impact'

// ---------------------------------------------------------------------------
// Per-game impact log for one athlete: what they produced in EACH game (not
// cumulative) — Havoc, Playmaker, net, and that game's efficiency. Complements
// the cumulative FAI trend by showing which games a player showed up in.
// ---------------------------------------------------------------------------

export interface PlayerGameImpact {
  gameLabel: string
  date: string
  opponent?: string
  havocPoints: number
  playmakerPoints: number
  totalPoints: number
  negativePoints: number
  /** Positive share of this game's impact, 0-100 (50 = neutral). */
  efficiency: number
  playCount: number
}

function gameKey(play: PlayEvent): string {
  return `${play.date ?? ''}|${play.opponent ?? ''}`
}

/** One row per game the athlete recorded impact plays in, chronological. */
export function buildPlayerGameImpact(athlete: Athlete, plays: readonly PlayEvent[]): PlayerGameImpact[] {
  const own = plays.filter((play) => play.athleteId === athlete.id && Boolean(play.date))

  const order = new Map<string, number>()
  const games: Array<{ date: string; opponent?: string }> = []
  for (const play of [...own].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = gameKey(play)
    if (!order.has(key)) {
      order.set(key, games.length)
      games.push({ date: play.date, opponent: play.opponent })
    }
  }

  const rows: PlayerGameImpact[] = []
  for (const game of games) {
    const key = gameKey({ date: game.date, opponent: game.opponent } as PlayEvent)
    const gamePlays = own.filter((play) => gameKey(play) === key)
    const impact = buildImpact(gamePlays, [athlete]).athletes[0]
    if (!impact) continue // game held only game-day badges
    rows.push({
      gameLabel: game.opponent?.trim() || game.date,
      date: game.date,
      opponent: game.opponent,
      havocPoints: impact.havocPoints,
      playmakerPoints: impact.playmakerPoints,
      totalPoints: impact.totalPoints,
      negativePoints: impact.negativePoints,
      efficiency: impact.efficiency,
      playCount: impact.playCount,
    })
  }
  return rows
}
