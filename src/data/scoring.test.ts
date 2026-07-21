import { describe, expect, it } from 'vitest'
import { flyTimeToMph } from './scoring'

describe('flyTimeToMph', () => {
  it('converts a 10-yard fly time into miles per hour', () => {
    // 30 feet in 1.00s = 30 ft/s = 20.45 mph
    expect(flyTimeToMph(1.0)).toBeCloseTo(20.45, 2)
    expect(flyTimeToMph(1.5)).toBeCloseTo(13.64, 2)
    expect(flyTimeToMph(2.0)).toBeCloseTo(10.23, 2)
  })

  it('is monotonic: faster fly means higher mph', () => {
    expect(flyTimeToMph(1.2)).toBeGreaterThan(flyTimeToMph(1.4))
  })
})
