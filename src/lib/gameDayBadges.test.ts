import { describe, expect, it } from 'vitest'
import type { Athlete, PlayEvent } from '../types'
import {
  GAME_DAY_BADGE_CATALOG,
  activeTeamGameDayBadgeAwards,
  athleteGameDayBadgeSummary,
  gameDayBadgeIsActive,
  isGameDayBadgeType,
} from './gameDayBadges'

const athlete: Athlete = {
  id: 'athlete-1',
  name: 'Test Athlete',
  grade: 11,
  position: 'RB',
  positionGroup: 'RB',
  heightIn: 70,
  weightLbs: 185,
}

const plays: PlayEvent[] = [
  { id: '1', athleteId: athlete.id, type: 'badge_journeyman', date: '2026-09-04', opponent: 'Central' },
  { id: '2', athleteId: athlete.id, type: 'badge_butter_fingers', date: '2026-09-04', opponent: 'Central' },
  { id: '3', athleteId: athlete.id, type: 'badge_journeyman', date: '2026-08-21', opponent: 'West' },
  { id: '4', athleteId: athlete.id, type: 'touchdown', date: '2026-09-04', opponent: 'Central' },
  { id: '5', athleteId: athlete.id, type: 'badge_airmail', date: '2025-09-01', opponent: 'Old' },
]

describe('game-day badges', () => {
  it('contains the eight coach-defined badge names', () => {
    expect(GAME_DAY_BADGE_CATALOG.map((badge) => badge.name)).toEqual([
      'Menace',
      'Journeyman',
      'Airmail',
      'Swat',
      'Waffle House',
      'Robber',
      'Butter Fingers',
      'Traffic Cone',
    ])
  })

  it('holds an award for seven days and then expires it from the weekly display', () => {
    expect(gameDayBadgeIsActive('2026-09-04', '2026-09-10')).toBe(true)
    expect(gameDayBadgeIsActive('2026-09-04', '2026-09-11')).toBe(false)
    expect(gameDayBadgeIsActive('2026-09-04', '2026-09-03')).toBe(false)
  })

  it('keeps season counts after weekly badges expire', () => {
    const summary = athleteGameDayBadgeSummary(plays, athlete.id, 2026, '2026-09-10')
    expect(summary.activeAwards.map((award) => award.badge.name)).toEqual([
      'Journeyman',
      'Butter Fingers',
    ])
    expect(summary.seasonTotal).toBe(3)
    expect(summary.positiveTotal).toBe(2)
    expect(summary.negativeTotal).toBe(1)
    expect(summary.seasonCounts.find((item) => item.badge.name === 'Journeyman')?.count).toBe(2)
  })

  it('returns active team awards with their athletes', () => {
    const awards = activeTeamGameDayBadgeAwards(plays, [athlete], '2026-09-10')
    expect(awards).toHaveLength(2)
    expect(awards.every((award) => award.athlete.id === athlete.id)).toBe(true)
  })

  it('does not classify ordinary impact plays as badges', () => {
    expect(isGameDayBadgeType('badge_robber')).toBe(true)
    expect(isGameDayBadgeType('interception')).toBe(false)
  })
})
