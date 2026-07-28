import { describe, expect, it } from 'vitest'
import type { FilmPlay } from '../types'
import { buildTendencyReport } from './filmAnalysis'
import { scoutingReportCsv, scoutingReportHtml } from './scoutingExport'

let counter = 0
function play(partial: Partial<FilmPlay>): FilmPlay {
  counter += 1
  return { id: `film-${counter}`, ...partial }
}

const report = buildTendencyReport([
  play({ opponent: 'Central', down: 1, distance: 10, yardLine: 8, formation: 'trips', call: 'run', concept: 'inside-zone', gain: 3 }),
  play({ opponent: 'Central', down: 3, distance: 8, yardLine: 45, formation: 'empty', call: 'pass', concept: 'mesh', gain: 12 }),
  play({ opponent: 'Central', down: 2, distance: 4, yardLine: 85, formation: 'trips', call: 'run', concept: 'power', gain: 2 }),
], { opponent: 'Central' })

describe('scouting CSV export', () => {
  it('includes the header summary and one row per group', () => {
    const csv = scoutingReportCsv(report, 'Central')
    expect(csv).toContain('FAI Defensive Scouting Report')
    expect(csv).toContain('Central')
    expect(csv).toContain('Run rate,67%')
    // A section column and at least the field-zone rows are present.
    expect(csv).toContain('Field zone')
    expect(csv).toContain('Backed up (own 1–20)')
    expect(csv).toContain('Red zone (opp 20–1)')
  })

  it('escapes cells that contain commas or quotes', () => {
    const csv = scoutingReportCsv(
      buildTendencyReport([play({ down: 1, distance: 10, formation: 'trips', call: 'run', concept: 'inside-zone' })]),
      'A, B "Team"',
    )
    expect(csv).toContain('"A, B ""Team"""')
  })
})

describe('scouting HTML export', () => {
  it('is a self-contained printable document with the summary and sections', () => {
    const html = scoutingReportHtml(report, 'Central')
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<title>Scouting Report — Central</title>')
    expect(html).toContain('Run rate')
    expect(html).toContain('window.print()')
    expect(html).toContain('Situational — field zone')
    // No external resources — everything inline.
    expect(html).not.toMatch(/src="https?:/)
    expect(html).not.toMatch(/href="https?:/)
  })

  it('escapes opponent names into the document', () => {
    const html = scoutingReportHtml(report, '<script>x</script>')
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
