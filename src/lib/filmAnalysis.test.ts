import { describe, expect, it } from 'vitest'
import type { FilmPlay } from '../types'
import {
  buildTendencyReport,
  distanceBucket,
  opponentsFromFilm,
  pathLength,
  routeDepth,
} from './filmAnalysis'

let counter = 0
function play(partial: Partial<FilmPlay>): FilmPlay {
  counter += 1
  return { id: `film-${counter}`, ...partial }
}

describe('film tendency engine', () => {
  it('buckets distance into short / medium / long', () => {
    expect(distanceBucket(1)).toBe('short')
    expect(distanceBucket(3)).toBe('short')
    expect(distanceBucket(5)).toBe('medium')
    expect(distanceBucket(10)).toBe('long')
    expect(distanceBucket(undefined)).toBeUndefined()
  })

  it('computes run/pass split and ignores special teams', () => {
    const plays = [
      play({ opponent: 'Central', call: 'run', gain: 5 }),
      play({ opponent: 'Central', call: 'run', gain: 3 }),
      play({ opponent: 'Central', call: 'pass', gain: 12 }),
      play({ opponent: 'Central', call: 'special' }), // excluded from run/pass
    ]
    const report = buildTendencyReport(plays)
    expect(report.totalPlays).toBe(3) // special teams not counted as a scrimmage play
    expect(report.runShare).toBeCloseTo(2 / 3, 5)
    expect(report.passShare).toBeCloseTo(1 / 3, 5)
  })

  it('treats screens as a pass-family call', () => {
    const report = buildTendencyReport([
      play({ call: 'run' }),
      play({ call: 'screen' }),
    ])
    expect(report.runShare).toBeCloseTo(0.5, 5)
    expect(report.passShare).toBeCloseTo(0.5, 5)
  })

  it('filters by opponent and groups by down & distance', () => {
    const plays = [
      play({ opponent: 'Central', down: 1, distance: 10, call: 'run', gain: 4 }),
      play({ opponent: 'Central', down: 3, distance: 2, call: 'run', gain: 3 }),
      play({ opponent: 'North', down: 1, distance: 10, call: 'pass', gain: 8 }),
    ]
    const report = buildTendencyReport(plays, { opponent: 'Central' })
    expect(report.totalPlays).toBe(2)
    // 3rd & short should be a 100%-run group for Central.
    const thirdShort = report.byDownDistance.find((group) => group.key === '3:short')
    expect(thirdShort?.runShare).toBe(1)
    expect(thirdShort?.plays).toBe(1)
  })

  it('summarizes formation groups with top concepts and average gain', () => {
    const plays = [
      play({ formation: 'trips', call: 'pass', concept: 'four_verts', gain: 20 }),
      play({ formation: 'trips', call: 'pass', concept: 'four_verts', gain: 0 }),
      play({ formation: 'trips', call: 'run', concept: 'power', gain: 10 }),
    ]
    const report = buildTendencyReport(plays)
    const trips = report.byFormation.find((group) => group.key === 'trips')!
    expect(trips.plays).toBe(3)
    expect(trips.passShare).toBeCloseTo(2 / 3, 5)
    expect(trips.avgGain).toBe(10) // (20 + 0 + 10) / 3
    expect(trips.topConcepts[0]?.key).toBe('four_verts')
    expect(trips.topConcepts[0]?.count).toBe(2)
  })

  it('lists unique opponents alphabetically', () => {
    const plays = [
      play({ opponent: 'North' }),
      play({ opponent: 'Central' }),
      play({ opponent: 'Central' }),
      play({ opponent: '' }),
    ]
    expect(opponentsFromFilm(plays)).toEqual(['Central', 'North'])
  })
})

describe('overlay geometry', () => {
  it('measures normalized path length', () => {
    // a 3-4-5 right triangle in normalized space: legs 0.3 and 0.4 → 0.5
    expect(pathLength([{ x: 0, y: 0 }, { x: 0.3, y: 0 }, { x: 0.3, y: 0.4 }])).toBeCloseTo(0.7, 5)
  })

  it('measures downfield route depth (up is negative y)', () => {
    // starts low (y=0.9), breaks upfield (y=0.2) → positive depth of 0.7
    expect(routeDepth([{ x: 0.5, y: 0.9 }, { x: 0.5, y: 0.2 }])).toBeCloseTo(0.7, 5)
  })
})
