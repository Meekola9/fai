import { describe, expect, it } from 'vitest'
import {
  broadJumpBandFor,
  broadJumpFamilyFor,
  formatBroadJump,
  historicalMaleBroadJumpBandFor,
} from './broadJumpBenchmarks'

describe('broad jump benchmarks', () => {
  it('maps football position groups into skill, hybrid, and line families', () => {
    expect(broadJumpFamilyFor('WR')).toBe('skill')
    expect(broadJumpFamilyFor('LB')).toBe('hybrid')
    expect(broadJumpFamilyFor('DL')).toBe('line')
  })

  it('uses position-family thresholds for the FAI football tier', () => {
    expect(broadJumpBandFor(108, 'WR').id).toBe('excellent')
    expect(broadJumpBandFor(108, 'LB').id).toBe('elite')
    expect(broadJumpBandFor(98, 'OL').id).toBe('excellent')
  })

  it('maps the historical male chart independently from football tiers', () => {
    expect(historicalMaleBroadJumpBandFor(98.5)?.percentile).toBe('41–50')
    expect(historicalMaleBroadJumpBandFor(110.3)?.percentile).toBe('61–70')
    expect(historicalMaleBroadJumpBandFor(122.1)?.percentile).toBe('81–90')
    expect(historicalMaleBroadJumpBandFor(70)).toBeUndefined()
  })

  it('formats stored inches as football feet-and-inches notation', () => {
    expect(formatBroadJump(112)).toBe(`9'4.0"`)
    expect(formatBroadJump(98.5)).toBe(`8'2.5"`)
  })
})
