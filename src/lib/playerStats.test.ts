import { describe, expect, it } from 'vitest'
import type { PlayerGameStat } from '../types'
import { buildAthleteSeasonStats, statFieldsForPosition } from './playerStats'

function stat(id: string, athleteId: string, stats: PlayerGameStat['stats']): PlayerGameStat {
  return { id, athleteId, date: '2026-09-01', opponent: 'Central', stats }
}

describe('statFieldsForPosition', () => {
  it('gives receivers the receiving fields and OL none', () => {
    expect(statFieldsForPosition('WR')).toContain('targets')
    expect(statFieldsForPosition('WR')).toContain('drops')
    expect(statFieldsForPosition('OL')).toEqual([])
  })
  it('gives QB passing + rushing', () => {
    const qb = statFieldsForPosition('QB')
    expect(qb).toContain('passAtt')
    expect(qb).toContain('rushYds')
  })
})

describe('buildAthleteSeasonStats', () => {
  it('sums stats across games and counts games', () => {
    const season = buildAthleteSeasonStats('a', [
      stat('s1', 'a', { rushAtt: 10, rushYds: 60, rushTD: 1 }),
      stat('s2', 'a', { rushAtt: 8, rushYds: 50 }),
      stat('s3', 'b', { rushAtt: 99, rushYds: 99 }), // other athlete, ignored
    ])
    expect(season.games).toBe(2)
    expect(season.totals.rushAtt).toBe(18)
    expect(season.totals.rushYds).toBe(110)
    expect(season.totals.rushTD).toBe(1)
  })

  it('computes rate metrics only when the denominator exists', () => {
    const season = buildAthleteSeasonStats('a', [
      stat('s1', 'a', { rushAtt: 20, rushYds: 130, targets: 8, rec: 6, recYds: 90, tackles: 9, missedTackles: 1 }),
    ])
    expect(season.rates.ypc).toBe(6.5) // 130/20
    expect(season.rates.catchPct).toBe(75) // 6/8
    expect(season.rates.ypr).toBe(15) // 90/6
    expect(season.rates.tacklePct).toBe(90) // 9/10
    expect(season.rates.compPct).toBeUndefined() // no pass attempts
  })

  it('returns empty totals for an athlete with no stats', () => {
    const season = buildAthleteSeasonStats('nobody', [])
    expect(season.games).toBe(0)
    expect(season.totals).toEqual({})
    expect(season.rates).toEqual({})
  })
})
