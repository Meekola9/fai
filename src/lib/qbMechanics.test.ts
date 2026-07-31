import { describe, expect, it } from 'vitest'
import type { ThrowAnalysis } from '../types'
import { buildQbMechanicsReport, compareQbMechanics } from './qbMechanics'

const strongRelease: ThrowAnalysis = {
  snapTimeSec: 1,
  plantTimeSec: 2.1,
  releaseTimeSec: 2.4,
  landmarks: {
    throwingShoulder: { x: 0.48, y: 0.35 },
    throwingElbow: { x: 0.55, y: 0.4 },
    throwingWrist: { x: 0.63, y: 0.34 },
    frontShoulder: { x: 0.62, y: 0.37 },
    throwingHip: { x: 0.49, y: 0.58 },
    frontHip: { x: 0.6, y: 0.62 },
    backFoot: { x: 0.45, y: 0.84 },
    frontFoot: { x: 0.58, y: 0.82 },
  },
}

describe('buildQbMechanicsReport', () => {
  it('grades a complete release and returns coaching findings', () => {
    const report = buildQbMechanicsReport(strongRelease)
    expect(report.completeness).toBe(100)
    expect(report.score).toBeGreaterThan(60)
    expect(report.findings).toHaveLength(6)
    expect(report.findings.every((item) => item.coachingCue.length > 0)).toBe(true)
  })

  it('does not invent grades when landmarks are missing', () => {
    const report = buildQbMechanicsReport({ snapTimeSec: 1, releaseTimeSec: 2.5 })
    expect(report.completeness).toBe(0)
    expect(report.score).toBe(0)
    expect(report.findings).toEqual([])
  })

  it('flags an excessively delayed plant-to-release transition', () => {
    const report = buildQbMechanicsReport({
      ...strongRelease,
      plantTimeSec: 1.5,
      releaseTimeSec: 2.4,
    })
    const timing = report.findings.find((item) => item.category === 'timing')
    expect(timing?.severity).toBe('priority')
  })
})

describe('compareQbMechanics', () => {
  it('identifies category improvement across two throws', () => {
    const baseline: ThrowAnalysis = {
      ...strongRelease,
      plantTimeSec: 1.5,
      releaseTimeSec: 2.4,
    }
    const comparison = compareQbMechanics(baseline, strongRelease)
    expect(comparison.scoreDelta).toBeGreaterThan(0)
    expect(comparison.improved).toContain('timing')
    expect(comparison.regressed).not.toContain('timing')
  })
})
