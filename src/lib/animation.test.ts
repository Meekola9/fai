import { describe, expect, it } from 'vitest'
import { easeOutCubic, stepCountUp } from './animation'

describe('easeOutCubic', () => {
  it('pins the endpoints and clamps out-of-range input', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
  })

  it('is past halfway by the time it is halfway through (ease-out)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('stepCountUp', () => {
  it('starts at from and lands exactly on to', () => {
    expect(stepCountUp(0, 72, 0)).toBe(0)
    expect(stepCountUp(0, 72, 1)).toBe(72)
    expect(stepCountUp(50, 72, 1)).toBe(72)
  })

  it('advances monotonically between the endpoints', () => {
    const a = stepCountUp(0, 100, 0.25)
    const b = stepCountUp(0, 100, 0.75)
    expect(a).toBeGreaterThan(0)
    expect(b).toBeGreaterThan(a)
    expect(b).toBeLessThanOrEqual(100)
  })
})
