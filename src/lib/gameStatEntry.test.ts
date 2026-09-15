import { describe, expect, it } from 'vitest'
import { gameStatsAdjustment, sameStatGame, validateGameStats } from './gameStatEntry'
import { parseStatSheet, statKeyForHeader } from './statSheetImport'
import type { PlayerGameStat } from '../types'
const game = (date: string, stats: PlayerGameStat['stats']): PlayerGameStat => ({ id: date, athleteId: 'a', date, opponent: 'Team', stats })
describe('reviewed game stats', () => {
  it('distinguishes missing stats from confirmed zeros and caps the adjustment', () => {
    expect(gameStatsAdjustment('a', [game('2026-09-01', { tackles: 20 })])).toBeUndefined()
    expect(gameStatsAdjustment('a', [game('2026-09-01', { tackles: 20, missedTackles: 0 })])?.boostPct).toBe(5)
    expect(gameStatsAdjustment('a', [game('2026-09-01', { tackles: 0, missedTackles: 20 })])?.boostPct).toBe(-5)
    expect(gameStatsAdjustment('a', [game('2026-09-01', { tackles: 1, missedTackles: 0 })])?.boostPct).toBe(.3)
  })
  it('uses the last three games and updates after corrections', () => {
    const games = [game('2026-08-01', { tackles: 0, missedTackles: 100 }), ...['01', '08', '15'].map(d => game(`2026-09-${d}`, { tackles: 10, missedTackles: 0 }))]
    expect(gameStatsAdjustment('a', games)?.boostPct).toBe(5)
    games[3].stats.missedTackles = 30
    expect(gameStatsAdjustment('a', games)?.boostPct).toBe(-5)
  })
  it('rejects contradictory and invalid numbers while preserving half sacks and negative yardage', () => {
    expect(validateGameStats({ passAtt: 5, passComp: 6 })).toMatch('cannot exceed')
    expect(validateGameStats({ missedTackles: -1 })).toMatch('negative')
    expect(validateGameStats({ rec: 1.5 })).toMatch('whole')
    expect(validateGameStats({ sacks: .5, rushYds: -5, missedTackles: 0 })).toBeUndefined()
    expect(validateGameStats({})).toMatch('at least')
  })
  it('identifies repeat imports as the same game', () => {
    expect(sameStatGame(game('2026-09-01', {}), { athleteId: 'a', date: '2026-09-01', opponent: ' TEAM ' })).toBe(true)
  })
  it('reads labelled screenshot text and contextual CSV headers without guessing INT', () => {
    expect(parseStatSheet('Tackles 8\nMissed tackles 2\nSacks 0.5', 'defense').rows[0]['Missed tackles']).toBe('2')
    expect(parseStatSheet('Player,ATT,YDS\n"Smith, Joe",10,75', 'rushing').rows[0].YDS).toBe('75')
    expect(statKeyForHeader('INT', 'passing')).toBe('passInt')
    expect(statKeyForHeader('Interceptions', 'passing')).toBe('passInt')
    expect(statKeyForHeader('TOT', 'receiving')).toBeUndefined()
    expect(statKeyForHeader('INT', 'receiving')).toBeUndefined()
    expect(statKeyForHeader('MT', 'defense')).toBe('missedTackles')
    expect(() => parseStatSheet('Tackles 8\nTackles 12', 'defense')).toThrow('Multiple')
  })
})
