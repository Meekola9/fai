import { describe, expect, it } from 'vitest'
import { overallRatingFor } from './overallRatings'

describe('overallRatingFor', () => {
  it.each([
    [100, 'One of a Kind'],
    [96, 'One of a Kind'],
    [95.9, 'DAWG'],
    [90, 'DAWG'],
    [89.9, 'Difference Maker'],
    [80, 'Difference Maker'],
    [79.9, 'Developing Talent'],
    [70, 'Developing Talent'],
    [69.9, 'Building Block'],
    [65, 'Building Block'],
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
