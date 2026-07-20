// ---------------------------------------------------------------------------
// Alumni classification.
//
// Grade snapshots record what grade an athlete was in on the day they tested,
// so the graduating class can be derived from the most recent snapshot. Once
// that class year has passed, the athlete is shown as an alumnus instead of
// carrying a stale grade. School years run August through July.
// ---------------------------------------------------------------------------

import type { Athlete, TestSession } from '../types'

/** The calendar year a school year ends in, given any date inside it. */
export function schoolYearEnd(year: number, month: number): number {
  return month >= 7 ? year + 1 : year
}

function currentSchoolYearEnd(now: Date): number {
  return schoolYearEnd(now.getFullYear(), now.getMonth() + 1)
}

/** Graduating class year derived from the athlete's most recent grade snapshot. */
export function classOf(athlete: Athlete, sessions: TestSession[]): number | undefined {
  const latest = sessions
    .filter(
      (session) =>
        session.athleteId === athlete.id && (session.gradeSnapshot ?? 0) > 0,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!latest?.gradeSnapshot) return undefined

  const [year, month] = latest.date.split('-').map(Number)
  if (!year || !month) return undefined
  return schoolYearEnd(year, month) + (12 - Math.round(latest.gradeSnapshot))
}

export function isAlumnus(
  athlete: Athlete,
  sessions: TestSession[],
  now: Date = new Date(),
): boolean {
  const graduation = classOf(athlete, sessions)
  return graduation !== undefined && currentSchoolYearEnd(now) > graduation
}

/**
 * Display label for an athlete's grade: "Gr 11" / "Grade 11" while enrolled,
 * "Alumni '24" once their class has graduated. Athletes without any dated
 * grade snapshot are treated as current students.
 */
export function gradeLabel(
  athlete: Athlete,
  sessions: TestSession[],
  style: 'short' | 'long' = 'short',
  now: Date = new Date(),
): string {
  const graduation = classOf(athlete, sessions)
  if (graduation !== undefined && currentSchoolYearEnd(now) > graduation) {
    return `Alumni '${String(graduation).slice(-2)}`
  }
  return style === 'long' ? `Grade ${athlete.grade}` : `Gr ${athlete.grade}`
}
