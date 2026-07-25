import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, applyFilters } from '../components/Filters'
import { positionGroupBoards } from './leaderboards'
import type { AthleteResult } from '../types'

function twoWayResult(): AthleteResult {
  return {
    athlete: {
      id: 'two-way-1',
      name: 'Two Way Player',
      grade: 11,
      position: 'WR',
      positionGroup: 'WR',
      usage: 'two-way',
      secondaryPosition: 'CB',
      secondaryPositionGroup: 'DB',
      heightIn: 72,
      weightLbs: 185,
    },
    current: {
      fai: 84.2,
      session: {
        id: 'session-1',
        athleteId: 'two-way-1',
        eventId: 'season-2026',
        positionSnapshot: 'WR',
        positionGroupSnapshot: 'WR',
      },
    },
    rankEligible: true,
  } as unknown as AthleteResult
}

describe('two-way position filtering', () => {
  it('includes a two-way athlete in both primary and secondary group filters', () => {
    const result = twoWayResult()

    expect(applyFilters([result], { ...EMPTY_FILTERS, group: 'WR' })).toHaveLength(1)
    expect(applyFilters([result], { ...EMPTY_FILTERS, group: 'DB' })).toHaveLength(1)
    expect(applyFilters([result], { ...EMPTY_FILTERS, group: 'RB' })).toHaveLength(0)
  })

  it('includes a two-way athlete when either exact position is searched', () => {
    const result = twoWayResult()

    expect(applyFilters([result], { ...EMPTY_FILTERS, position: 'WR' })).toHaveLength(1)
    expect(applyFilters([result], { ...EMPTY_FILTERS, position: 'CB' })).toHaveLength(1)
  })

  it('places an official two-way athlete on both position-group boards', () => {
    const boards = positionGroupBoards([twoWayResult()])
    const wr = boards.find((board) => board.group === 'WR')
    const db = boards.find((board) => board.group === 'DB')

    expect(wr?.rows.map((row) => row.result.athlete.id)).toEqual(['two-way-1'])
    expect(db?.rows.map((row) => row.result.athlete.id)).toEqual(['two-way-1'])
  })
})
