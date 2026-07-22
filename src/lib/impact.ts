// ---------------------------------------------------------------------------
// Playmaker & Havoc incentive system.
//
// Players earn points for making plays: defenders build the Havoc Meter
// (chaos — turnovers, sacks, blocks) and offense/special teams build the
// Playmaker Meter (explosions, scores, field-position wins). Points accumulate
// into a level so athletes "level up" by making plays.
// ---------------------------------------------------------------------------

import type { Athlete, PlayEvent } from '../types'

export type PlayCategory = 'havoc' | 'playmaker'

export interface PlayType {
  key: string
  label: string
  category: PlayCategory
  points: number
  emoji: string
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

export const PLAY_TYPES: PlayType[] = [...HAVOC_TYPES, ...PLAYMAKER_TYPES]
export const PLAY_TYPE_BY_KEY = new Map(PLAY_TYPES.map((play) => [play.key, play]))

export function playPoints(type: string): number {
  return PLAY_TYPE_BY_KEY.get(type)?.points ?? 0
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
  let level = 1
  while (levelThreshold(level + 1) <= points) level += 1
  const floor = levelThreshold(level)
  const next = levelThreshold(level + 1)
  const span = next - floor
  return { level, floor, next, progress: span > 0 ? (points - floor) / span : 1 }
}

export interface AthleteImpact {
  athlete: Athlete
  havocPoints: number
  playmakerPoints: number
  totalPoints: number
  playCount: number
  level: LevelInfo
  /** Count per play-type key, for the breakdown. */
  counts: Record<string, number>
}

export interface ImpactSummary {
  athletes: AthleteImpact[]
  teamHavoc: number
  teamPlaymaker: number
}

export function buildImpact(plays: PlayEvent[], athletes: Athlete[]): ImpactSummary {
  const byAthlete = new Map<string, PlayEvent[]>()
  for (const play of plays) {
    byAthlete.set(play.athleteId, [...(byAthlete.get(play.athleteId) ?? []), play])
  }

  const results: AthleteImpact[] = []
  for (const athlete of athletes) {
    const own = byAthlete.get(athlete.id) ?? []
    if (own.length === 0) continue
    let havocPoints = 0
    let playmakerPoints = 0
    const counts: Record<string, number> = {}
    for (const play of own) {
      const type = PLAY_TYPE_BY_KEY.get(play.type)
      counts[play.type] = (counts[play.type] ?? 0) + 1
      if (!type) continue
      if (type.category === 'havoc') havocPoints += type.points
      else playmakerPoints += type.points
    }
    const totalPoints = havocPoints + playmakerPoints
    results.push({
      athlete,
      havocPoints,
      playmakerPoints,
      totalPoints,
      playCount: own.length,
      level: levelForPoints(totalPoints),
      counts,
    })
  }

  results.sort((a, b) => b.totalPoints - a.totalPoints || a.athlete.name.localeCompare(b.athlete.name))
  return {
    athletes: results,
    teamHavoc: results.reduce((sum, item) => sum + item.havocPoints, 0),
    teamPlaymaker: results.reduce((sum, item) => sum + item.playmakerPoints, 0),
  }
}
