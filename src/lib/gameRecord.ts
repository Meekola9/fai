import type { GameResult } from '../types'

export type GameOutcome = 'W' | 'L' | 'T'

export interface TeamRecord {
  wins: number
  losses: number
  ties: number
  games: number
  pointsFor: number
  pointsAgainst: number
  /** "5-2" or, with ties, "5-2-1". */
  label: string
}

export function outcomeOf(game: GameResult): GameOutcome {
  if (game.teamScore > game.oppScore) return 'W'
  if (game.teamScore < game.oppScore) return 'L'
  return 'T'
}

export function buildTeamRecord(games: readonly GameResult[]): TeamRecord {
  let wins = 0
  let losses = 0
  let ties = 0
  let pointsFor = 0
  let pointsAgainst = 0
  for (const game of games) {
    pointsFor += game.teamScore
    pointsAgainst += game.oppScore
    const outcome = outcomeOf(game)
    if (outcome === 'W') wins += 1
    else if (outcome === 'L') losses += 1
    else ties += 1
  }
  const label = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
  return { wins, losses, ties, games: games.length, pointsFor, pointsAgainst, label }
}

/** Join key for matching a score to a game elsewhere (date + opponent). */
export function gameResultKey(date: string, opponent?: string): string {
  return `${date}|${(opponent ?? '').trim().toLowerCase()}`
}

/** Lookup of scores keyed by date + opponent, for the per-game views. */
export function gameResultLookup(games: readonly GameResult[]): Map<string, GameResult> {
  const map = new Map<string, GameResult>()
  for (const game of games) map.set(gameResultKey(game.date, game.opponent), game)
  return map
}

/** Games most recent first. */
export function sortGamesRecentFirst(games: readonly GameResult[]): GameResult[] {
  return [...games].sort((a, b) => b.date.localeCompare(a.date))
}
