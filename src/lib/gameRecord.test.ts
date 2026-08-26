import { describe, expect, it } from 'vitest'
import type { GameResult } from '../types'
import { buildTeamRecord, gameResultKey, gameResultLookup, outcomeOf, sortGamesRecentFirst } from './gameRecord'

function game(id: string, date: string, opponent: string, us: number, them: number): GameResult {
  return { id, date, opponent, teamScore: us, oppScore: them }
}

describe('gameRecord', () => {
  const games = [
    game('g1', '2026-09-01', 'Central', 28, 14), // W
    game('g2', '2026-09-08', 'North', 10, 21), // L
    game('g3', '2026-09-15', 'East', 17, 17), // T
  ]

  it('reads a win, loss, and tie', () => {
    expect(outcomeOf(games[0])).toBe('W')
    expect(outcomeOf(games[1])).toBe('L')
    expect(outcomeOf(games[2])).toBe('T')
  })

  it('builds the team record with points for/against', () => {
    const record = buildTeamRecord(games)
    expect(record).toMatchObject({ wins: 1, losses: 1, ties: 1, games: 3, pointsFor: 55, pointsAgainst: 52 })
    expect(record.label).toBe('1-1-1')
  })

  it('omits ties from the label when there are none', () => {
    expect(buildTeamRecord([games[0], games[1]]).label).toBe('1-1')
  })

  it('looks games up by date + opponent, case-insensitively', () => {
    const lookup = gameResultLookup(games)
    expect(lookup.get(gameResultKey('2026-09-01', 'central'))?.id).toBe('g1')
    expect(lookup.get(gameResultKey('2026-09-08', 'North'))?.id).toBe('g2')
  })

  it('sorts most recent first', () => {
    expect(sortGamesRecentFirst(games).map((g) => g.id)).toEqual(['g3', 'g2', 'g1'])
  })
})
