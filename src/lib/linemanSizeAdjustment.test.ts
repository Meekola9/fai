import { describe, expect, it } from 'vitest'
import { linemanSizeBonus } from './compute'

describe('lineman size adjustment', () => {
  it('rewards legitimate offensive-line size when the athlete can move', () => {
    expect(linemanSizeBonus(70, 315, 'OL')).toBe(8)
    expect(linemanSizeBonus(60, 315, 'OL')).toBeGreaterThan(5)
  })

  it('rewards legitimate defensive-line size', () => {
    expect(linemanSizeBonus(70, 285, 'DL')).toBe(8)
  })

  it('does not adjust non-linemen', () => {
    expect(linemanSizeBonus(80, 315, 'WR')).toBe(0)
    expect(linemanSizeBonus(80, 315, 'LB')).toBe(0)
  })

  it('does not let body weight hide poor underlying athleticism', () => {
    expect(linemanSizeBonus(35, 315, 'OL')).toBe(0)
    expect(linemanSizeBonus(20, 315, 'DL')).toBe(0)
  })

  it('tapers the bonus for extreme weight outliers', () => {
    expect(linemanSizeBonus(70, 360, 'OL')).toBeLessThan(8)
    expect(linemanSizeBonus(70, 375, 'OL')).toBe(0)
  })
})
