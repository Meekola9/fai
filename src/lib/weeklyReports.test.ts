import { describe, expect, it } from 'vitest'
import { defaultCriteria, gradePercent, sameReportGame, validateGrade, weeklyGradesCsv, weeklyPacketHtml, weeklySituations, type WeeklyGrade } from './weeklyReports'

const card: WeeklyGrade = {
  id: 'g1', athleteId: 'a1', athleteName: 'Sample Athlete', positionGroup: 'RB',
  date: '2026-09-14', opponent: 'Central', coach: 'Coach',
  criteria: [{ label: 'Assignment', score: 2 }, { label: 'Finish', score: 0 }, { label: 'Pass protection', score: null }],
  notes: 'Stay square', focus: 'Mirror drill', revision: 0,
}
describe('weekly coach reports', () => {
  it('excludes N/A from the denominator without hiding zero grades', () => {
    expect(gradePercent(card.criteria)).toBe(50)
    expect(gradePercent([{ label: 'Finish', score: 0 }])).toBe(0)
    expect(gradePercent(defaultCriteria('DB'))).toBeNull()
    expect(gradePercent([{ label: 'Invalid', score: NaN }])).toBeNull()
  })
  it('validates actual calendar dates, criteria, and at least one grade', () => {
    expect(() => validateGrade(card)).not.toThrow()
    expect(() => validateGrade({ ...card, date: '2026-02-30' })).toThrow()
    expect(() => validateGrade({ ...card, criteria: defaultCriteria('RB') })).toThrow()
    expect(() => validateGrade({ ...card, criteria: [{ label: 'Test', score: 3 }] })).toThrow()
    expect(() => validateGrade({ ...card, criteria: [{ label: 'Test', score: 2 }, { label: ' test ', score: 1 }] })).toThrow()
  })
  it('keeps game dates separate while normalizing opponent whitespace and case', () => {
    expect(sameReportGame(card, '2026-09-14', ' central ')).toBe(true)
    expect(sameReportGame(card, '2026-09-21', 'Central')).toBe(false)
  })
  it('preserves RPO and unknown shares and excludes special teams', () => {
    const plays = [
      { id: '1', call: 'run' as const, down: 3, distance: 2, yardLine: 10 },
      { id: '2', call: 'screen' as const, down: 3, distance: 8, yardLine: 80 },
      { id: '3', call: 'rpo' as const, down: 1 },
      { id: '4' },
      { id: '5', call: 'special' as const },
      { id: '6', side: 'special' as const },
    ]
    const rows = weeklySituations(plays)
    expect(rows[0]).toMatchObject({ count: 4, run: 1, pass: 1, rpo: 1, unknown: 1 })
    expect(rows.find(r => r.label.startsWith('Coming out'))?.count).toBe(1)
    expect(rows.find(r => r.label.startsWith('Red zone'))?.count).toBe(1)
    expect(rows.find(r => r.label.startsWith('3rd & short'))?.count).toBe(1)
    expect(weeklySituations([])[0].count).toBe(0)
  })
  it('escapes imported content and neutralizes spreadsheet formulas', () => {
    const malicious = { ...card, athleteName: '<script>alert(1)</script>', notes: '=HYPERLINK("example")' }
    const html = weeklyPacketHtml('Team', card.date, card.opponent, [malicious], [], '')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(weeklyGradesCsv([malicious])).toContain("'=HYPERLINK")
    expect(weeklyGradesCsv([card])).toContain('"N/A"')
    expect(html).toContain('50% execution grade')
  })
})
