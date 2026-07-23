import { describe, expect, it } from 'vitest'
import {
  ILLINOIS_AGILITY_SCORE_ANCHORS,
  illinoisAgilityBandFor,
  illinoisAgilityScore,
} from './illinoisAgility'

describe('Illinois Agility Test standards for males age 16–19', () => {
  it.each([
    [15.19, 'Excellent'],
    [15.2, 'Above Average'],
    [16.1, 'Above Average'],
    [16.2, 'Average'],
    [18.1, 'Average'],
    [18.2, 'Below Average'],
    [19.3, 'Below Average'],
    [19.31, 'Poor'],
  ])('classifies %ss as %s', (seconds, label) => {
    expect(illinoisAgilityBandFor(seconds).label).toBe(label)
  })

  it('uses the selected FAI score anchors', () => {
    expect(ILLINOIS_AGILITY_SCORE_ANCHORS.map(({ seconds, score }) => [seconds, score])).toEqual([
      [15.2, 100],
      [16.1, 90],
      [18.1, 75],
      [19.3, 60],
      [22.5, 0],
    ])
  })

  it('interpolates between classifications and preserves lower-is-better ordering', () => {
    expect(illinoisAgilityScore(15)).toBe(100)
    expect(illinoisAgilityScore(15.65)).toBeCloseTo(95, 5)
    expect(illinoisAgilityScore(17.1)).toBeCloseTo(82.5, 5)
    expect(illinoisAgilityScore(18.7)).toBeCloseTo(67.5, 5)
    expect(illinoisAgilityScore(20)).toBeLessThan(60)
    expect(illinoisAgilityScore(22.5)).toBe(0)
    expect(illinoisAgilityScore(16)).toBeGreaterThan(illinoisAgilityScore(18)!)
  })

  it('rejects invalid times', () => {
    expect(illinoisAgilityScore(0)).toBeUndefined()
    expect(illinoisAgilityScore(Number.NaN)).toBeUndefined()
  })
})
