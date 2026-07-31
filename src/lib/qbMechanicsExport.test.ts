import { describe, expect, it } from 'vitest'
import type { ThrowAnalysis } from '../types'
import { qbMechanicsReportHtml } from './qbMechanicsExport'

const analysis: ThrowAnalysis = {
  plantTimeSec: 1.2,
  releaseTimeSec: 1.5,
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

describe('qbMechanicsReportHtml', () => {
  it('prints score, findings, coaching cues, and comparison context', () => {
    const html = qbMechanicsReportHtml({
      analysis,
      quarterbackName: 'A. Quarterback',
      opponent: 'Central',
      comparison: {
        label: 'Previous throw',
        scoreDelta: 8,
        improved: ['timing'],
        regressed: [],
      },
    })

    expect(html).toContain('Quarterback Mechanics')
    expect(html).toContain('Mechanics score')
    expect(html).toContain('Coaching cue:')
    expect(html).toContain('Previous throw')
    expect(html).toContain('+8')
  })

  it('escapes user-entered report metadata', () => {
    const html = qbMechanicsReportHtml({ analysis, filmLabel: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
