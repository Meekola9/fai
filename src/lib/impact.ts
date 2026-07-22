// ---------------------------------------------------------------------------
// Playmaker & Havoc incentive system.
//
// Players earn points for making plays: defenders build the Havoc Meter
// (chaos — turnovers, sacks, blocks) and offense/special teams build the
// Playmaker Meter (explosions, scores, field-position wins). Points accumulate
// into a level so athletes "level up" by making plays.
// ---------------------------------------------------------------------------

import type { Athlete, PlayEvent } from '../types'
import { isGameDayBadgeType } from './gameDayBadges'

export type PlayCategory = 'havoc' | 'playmaker'

export interface PlayType {
  key: string
  label: string
  category: PlayCategory
  points: number
  emoji: string
  /** Negative plays (mistakes) subtract points. */
  negative?: boolean
}

/** Defensive & special-teams chaos. Point values are a sensible default — edit freely. */
export const HAVOC_TYPES: PlayType[] = [
  { key: 'interception', label: 'Interception', category: 'havoc', points: 5, emoji: '🪤' },
  { key: 'pick_six', label: 'Pick Six', category: 'havoc', points: 8, emoji: '🏴‍☠️' },
  { key: 'forced_fumble', label: 'Forced Fumble', category: 'havoc', points: 4, emoji: '💥' },
  { key: 'fumble_recovery', label: 'Fumble Recovery', category: 'havoc', points: 3, emoji: '🧲' },
  { key: 'sack', label: 'Sack', category: 'havoc', points: 3, emoji: '🎯' },
  { key: 'tfl', label: 'Tackle for Loss', category: 'havoc', points: 2, emoji: '🛑' },
  { key: 'pass_breakup', label: 'Pass Breakup', category: 'havoc', points: 1, emoji: '✋' },
  { key: 'punt_block', label: 'Punt / Kick Block', category: 'havoc', points: 5, emoji: '🚫' },
  { key: 'safety', label: 'Safety', category: 'havoc', points: 4, emoji: '🔒' },
]

/** Defensive mistakes — subtract from the athlete's Havoc total. */
export const HAVOC_NEGATIVES: PlayType[] = [
  { key: 'missed_tackle', label: 'Missed Tackle', category: 'havoc', points: -2, emoji: '🚷', negative: true },
  { key: 'blown_coverage', label: 'Blown Coverage', category: 'havoc', points: -2, emoji: '🕳️', negative: true },
  { key: 'blown_assignment', label: 'Blown Assignment', category: 'havoc', points: -2, emoji: '❓', negative: true },
  { key: 'td_allowed', label: 'Touchdown Allowed', category: 'havoc', points: -3, emoji: '🔥', negative: true },
]

/** Offensive & special-teams explosions and field-position wins. */
export const PLAYMAKER_TYPES: PlayType[] = [
  { key: 'touchdown', label: 'Touchdown', category: 'playmaker', points: 5, emoji: '🏈' },
  { key: 'explosion', label: 'Explosion Play (20+)', category: 'playmaker', points: 3, emoji: '⚡' },
  { key: 'two_point', label: '2-Point Conversion', category: 'playmaker', points: 2, emoji: '②' },
  { key: 'return_td', label: 'Return TD', category: 'playmaker', points: 8, emoji: '🚀' },
  { key: 'long_fg', label: '50+ Field Goal', category: 'playmaker', points: 5, emoji: '🦵' },
  { key: 'punt_inside_20', label: 'Punt Inside the 20', category: 'playmaker', points: 2, emoji: '🎯' },
  { key: 'touchback', label: 'Touchback', category: 'playmaker', points: 1, emoji: '🥅' },
]

/** Offensive mistakes — subtract from the athlete's Playmaker total. */
export const PLAYMAKER_NEGATIVES: PlayType[] = [
  { key: 'interception_thrown', label: 'Interception Thrown', category: 'playmaker', points: -3, emoji: '🎁', negative: true },
  { key: 'fumble_lost', label: 'Fumble Lost', category: 'playmaker', points: -3, emoji: '🤲', negative: true },
  { key: 'dropped_pass', label: 'Dropped Pass', category: 'playmaker', points: -2, emoji: '🧤', negative: true },
  { key: 'missed_block', label: 'Missed Block', category: 'playmaker', points: -2, emoji: '🧱', negative: true },
]

export const PLAY_TYPES: PlayType[] = [
  ...HAVOC_TYPES,
  ...HAVOC_NEGATIVES,
  ...PLAYMAKER_TYPES,
  ...PLAYMAKER_NEGATIVES,
]
export const PLAY_TYPE_BY_KEY = new Map(PLAY_TYPES.map((play) => [play.key, play]))

export function playPoints(type: string): number {
  return PLAY_TYPE_BY_KEY.get(type)?.points ?? 0
}

/**
 * FAI boost an athlete earns from their impact level: +1% per level above 1,
 * capped at +10%. Making plays lifts your overall; mistakes (which lower your
 * level) give it back.
 */
export const MAX_IMPACT_BOOST_PCT = 10
export function boostForLevel(level: number): number {
  return Math.max(0, Math.min(MAX_IMPACT_BOOST_PCT, level - 1))
}

/**
 * Points needed to reach a level. Each level costs a little more than the last,
 * so early levels come fast and later ones are earned: L1 at 0, then +5, +10,
 * +15, ... (cumulative 0, 5, 15, 30, 50, 75, 105, ...).
 */
export function levelThreshold(level: number): number {
  return level <= 1 ? 0 : Math.round((5 * (level - 1) * level) / 2)
}

export interface LevelInfo {
  level: number
  /** Points banked at the start of the current level. */
  floor: number
  /** Points required to reach the next level. */
  next: number
  /** 0–1 progress through the current level. */
  progress: number
}

export function levelForPoints(points: number): LevelInfo {
  const banked = Math.max(0, points)
  let level = 1
  while (levelThreshold(level + 1) <= banked) level += 1
  const floor = levelThreshold(level)
  const next = levelThreshold(level + 1)
  const span = next - floor
  return { level, floor, next, progress: span > 0 ? (banked - floor) / span : 1 }
}

export interface AthleteImpact {
  athlete: Athlete
  /** Net havoc points (positives minus defensive mistakes). */
  havocPoints: number
  /** Net playmaker points (positives minus offensive mistakes). */
  playmakerPoints: number
  totalPoints: number
  /** Points lost to mistakes (as a positive number). */
  negativePoints: number
  playCount: number
  level: LevelInfo
  /** FAI boost this athlete's level grants, in percent. */
  boostPct: number
  /** Count per play-type key, for the breakdown. */
  counts: Record<string, number>
}

export interface ImpactSummary {
  athletes: AthleteImpact[]
  teamHavoc: number
  teamPlaymaker: number
  /** athleteId -> FAI boost percent, for the results pipeline. */
  boostByAthlete: Map<string, number>
}

export function buildImpact(plays: PlayEvent[], athletes: Athlete[]): ImpactSummary {
  // Game-day badges are temporary recognition records, not impact-point events.
  const impactPlays = plays.filter((play) => !isGameDayBadgeType(play.type))
  const byAthlete = new Map<string, PlayEvent[]>()
  for (const play of impactPlays) {
    byAthlete.set(play.athleteId, [...(byAthlete.get(play.athleteId) ?? []), play])
  }

  const results: AthleteImpact[] = []
  const boostByAthlete = new Map<string, number>()
  for (const athlete of athletes) {
    const own = byAthlete.get(athlete.id) ?? []
    if (own.length === 0) continue
    let havocPoints = 0
    let playmakerPoints = 0
    let negativePoints = 0
    const counts: Record<string, number> = {}
    for (const play of own) {
      const type = PLAY_TYPE_BY_KEY.get(play.type)
      counts[play.type] = (counts[play.type] ?? 0) + 1
      if (!type) continue
      if (type.category === 'havoc') havocPoints += type.points
      else playmakerPoints += type.points
      if (type.points < 0) negativePoints += -type.points
    }
    const totalPoints = havocPoints + playmakerPoints
    const level = levelForPoints(totalPoints)
    const boostPct = boostForLevel(level.level)
    if (boostPct > 0) boostByAthlete.set(athlete.id, boostPct)
    results.push({
      athlete,
      havocPoints,
      playmakerPoints,
      totalPoints,
      negativePoints,
      playCount: own.length,
      level,
      boostPct,
      counts,
    })
  }

  results.sort((a, b) => b.totalPoints - a.totalPoints || a.athlete.name.localeCompare(b.athlete.name))
  return {
    athletes: results,
    // Team meters show chaos/explosions created — positives only.
    teamHavoc: impactPlays
      .filter((p) => PLAY_TYPE_BY_KEY.get(p.type)?.category === 'havoc' && (PLAY_TYPE_BY_KEY.get(p.type)?.points ?? 0) > 0)
      .reduce((sum, p) => sum + (PLAY_TYPE_BY_KEY.get(p.type)?.points ?? 0), 0),
    teamPlaymaker: impactPlays
      .filter((p) => PLAY_TYPE_BY_KEY.get(p.type)?.category === 'playmaker' && (PLAY_TYPE_BY_KEY.get(p.type)?.points ?? 0) > 0)
      .reduce((sum, p) => sum + (PLAY_TYPE_BY_KEY.get(p.type)?.points ?? 0), 0),
    boostByAthlete,
  }
}
