import type { Athlete, PlayEvent } from '../types'

export type GameDayBadgeTone = 'positive' | 'negative'

export interface GameDayBadgeDefinition {
  key: string
  id: string
  name: string
  tone: GameDayBadgeTone
  description: string
  earnedBy: string
  priority: number
}

export const GAME_DAY_BADGE_HOLD_DAYS = 7

export const GAME_DAY_BADGE_CATALOG: readonly GameDayBadgeDefinition[] = [
  {
    key: 'badge_menace',
    id: 'menace',
    name: 'Menace',
    tone: 'positive',
    description: 'The athlete directly created a change of possession.',
    earnedBy: 'Cause a turnover during the game.',
    priority: 90,
  },
  {
    key: 'badge_journeyman',
    id: 'journeyman',
    name: 'Journeyman',
    tone: 'positive',
    description: 'The athlete carried a major share of the rushing production.',
    earnedBy: 'Record a 100-yard rushing game.',
    priority: 88,
  },
  {
    key: 'badge_airmail',
    id: 'airmail',
    name: 'Airmail',
    tone: 'positive',
    description: 'The quarterback repeatedly finished drives through the air.',
    earnedBy: 'Throw three passing touchdowns in one game.',
    priority: 88,
  },
  {
    key: 'badge_swat',
    id: 'swat',
    name: 'Swat',
    tone: 'positive',
    description: 'The defender disrupted the catch point and erased a completion.',
    earnedBy: 'Break up a pass.',
    priority: 76,
  },
  {
    key: 'badge_waffle_house',
    id: 'waffle-house',
    name: 'Waffle House',
    tone: 'positive',
    description: 'The receiver stayed open and consistently served the passing game.',
    earnedBy: 'Record five catches in one game.',
    priority: 82,
  },
  {
    key: 'badge_robber',
    id: 'robber',
    name: 'Robber',
    tone: 'positive',
    description: 'The defender stole a possession or violently separated the ball.',
    earnedBy: 'Record an interception or force a fumble.',
    priority: 92,
  },
  {
    key: 'badge_butter_fingers',
    id: 'butter-fingers',
    name: 'Butter Fingers',
    tone: 'negative',
    description: 'A catchable pass was not secured.',
    earnedBy: 'Record a dropped pass.',
    priority: 60,
  },
  {
    key: 'badge_traffic_cone',
    id: 'traffic-cone',
    name: 'Traffic Cone',
    tone: 'negative',
    description: 'The assigned block was missed and the defender reached the play.',
    earnedBy: 'Record a missed block.',
    priority: 60,
  },
] as const

export const POSITIVE_GAME_DAY_BADGES = GAME_DAY_BADGE_CATALOG.filter((badge) => badge.tone === 'positive')
export const NEGATIVE_GAME_DAY_BADGES = GAME_DAY_BADGE_CATALOG.filter((badge) => badge.tone === 'negative')
export const GAME_DAY_BADGE_BY_KEY = new Map(GAME_DAY_BADGE_CATALOG.map((badge) => [badge.key, badge] as const))

export function gameDayBadgeForType(type: string): GameDayBadgeDefinition | undefined {
  return GAME_DAY_BADGE_BY_KEY.get(type)
}

export function isGameDayBadgeType(type: string): boolean {
  return GAME_DAY_BADGE_BY_KEY.has(type)
}

function dayNumberFromIso(date: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!match) return undefined
  const [, year, month, day] = match
  return Math.floor(Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000)
}

function dayNumberFromNow(now: Date | string): number | undefined {
  if (typeof now === 'string') return dayNumberFromIso(now)
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
}

export function gameDayBadgeIsActive(date: string, now: Date | string = new Date()): boolean {
  const earnedDay = dayNumberFromIso(date)
  const currentDay = dayNumberFromNow(now)
  if (earnedDay === undefined || currentDay === undefined) return false
  const elapsed = currentDay - earnedDay
  return elapsed >= 0 && elapsed < GAME_DAY_BADGE_HOLD_DAYS
}

export interface GameDayBadgeAward {
  play: PlayEvent
  badge: GameDayBadgeDefinition
}

export interface GameDayBadgeCount {
  badge: GameDayBadgeDefinition
  count: number
  latestDate: string
}

export interface AthleteGameDayBadgeSummary {
  activeAwards: GameDayBadgeAward[]
  seasonCounts: GameDayBadgeCount[]
  seasonTotal: number
  positiveTotal: number
  negativeTotal: number
}

export function athleteGameDayBadgeSummary(
  plays: PlayEvent[],
  athleteId: string,
  season = 2026,
  now: Date | string = new Date(),
): AthleteGameDayBadgeSummary {
  const awards = plays
    .filter((play) => play.athleteId === athleteId && play.date.startsWith(`${season}-`))
    .map((play) => {
      const badge = gameDayBadgeForType(play.type)
      return badge ? { play, badge } : undefined
    })
    .filter((item): item is GameDayBadgeAward => Boolean(item))
    .sort((a, b) => `${b.play.date}${b.play.createdAt ?? ''}`.localeCompare(`${a.play.date}${a.play.createdAt ?? ''}`))

  const countByKey = new Map<string, GameDayBadgeCount>()
  for (const award of awards) {
    const existing = countByKey.get(award.badge.key)
    countByKey.set(award.badge.key, {
      badge: award.badge,
      count: (existing?.count ?? 0) + 1,
      latestDate: existing && existing.latestDate > award.play.date ? existing.latestDate : award.play.date,
    })
  }

  const seasonCounts = [...countByKey.values()].sort(
    (a, b) => b.count - a.count || b.badge.priority - a.badge.priority || a.badge.name.localeCompare(b.badge.name),
  )

  return {
    activeAwards: awards.filter((award) => gameDayBadgeIsActive(award.play.date, now)),
    seasonCounts,
    seasonTotal: awards.length,
    positiveTotal: awards.filter((award) => award.badge.tone === 'positive').length,
    negativeTotal: awards.filter((award) => award.badge.tone === 'negative').length,
  }
}

export interface TeamGameDayBadgeAward extends GameDayBadgeAward {
  athlete: Athlete
}

export function activeTeamGameDayBadgeAwards(
  plays: PlayEvent[],
  athletes: Athlete[],
  now: Date | string = new Date(),
): TeamGameDayBadgeAward[] {
  const athleteById = new Map(athletes.map((athlete) => [athlete.id, athlete]))
  return plays
    .map((play) => {
      const badge = gameDayBadgeForType(play.type)
      const athlete = athleteById.get(play.athleteId)
      if (!badge || !athlete || !gameDayBadgeIsActive(play.date, now)) return undefined
      return { play, badge, athlete }
    })
    .filter((item): item is TeamGameDayBadgeAward => Boolean(item))
    .sort((a, b) => `${b.play.date}${b.play.createdAt ?? ''}`.localeCompare(`${a.play.date}${a.play.createdAt ?? ''}`))
}
