import { describe, expect, it } from 'vitest'
import { overallRatingFor } from './overallRatings'

describe('overallRatingFor', () => {
  it.each([
    [100, 'One of a Kind'],
    [96, 'One of a Kind'],
    [95.9, 'X Factor'],
    [90, 'X Factor'],
    [89.9, 'Superstar'],
    [80, 'Superstar'],
    [79.9, 'Star'],
    [70, 'Star'],
    [69.9, 'Normal'],
    [65, 'Normal'],
    [64.9, 'Needs Work'],
    [0, 'Needs Work'],
  ])('maps %s to %s', (score, label) => {
    expect(overallRatingFor(score).label).toBe(label)
  })

  it('clamps invalid and out-of-range values', () => {
    expect(overallRatingFor(120).label).toBe('One of a Kind')
    expect(overallRatingFor(-10).label).toBe('Needs Work')
    expect(overallRatingFor(Number.NaN).label).toBe('Needs Work')
  })
})
