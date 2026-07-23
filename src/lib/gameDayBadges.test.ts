import { describe, expect, it } from 'vitest'
import type { Athlete, PlayEvent } from '../types'
import {
  GAME_DAY_BADGE_CATALOG,
  SEASON_ACHIEVEMENT_BADGES,
  activeTeamGameDayBadgeAwards,
  athleteGameDayBadgeSummary,
  athleteHasSeasonAchievement,
  gameDayBadgeIsActive,
  isGameDayBadgeType,
  teamSeasonAchievementAwards,
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
  { id: '6', athleteId: athlete.id, type: 'achievement_workhorse_800', date: '2026-10-10' },
  { id: '7', athleteId: athlete.id, type: 'achievement_workhorse_800', date: '2026-10-11' },
  { id: '8', athleteId: athlete.id, type: 'achievement_paydirt_10', date: '2026-10-15' },
]

const achievementNames = [
  'Workhorse',
  'Four Digits',
  'Paydirt 10',
  'Ground Monopoly',
  'Freight Train',
  'Touchdown Dealer',
  'Air Traffic Control',
  'Two Grand',
  'Cannon Day',
  'Surgeon',
  'Target Magnet',
  'Skyline',
  'Air Property',
  'Red Zone Royalty',
  'Double Tap',
  'Tackle Machine',
  'Centurion',
  'Backfield Tax',
  'Sack Lunch',
  'Wrecking Crew',
  'No-Fly Zone',
  'Pickpocket',
  'Ball Separator',
  'Return to Sender',
  'Flip the Field',
  'Touchback King',
  'Ice Water',
  'All-Purpose Engine',
  'Swiss Army Score',
  'Pancake Factory',
]

describe('game-day and achievement badges', () => {
  it('keeps the original eight weekly badge names', () => {
    expect(GAME_DAY_BADGE_CATALOG.filter((badge) => badge.scope === 'weekly').map((badge) => badge.name)).toEqual([
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

  it('contains exactly 30 unique season achievement badges', () => {
    expect(SEASON_ACHIEVEMENT_BADGES).toHaveLength(30)
    expect(SEASON_ACHIEVEMENT_BADGES.map((badge) => badge.name)).toEqual(achievementNames)
    expect(new Set(SEASON_ACHIEVEMENT_BADGES.map((badge) => badge.name)).size).toBe(30)
    expect(new Set(SEASON_ACHIEVEMENT_BADGES.map((badge) => badge.key)).size).toBe(30)
    expect(SEASON_ACHIEVEMENT_BADGES.every((badge) => badge.scope === 'season' && badge.art)).toBe(true)
  })

  it('includes the requested 800 rushing yards and 10-touchdown milestones', () => {
    expect(SEASON_ACHIEVEMENT_BADGES.find((badge) => badge.name === 'Workhorse')?.earnedBy).toContain('800 rushing yards')
    expect(SEASON_ACHIEVEMENT_BADGES.find((badge) => badge.name === 'Paydirt 10')?.earnedBy).toContain('10 total touchdowns')
  })

  it('holds a weekly award for seven days and then expires it from the active display', () => {
    expect(gameDayBadgeIsActive('2026-09-04', '2026-09-10')).toBe(true)
    expect(gameDayBadgeIsActive('2026-09-04', '2026-09-11')).toBe(false)
    expect(gameDayBadgeIsActive('2026-09-04', '2026-09-03')).toBe(false)
  })

  it('keeps season achievements permanent and deduplicated in the season record', () => {
    const summary = athleteGameDayBadgeSummary(plays, athlete.id, 2026, '2026-12-31')
    expect(summary.activeAwards).toEqual([])
    expect(summary.achievementAwards?.map((award) => award.badge.name)).toEqual(['Paydirt 10', 'Workhorse'])
    expect(summary.achievementTotal).toBe(2)
    expect(summary.weeklyTotal).toBe(3)
    expect(summary.seasonTotal).toBe(5)
    expect(summary.seasonCounts.find((item) => item.badge.name === 'Workhorse')?.count).toBe(1)
  })

  it('keeps weekly season counts after the active display expires', () => {
    const summary = athleteGameDayBadgeSummary(plays, athlete.id, 2026, '2026-09-10')
    expect(summary.activeAwards.map((award) => award.badge.name)).toEqual([
      'Journeyman',
      'Butter Fingers',
    ])
    expect(summary.seasonCounts.find((item) => item.badge.name === 'Journeyman')?.count).toBe(2)
  })

  it('returns only weekly awards in the active team feed', () => {
    const awards = activeTeamGameDayBadgeAwards(plays, [athlete], '2026-09-10')
    expect(awards).toHaveLength(2)
    expect(awards.every((award) => award.badge.scope === 'weekly')).toBe(true)
  })

  it('returns permanent season achievements once per athlete and badge', () => {
    const awards = teamSeasonAchievementAwards(plays, [athlete], 2026)
    expect(awards.map((award) => award.badge.name)).toEqual(['Paydirt 10', 'Workhorse'])
    expect(athleteHasSeasonAchievement(plays, athlete.id, 'achievement_workhorse_800')).toBe(true)
    expect(athleteHasSeasonAchievement(plays, athlete.id, 'achievement_four_digits')).toBe(false)
  })

  it('classifies all badge and achievement records outside impact scoring', () => {
    expect(isGameDayBadgeType('badge_robber')).toBe(true)
    expect(isGameDayBadgeType('achievement_four_digits')).toBe(true)
    expect(isGameDayBadgeType('interception')).toBe(false)
  })
})
