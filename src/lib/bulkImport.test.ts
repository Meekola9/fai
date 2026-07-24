import { describe, expect, it } from 'vitest'
import {
  autoMapColumns,
  bestAttempt,
  buildRosterDraft,
  buildSessionDraft,
  detectDelimiter,
  matchAthlete,
  parseDateCell,
  parseDelimited,
  parseHeightCell,
  parseNumberCell,
  parsePersonName,
  resultsTemplateCsv,
  rosterTemplateCsv,
  validateRosterDraft,
  validateSessionDraft,
  type RosterAthlete,
} from './bulkImport'

describe('delimited parsing', () => {
  it('detects comma vs tab delimiters', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',')
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t')
  })

  it('parses CSV with quoted fields, embedded commas, newlines, and escaped quotes', () => {
    const text = 'name,note\n"Kemp, Demek","line1\nline2"\n"He said ""hi""",ok'
    const { headers, rows } = parseDelimited(text)
    expect(headers).toEqual(['name', 'note'])
    expect(rows[0]).toEqual(['Kemp, Demek', 'line1\nline2'])
    expect(rows[1]).toEqual(['He said "hi"', 'ok'])
  })

  it('parses pasted tab-separated data and ignores blank trailing lines', () => {
    const { headers, rows } = parseDelimited('Name\tPos\nDemek Kemp\tWR\n\n')
    expect(headers).toEqual(['Name', 'Pos'])
    expect(rows).toEqual([['Demek Kemp', 'WR']])
  })
})

describe('column auto-mapping', () => {
  it('maps common header spellings to canonical fields and reports unmapped', () => {
    const { mapping, unmapped } = autoMapColumns(['Athlete', '40 Time', 'Bench', 'Pos.', 'Mystery'])
    expect(mapping.display_name).toBe(0)
    expect(mapping.forty_yard_dash_best).toBe(1)
    expect(mapping.bench_max).toBe(2)
    expect(mapping.primary_position).toBe(3)
    expect(unmapped).toContain(4)
  })

  it('never assigns the same field to two columns', () => {
    const { mapping } = autoMapColumns(['name', 'athlete'])
    // Both alias to display_name; only the first wins.
    expect(mapping.display_name).toBe(0)
    expect(Object.values(mapping).filter((index) => index === 1)).toHaveLength(0)
  })
})

describe('value parsing', () => {
  it('parses numbers with commas and unit suffixes', () => {
    expect(parseNumberCell('1,250 lbs')).toBe(1250)
    expect(parseNumberCell('4.79s')).toBe(4.79)
    expect(parseNumberCell('')).toBeUndefined()
    expect(parseNumberCell('n/a')).toBeUndefined()
  })

  it('parses height from feet-inches and plain inches', () => {
    expect(parseHeightCell("5'11")).toBe(71)
    expect(parseHeightCell('6-2')).toBe(74)
    expect(parseHeightCell('70')).toBe(70)
    expect(parseHeightCell('')).toBeUndefined()
  })

  it('normalizes dates to ISO', () => {
    expect(parseDateCell('7/15/2026')).toBe('2026-07-15')
    expect(parseDateCell('2026-7-5')).toBe('2026-07-05')
    expect(parseDateCell('4/20/26')).toBe('2026-04-20')
    expect(parseDateCell('not a date')).toBeUndefined()
  })

  it('parses names including "Last, First" and suffixes', () => {
    expect(parsePersonName('Kemp, Demek')).toMatchObject({ first: 'Demek', last: 'Kemp' })
    expect(parsePersonName('Demek Kemp Jr.')).toMatchObject({ first: 'Demek', last: 'Kemp', suffix: 'Jr' })
    expect(parsePersonName('Demek Kemp').display).toBe('Demek Kemp')
    expect(parsePersonName('   ').display).toBe('')
  })

  it('computes the best of two attempts by direction', () => {
    expect(bestAttempt(4.82, 4.79, false)).toBe(4.79) // faster
    expect(bestAttempt(225, 245, true)).toBe(245) // stronger
    expect(bestAttempt(0, 4.9, false)).toBe(4.9) // ignores 0
    expect(bestAttempt(undefined, undefined, true)).toBeUndefined()
  })
})

describe('draft building', () => {
  it('builds a roster draft and derives the position group', () => {
    const { headers, rows } = parseDelimited('name,pos,grade,ht,wt\nDemek Kemp,WR,11,5\'11,175')
    const { mapping } = autoMapColumns(headers)
    const draft = buildRosterDraft(rows[0], mapping)
    expect(draft.fullName).toBe('Demek Kemp')
    expect(draft.position).toBe('WR')
    expect(draft.positionGroup).toBe('WR')
    expect(draft.grade).toBe(11)
    expect(draft.heightIn).toBe(71)
    expect(draft.weightLbs).toBe(175)
  })

  it('folds attempts and a best column into the true best time', () => {
    const { headers, rows } = parseDelimited(
      'athlete,40 dash 1,40 dash 2,40 time\nDemek Kemp,4.85,4.80,4.78',
    )
    const { mapping } = autoMapColumns(headers)
    const draft = buildSessionDraft(rows[0], mapping)
    // best of 4.85 / 4.80 / 4.78 (best column) → 4.78 stored in the first slot
    expect(draft.metrics.dash40_1).toBe(4.78)
  })
})

describe('validation', () => {
  it('errors when a roster row has no identity', () => {
    const issues = validateRosterDraft({})
    expect(issues.some((issue) => issue.severity === 'error')).toBe(true)
  })

  it('flags a mis-scaled 40 time for review with a decimal-shift suggestion', () => {
    const issues = validateSessionDraft({ athleteName: 'Demek Kemp', date: '2026-07-15', metrics: { dash40_1: 45 } })
    const flagged = issues.find((issue) => issue.field === 'forty_yard_dash_1')
    expect(flagged?.severity).toBe('review')
    expect(flagged?.message).toContain('4.5')
  })

  it('warns when a result row has no measurements', () => {
    const issues = validateSessionDraft({ athleteName: 'Demek Kemp', date: '2026-07-15', metrics: {} })
    expect(issues.some((issue) => issue.severity === 'warning')).toBe(true)
  })
})

describe('athlete matching', () => {
  const roster: RosterAthlete[] = [
    { id: 'a1', name: 'Demek Kemp', grade: 11, graduationYear: 2027 },
    { id: 'a2', name: 'Logan Cross', grade: 12, graduationYear: 2026 },
    { id: 'a3', name: 'Logan Cross', grade: 10, graduationYear: 2028 },
  ]

  it('matches an exact stable id', () => {
    expect(matchAthlete({ athleteId: 'a1' }, roster)).toMatchObject({ athleteId: 'a1', confidence: 'exact' })
  })

  it('matches a unique normalized full name', () => {
    expect(matchAthlete({ fullName: 'demek  KEMP' }, roster)).toMatchObject({ athleteId: 'a1', confidence: 'exact' })
  })

  it('reports ambiguous when two athletes share a name, then disambiguates by grad year', () => {
    expect(matchAthlete({ fullName: 'Logan Cross' }, roster).confidence).toBe('ambiguous')
    expect(
      matchAthlete({ fullName: 'Logan Cross', graduationYear: 2026 }, roster),
    ).toMatchObject({ athleteId: 'a2', confidence: 'high' })
  })

  it('matches an initial-style name to a single candidate', () => {
    expect(matchAthlete({ fullName: 'D Kemp' }, roster)).toMatchObject({ athleteId: 'a1', confidence: 'high' })
  })

  it('honors a coach-saved alias', () => {
    const aliases = new Map([['dk', 'a1']])
    expect(matchAthlete({ fullName: 'DK' }, roster, aliases)).toMatchObject({ athleteId: 'a1', confidence: 'high' })
  })

  it('returns none when nothing matches', () => {
    expect(matchAthlete({ fullName: 'Nobody Here' }, roster).confidence).toBe('none')
  })
})

describe('templates', () => {
  it('produces roster and results templates with headers and one example row', () => {
    const roster = rosterTemplateCsv().trim().split('\n')
    expect(roster[0]).toContain('first_name')
    expect(roster[0]).toContain('graduation_year')
    expect(roster).toHaveLength(2)

    const results = resultsTemplateCsv().trim().split('\n')
    expect(results[0]).toContain('forty_yard_dash_best')
    expect(results[0]).toContain('testing_date')
    expect(results).toHaveLength(2)
  })
})
