import { describe, expect, it } from 'vitest'
import type { Athlete, TestSession } from '../types'
import { classOf, gradeLabel, isAlumnus } from './alumni'

const athlete: Athlete = {
  id: 'a1',
  name: 'Test Athlete',
  grade: 12,
  position: 'RB',
  positionGroup: 'RB',
  heightIn: 70,
  weightLbs: 185,
}

function session(date: string, gradeSnapshot: number): TestSession {
  return {
    id: `s-${date}`,
    athleteId: 'a1',
    eventId: 'e1',
    date,
    phase: 'Summer',
    gradeSnapshot,
  }
}

describe('alumni classification', () => {
  it('derives the class year from the most recent grade snapshot', () => {
    // Grade 11 in January 2025 → class of 2026.
    expect(classOf(athlete, [session('2022-06-15', 8), session('2025-01-10', 11)])).toBe(2026)
  })

  it('treats fall-semester sessions as part of the school year ending the next June', () => {
    // Grade 12 in October 2024 → class of 2025.
    expect(classOf(athlete, [session('2024-10-01', 12)])).toBe(2025)
  })

  it('marks graduated classes as alumni', () => {
    const sessions = [session('2020-06-15', 8)] // class of 2024
    expect(isAlumnus(athlete, sessions, new Date('2026-07-20T12:00:00'))).toBe(true)
    expect(gradeLabel(athlete, sessions, 'short', new Date('2026-07-20T12:00:00'))).toBe(
      "Alumni '24",
    )
  })

  it('keeps current students on their roster grade', () => {
    const sessions = [session('2026-01-10', 12)] // class of 2026, still enrolled that June
    expect(isAlumnus(athlete, sessions, new Date('2026-05-01T12:00:00'))).toBe(false)
    expect(gradeLabel(athlete, sessions, 'short', new Date('2026-05-01T12:00:00'))).toBe('Gr 12')
    expect(gradeLabel(athlete, sessions, 'long', new Date('2026-05-01T12:00:00'))).toBe('Grade 12')
  })

  it('treats athletes without dated snapshots as current students', () => {
    expect(isAlumnus(athlete, [])).toBe(false)
    expect(gradeLabel(athlete, [])).toBe('Gr 12')
  })
})
