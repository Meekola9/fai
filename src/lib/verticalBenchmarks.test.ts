import { describe, expect, it } from 'vitest'
import {
  VERTICAL_BENCHMARK_PROFILES,
  verticalBandFor,
  verticalBandsFor,
  verticalFaiScore,
  verticalFamilyFor,
} from './verticalBenchmarks'

describe('vertical benchmark families', () => {
  it('maps skill, hybrid, and line groups correctly', () => {
    expect(verticalFamilyFor('WR')).toBe('skill')
    expect(verticalFamilyFor('DB')).toBe('skill')
    expect(verticalFamilyFor('RB')).toBe('skill')
    expect(verticalFamilyFor('QB')).toBe('skill')
    expect(verticalFamilyFor('LB')).toBe('hybrid')
    expect(verticalFamilyFor('TE')).toBe('hybrid')
    expect(verticalFamilyFor('OL')).toBe('line')
    expect(verticalFamilyFor('DL')).toBe('line')
  })

  it('uses the selected national high-school thresholds', () => {
    expect(verticalBandFor(35, 'WR').label).toBe('Elite')
    expect(verticalBandFor(32, 'WR').label).toBe('Excellent')
    expect(verticalBandFor(30, 'WR').label).toBe('Good')
    expect(verticalBandFor(27, 'WR').label).toBe('Average')
    expect(verticalBandFor(26.9, 'WR').label).toBe('Developing')

    expect(verticalBandFor(33, 'LB').label).toBe('Elite')
    expect(verticalBandFor(27, 'LB').label).toBe('Good')
    expect(verticalBandFor(24, 'LB').label).toBe('Average')

    expect(verticalBandFor(30, 'OL').label).toBe('Elite')
    expect(verticalBandFor(24, 'OL').label).toBe('Good')
    expect(verticalBandFor(21, 'OL').label).toBe('Average')
  })

  it('makes Georgia one inch and NCAA projection three inches tougher', () => {
    expect(verticalBandsFor('WR', 'national-hs')[0].min).toBe(35)
    expect(verticalBandsFor('WR', 'georgia-hs')[0].min).toBe(36)
    expect(verticalBandsFor('WR', 'ncaa-recruiting')[0].min).toBe(38)
    expect(verticalBandFor(35, 'WR', 'georgia-hs').label).toBe('Excellent')
    expect(verticalBandFor(35, 'WR', 'ncaa-recruiting').label).toBe('Excellent')
  })

  it('labels comparison tiers honestly as coaching standards', () => {
    expect(VERTICAL_BENCHMARK_PROFILES['national-hs'].note).toContain('not a statistical census')
    expect(VERTICAL_BENCHMARK_PROFILES['georgia-hs'].note).toContain('not an official GHSA percentile dataset')
    expect(VERTICAL_BENCHMARK_PROFILES['ncaa-recruiting'].note).toContain('not an NCAA eligibility rule')
  })
})

describe('vertical FAI scoring', () => {
  it('uses National High School anchors regardless of comparison mode', () => {
    expect(verticalFaiScore(35, 'WR')).toBe(100)
    expect(verticalFaiScore(32, 'WR')).toBe(90)
    expect(verticalFaiScore(30, 'WR')).toBe(80)
    expect(verticalFaiScore(27, 'WR')).toBe(65)
    expect(verticalFaiScore(25, 'WR')).toBe(45)

    expect(verticalFaiScore(33, 'LB')).toBe(100)
    expect(verticalFaiScore(30, 'LB')).toBe(90)
    expect(verticalFaiScore(27, 'LB')).toBe(80)
    expect(verticalFaiScore(24, 'LB')).toBe(65)

    expect(verticalFaiScore(30, 'OL')).toBe(100)
    expect(verticalFaiScore(27, 'OL')).toBe(90)
    expect(verticalFaiScore(24, 'OL')).toBe(80)
    expect(verticalFaiScore(21, 'OL')).toBe(65)
  })

  it('interpolates within a performance band and clamps elite scores', () => {
    expect(verticalFaiScore(31, 'WR')).toBe(85)
    expect(verticalFaiScore(28.5, 'WR')).toBeCloseTo(72.5, 5)
    expect(verticalFaiScore(42, 'WR')).toBe(100)
  })
})
