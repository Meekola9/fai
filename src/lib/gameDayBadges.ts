import type { Athlete, PlayEvent } from '../types'

export type GameDayBadgeTone = 'positive' | 'negative'
export type BadgeScope = 'weekly' | 'season'
export type BadgeCategory =
  | 'weekly'
  | 'rushing'
  | 'passing'
  | 'receiving'
  | 'defense'
  | 'special-teams'
  | 'versatility'
  | 'offensive-line'

export type BadgeArtMotif =
  | 'rush'
  | 'touchdown'
  | 'pass'
  | 'precision'
  | 'target'
  | 'crown'
  | 'tackle'
  | 'backfield'
  | 'sack'
  | 'coverage'
  | 'takeaway'
  | 'separate'
  | 'return'
  | 'kick'
  | 'versatile'
  | 'block'

export interface BadgeArt {
  motif: BadgeArtMotif
  mark: string
}

export interface GameDayBadgeDefinition {
  key: string
  id: string
  name: string
  tone: GameDayBadgeTone
  scope: BadgeScope
  category: BadgeCategory
  description: string
  earnedBy: string
  priority: number
  art?: BadgeArt
}

export const GAME_DAY_BADGE_HOLD_DAYS = 7

const WEEKLY_BADGES: readonly GameDayBadgeDefinition[] = [
  {
    key: 'badge_menace',
    id: 'menace',
    name: 'Menace',
    tone: 'positive',
    scope: 'weekly',
    category: 'weekly',
    description: 'The athlete directly created a change of possession.',
    earnedBy: 'Cause a turnover during the game.',
    priority: 90,
  },
  {
    key: 'badge_journeyman',
    id: 'journeyman',
    name: 'Journeyman',
    tone: 'positive',
    scope: 'weekly',
    category: 'weekly',
    description: 'The athlete carried a major share of the rushing production.',
    earnedBy: 'Record a 100-yard rushing game.',
    priority: 88,
  },
  {
    key: 'badge_airmail',
    id: 'airmail',
    name: 'Airmail',
    tone: 'positive',
    scope: 'weekly',
    category: 'weekly',
    description: 'The quarterback repeatedly finished drives through the air.',
    earnedBy: 'Throw three passing touchdowns in one game.',
    priority: 88,
  },
  {
    key: 'badge_swat',
    id: 'swat',
    name: 'Swat',
    tone: 'positive',
    scope: 'weekly',
    category: 'weekly',
    description: 'The defender disrupted the catch point and erased a completion.',
    earnedBy: 'Break up a pass.',
    priority: 76,
  },
  {
    key: 'badge_waffle_house',
    id: 'waffle-house',
    name: 'Waffle House',
    tone: 'positive',
    scope: 'weekly',
    category: 'weekly',
    description: 'The receiver stayed open and consistently served the passing game.',
    earnedBy: 'Record five catches in one game.',
    priority: 82,
  },
  {
    key: 'badge_robber',
    id: 'robber',
    name: 'Robber',
    tone: 'positive',
    scope: 'weekly',
    category: 'weekly',
    description: 'The defender stole a possession or violently separated the ball.',
    earnedBy: 'Record an interception or force a fumble.',
    priority: 92,
  },
  {
    key: 'badge_butter_fingers',
    id: 'butter-fingers',
    name: 'Butter Fingers',
    tone: 'negative',
    scope: 'weekly',
    category: 'weekly',
    description: 'A catchable pass was not secured.',
    earnedBy: 'Record a dropped pass.',
    priority: 60,
  },
  {
    key: 'badge_traffic_cone',
    id: 'traffic-cone',
    name: 'Traffic Cone',
    tone: 'negative',
    scope: 'weekly',
    category: 'weekly',
    description: 'The assigned block was missed and the defender reached the play.',
    earnedBy: 'Record a missed block.',
    priority: 60,
  },
]

export const SEASON_ACHIEVEMENT_BADGES: readonly GameDayBadgeDefinition[] = [
  {
    key: 'achievement_workhorse_800', id: 'workhorse-800', name: 'Workhorse', tone: 'positive', scope: 'season', category: 'rushing',
    description: 'The runner supplied dependable production across the season.', earnedBy: 'Reach 800 rushing yards in one season.', priority: 86,
    art: { motif: 'rush', mark: '800' },
  },
  {
    key: 'achievement_four_digits', id: 'four-digits', name: 'Four Digits', tone: 'positive', scope: 'season', category: 'rushing',
    description: 'The runner crossed the premier four-digit rushing threshold.', earnedBy: 'Reach 1,000 rushing yards in one season.', priority: 94,
    art: { motif: 'rush', mark: '1K' },
  },
  {
    key: 'achievement_paydirt_10', id: 'paydirt-10', name: 'Paydirt 10', tone: 'positive', scope: 'season', category: 'rushing',
    description: 'The athlete became a consistent touchdown producer.', earnedBy: 'Score 10 total touchdowns in one season.', priority: 92,
    art: { motif: 'touchdown', mark: '10' },
  },
  {
    key: 'achievement_ground_monopoly', id: 'ground-monopoly', name: 'Ground Monopoly', tone: 'positive', scope: 'season', category: 'rushing',
    description: 'The runner controlled the goal line and repeatedly finished drives.', earnedBy: 'Score 15 rushing touchdowns in one season.', priority: 97,
    art: { motif: 'touchdown', mark: '15' },
  },
  {
    key: 'achievement_freight_train', id: 'freight-train', name: 'Freight Train', tone: 'positive', scope: 'season', category: 'rushing',
    description: 'The runner overwhelmed one opponent with a major workload and output.', earnedBy: 'Rush for 150 yards in one game.', priority: 88,
    art: { motif: 'rush', mark: '150' },
  },
  {
    key: 'achievement_touchdown_dealer', id: 'touchdown-dealer', name: 'Touchdown Dealer', tone: 'positive', scope: 'season', category: 'passing',
    description: 'The quarterback consistently generated passing scores.', earnedBy: 'Throw 10 passing touchdowns in one season.', priority: 88,
    art: { motif: 'pass', mark: '10' },
  },
  {
    key: 'achievement_air_traffic_control', id: 'air-traffic-control', name: 'Air Traffic Control', tone: 'positive', scope: 'season', category: 'passing',
    description: 'The quarterback directed a high-output touchdown passing attack.', earnedBy: 'Throw 20 passing touchdowns in one season.', priority: 97,
    art: { motif: 'pass', mark: '20' },
  },
  {
    key: 'achievement_two_grand', id: 'two-grand', name: 'Two Grand', tone: 'positive', scope: 'season', category: 'passing',
    description: 'The quarterback produced a major season through the air.', earnedBy: 'Reach 2,000 passing yards in one season.', priority: 92,
    art: { motif: 'pass', mark: '2K' },
  },
  {
    key: 'achievement_cannon_day', id: 'cannon-day', name: 'Cannon Day', tone: 'positive', scope: 'season', category: 'passing',
    description: 'The quarterback took over a game with passing volume and explosives.', earnedBy: 'Pass for 300 yards in one game.', priority: 89,
    art: { motif: 'pass', mark: '300' },
  },
  {
    key: 'achievement_surgeon', id: 'surgeon', name: 'Surgeon', tone: 'positive', scope: 'season', category: 'passing',
    description: 'The quarterback combined accuracy, decision-making, and ball security.', earnedBy: 'Complete at least 70% of 20 or more attempts with zero interceptions in one game.', priority: 93,
    art: { motif: 'precision', mark: '70' },
  },
  {
    key: 'achievement_target_magnet', id: 'target-magnet', name: 'Target Magnet', tone: 'positive', scope: 'season', category: 'receiving',
    description: 'The receiver became a dependable, frequently used option.', earnedBy: 'Record 40 receptions in one season.', priority: 86,
    art: { motif: 'target', mark: '40' },
  },
  {
    key: 'achievement_skyline', id: 'skyline', name: 'Skyline', tone: 'positive', scope: 'season', category: 'receiving',
    description: 'The receiver stacked major yardage throughout the season.', earnedBy: 'Reach 800 receiving yards in one season.', priority: 90,
    art: { motif: 'target', mark: '800' },
  },
  {
    key: 'achievement_air_property', id: 'air-property', name: 'Air Property', tone: 'positive', scope: 'season', category: 'receiving',
    description: 'The receiver owned a four-digit share of the passing game.', earnedBy: 'Reach 1,000 receiving yards in one season.', priority: 97,
    art: { motif: 'target', mark: '1K' },
  },
  {
    key: 'achievement_red_zone_royalty', id: 'red-zone-royalty', name: 'Red Zone Royalty', tone: 'positive', scope: 'season', category: 'receiving',
    description: 'The receiver repeatedly won scoring opportunities near the goal line.', earnedBy: 'Catch 10 receiving touchdowns in one season.', priority: 95,
    art: { motif: 'crown', mark: '10' },
  },
  {
    key: 'achievement_double_tap', id: 'double-tap', name: 'Double Tap', tone: 'positive', scope: 'season', category: 'receiving',
    description: 'The receiver struck the end zone multiple times in one game.', earnedBy: 'Catch two touchdowns in one game.', priority: 84,
    art: { motif: 'touchdown', mark: '2' },
  },
  {
    key: 'achievement_tackle_machine', id: 'tackle-machine', name: 'Tackle Machine', tone: 'positive', scope: 'season', category: 'defense',
    description: 'The defender consistently arrived and finished plays.', earnedBy: 'Record 75 tackles in one season.', priority: 88,
    art: { motif: 'tackle', mark: '75' },
  },
  {
    key: 'achievement_centurion', id: 'centurion', name: 'Centurion', tone: 'positive', scope: 'season', category: 'defense',
    description: 'The defender reached the elite century mark in total tackles.', earnedBy: 'Record 100 tackles in one season.', priority: 97,
    art: { motif: 'tackle', mark: '100' },
  },
  {
    key: 'achievement_backfield_tax', id: 'backfield-tax', name: 'Backfield Tax', tone: 'positive', scope: 'season', category: 'defense',
    description: 'The defender repeatedly charged offenses for entering the backfield.', earnedBy: 'Record 10 tackles for loss in one season.', priority: 91,
    art: { motif: 'backfield', mark: '10' },
  },
  {
    key: 'achievement_sack_lunch', id: 'sack-lunch', name: 'Sack Lunch', tone: 'positive', scope: 'season', category: 'defense',
    description: 'The pass rusher produced consistent quarterback disruption.', earnedBy: 'Record five sacks in one season.', priority: 88,
    art: { motif: 'sack', mark: '5' },
  },
  {
    key: 'achievement_wrecking_crew', id: 'wrecking-crew', name: 'Wrecking Crew', tone: 'positive', scope: 'season', category: 'defense',
    description: 'The pass rusher reached double-digit destruction in the pocket.', earnedBy: 'Record 10 sacks in one season.', priority: 98,
    art: { motif: 'sack', mark: '10' },
  },
  {
    key: 'achievement_no_fly_zone', id: 'no-fly-zone', name: 'No-Fly Zone', tone: 'positive', scope: 'season', category: 'defense',
    description: 'The defender repeatedly closed throwing windows and contested catches.', earnedBy: 'Record 10 pass breakups in one season.', priority: 91,
    art: { motif: 'coverage', mark: '10' },
  },
  {
    key: 'achievement_pickpocket', id: 'pickpocket', name: 'Pickpocket', tone: 'positive', scope: 'season', category: 'defense',
    description: 'The defender consistently stole possessions through the air.', earnedBy: 'Record five interceptions in one season.', priority: 96,
    art: { motif: 'takeaway', mark: '5' },
  },
  {
    key: 'achievement_ball_separator', id: 'ball-separator', name: 'Ball Separator', tone: 'positive', scope: 'season', category: 'defense',
    description: 'The defender repeatedly removed the football from ball carriers.', earnedBy: 'Force three fumbles in one season.', priority: 92,
    art: { motif: 'separate', mark: '3' },
  },
  {
    key: 'achievement_return_to_sender', id: 'return-to-sender', name: 'Return to Sender', tone: 'positive', scope: 'season', category: 'special-teams',
    description: 'The returner flipped the field all the way into the end zone.', earnedBy: 'Score a kickoff-return or punt-return touchdown.', priority: 94,
    art: { motif: 'return', mark: 'TD' },
  },
  {
    key: 'achievement_flip_the_field', id: 'flip-the-field', name: 'Flip the Field', tone: 'positive', scope: 'season', category: 'special-teams',
    description: 'The punter repeatedly pinned opponents in difficult field position.', earnedBy: 'Place five punts inside the opponent’s 20-yard line in one season.', priority: 87,
    art: { motif: 'kick', mark: '5' },
  },
  {
    key: 'achievement_touchback_king', id: 'touchback-king', name: 'Touchback King', tone: 'positive', scope: 'season', category: 'special-teams',
    description: 'The kickoff specialist consistently erased return opportunities.', earnedBy: 'Record 10 kickoff touchbacks in one season.', priority: 88,
    art: { motif: 'kick', mark: '10' },
  },
  {
    key: 'achievement_ice_water', id: 'ice-water', name: 'Ice Water', tone: 'positive', scope: 'season', category: 'special-teams',
    description: 'The kicker delivered when the result was on the line.', earnedBy: 'Make a game-winning field goal or extra point.', priority: 96,
    art: { motif: 'kick', mark: 'GW' },
  },
  {
    key: 'achievement_all_purpose_engine', id: 'all-purpose-engine', name: 'All-Purpose Engine', tone: 'positive', scope: 'season', category: 'versatility',
    description: 'The athlete generated production through multiple methods of gaining yards.', earnedBy: 'Reach 1,000 combined rushing, receiving, and return yards in one season.', priority: 94,
    art: { motif: 'versatile', mark: '1K' },
  },
  {
    key: 'achievement_swiss_army_score', id: 'swiss-army-score', name: 'Swiss Army Score', tone: 'positive', scope: 'season', category: 'versatility',
    description: 'The athlete found the end zone in multiple phases of the game.', earnedBy: 'Score touchdowns in two different phases: offense, defense, or special teams.', priority: 95,
    art: { motif: 'versatile', mark: '2X' },
  },
  {
    key: 'achievement_pancake_factory', id: 'pancake-factory', name: 'Pancake Factory', tone: 'positive', scope: 'season', category: 'offensive-line',
    description: 'The blocker repeatedly finished defenders on the ground.', earnedBy: 'Record 10 pancake blocks in one season.', priority: 91,
    art: { motif: 'block', mark: '10' },
  },
]

export const GAME_DAY_BADGE_CATALOG: readonly GameDayBadgeDefinition[] = [
  ...WEEKLY_BADGES,
  ...SEASON_ACHIEVEMENT_BADGES,
]

// Existing award screens consume these lists. Positive includes permanent
// achievements; each definition carries scope so the UI and summaries can
// distinguish weekly recognition from season milestones.
export const POSITIVE_GAME_DAY_BADGES = GAME_DAY_BADGE_CATALOG.filter((badge) => badge.tone === 'positive')
export const WEEKLY_POSITIVE_GAME_DAY_BADGES = WEEKLY_BADGES.filter((badge) => badge.tone === 'positive')
export const NEGATIVE_GAME_DAY_BADGES = WEEKLY_BADGES.filter((badge) => badge.tone === 'negative')
export const ACHIEVEMENT_BADGES_BY_CATEGORY = new Map<BadgeCategory, GameDayBadgeDefinition[]>()
for (const badge of SEASON_ACHIEVEMENT_BADGES) {
  ACHIEVEMENT_BADGES_BY_CATEGORY.set(
    badge.category,
    [...(ACHIEVEMENT_BADGES_BY_CATEGORY.get(badge.category) ?? []), badge],
  )
}
export const GAME_DAY_BADGE_BY_KEY = new Map(GAME_DAY_BADGE_CATALOG.map((badge) => [badge.key, badge] as const))

export function gameDayBadgeForType(type: string): GameDayBadgeDefinition | undefined {
  return GAME_DAY_BADGE_BY_KEY.get(type)
}

export function isGameDayBadgeType(type: string): boolean {
  return GAME_DAY_BADGE_BY_KEY.has(type)
}

export function isSeasonAchievementType(type: string): boolean {
  return GAME_DAY_BADGE_BY_KEY.get(type)?.scope === 'season'
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
  achievementAwards?: GameDayBadgeAward[]
  seasonCounts: GameDayBadgeCount[]
  seasonTotal: number
  weeklyTotal?: number
  achievementTotal?: number
  positiveTotal: number
  negativeTotal: number
}

function uniqueAchievementAwards(awards: GameDayBadgeAward[]): GameDayBadgeAward[] {
  const latestByKey = new Map<string, GameDayBadgeAward>()
  for (const award of awards) {
    if (award.badge.scope !== 'season') continue
    const existing = latestByKey.get(award.badge.key)
    if (!existing || `${award.play.date}${award.play.createdAt ?? ''}` > `${existing.play.date}${existing.play.createdAt ?? ''}`) {
      latestByKey.set(award.badge.key, award)
    }
  }
  return [...latestByKey.values()].sort((a, b) => b.badge.priority - a.badge.priority || a.badge.name.localeCompare(b.badge.name))
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

  const weeklyAwards = awards.filter((award) => award.badge.scope === 'weekly')
  const achievementAwards = uniqueAchievementAwards(awards)
  const countByKey = new Map<string, GameDayBadgeCount>()
  for (const award of [...weeklyAwards, ...achievementAwards]) {
    const existing = countByKey.get(award.badge.key)
    countByKey.set(award.badge.key, {
      badge: award.badge,
      count: award.badge.scope === 'season' ? 1 : (existing?.count ?? 0) + 1,
      latestDate: existing && existing.latestDate > award.play.date ? existing.latestDate : award.play.date,
    })
  }

  const seasonCounts = [...countByKey.values()].sort(
    (a, b) => b.badge.priority - a.badge.priority || b.count - a.count || a.badge.name.localeCompare(b.badge.name),
  )

  return {
    activeAwards: weeklyAwards.filter((award) => gameDayBadgeIsActive(award.play.date, now)),
    achievementAwards,
    seasonCounts,
    seasonTotal: weeklyAwards.length + achievementAwards.length,
    weeklyTotal: weeklyAwards.length,
    achievementTotal: achievementAwards.length,
    positiveTotal: weeklyAwards.filter((award) => award.badge.tone === 'positive').length + achievementAwards.length,
    negativeTotal: weeklyAwards.filter((award) => award.badge.tone === 'negative').length,
  }
}

export function athleteHasSeasonAchievement(
  plays: PlayEvent[],
  athleteId: string,
  type: string,
  season = 2026,
): boolean {
  return plays.some(
    (play) => play.athleteId === athleteId && play.type === type && play.date.startsWith(`${season}-`),
  )
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
      if (!badge || badge.scope !== 'weekly' || !athlete || !gameDayBadgeIsActive(play.date, now)) return undefined
      return { play, badge, athlete }
    })
    .filter((item): item is TeamGameDayBadgeAward => Boolean(item))
    .sort((a, b) => `${b.play.date}${b.play.createdAt ?? ''}`.localeCompare(`${a.play.date}${a.play.createdAt ?? ''}`))
}

export function teamSeasonAchievementAwards(
  plays: PlayEvent[],
  athletes: Athlete[],
  season = 2026,
): TeamGameDayBadgeAward[] {
  const athleteById = new Map(athletes.map((athlete) => [athlete.id, athlete]))
  const latestByAthleteAndKey = new Map<string, TeamGameDayBadgeAward>()
  for (const play of plays) {
    if (!play.date.startsWith(`${season}-`)) continue
    const badge = gameDayBadgeForType(play.type)
    const athlete = athleteById.get(play.athleteId)
    if (!badge || badge.scope !== 'season' || !athlete) continue
    const key = `${athlete.id}:${badge.key}`
    const existing = latestByAthleteAndKey.get(key)
    if (!existing || `${play.date}${play.createdAt ?? ''}` > `${existing.play.date}${existing.play.createdAt ?? ''}`) {
      latestByAthleteAndKey.set(key, { play, badge, athlete })
    }
  }
  return [...latestByAthleteAndKey.values()].sort(
    (a, b) => b.badge.priority - a.badge.priority || a.athlete.name.localeCompare(b.athlete.name),
  )
}
