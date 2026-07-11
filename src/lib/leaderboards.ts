// ---------------------------------------------------------------------------
// Leaderboards, TV-mode slides, and coach-dashboard team aggregates.
// ---------------------------------------------------------------------------

import type { AthleteResult, Category, PositionGroup } from '../types'
import { SCORED_METRICS, METRIC_BY_KEY } from '../data/scoring'
import { CATEGORIES, POSITION_GROUPS } from '../data/constants'
import { avg, round1 } from './compute'

export interface LeaderRow {
  result: AthleteResult
  value: number // the value being ranked
  display: string // formatted value
  rank: number
}

export interface LeaderboardDef {
  id: string
  title: string
  subtitle?: string
  rows: (results: AthleteResult[]) => LeaderRow[]
}

function fmt(value: number, unit: string): string {
  if (unit === 's') return `${value.toFixed(2)}s`
  if (unit === 'in') return `${value}"`
  if (unit === 'lbs') return `${value} lbs`
  if (unit === 'reps') return `${value} reps`
  if (unit === 'yd') return `${value} yd`
  return `${value}`
}

function rankBy(
  results: AthleteResult[],
  value: (r: AthleteResult) => number | undefined,
  display: (v: number) => string,
  desc = true,
): LeaderRow[] {
  const rows = results
    .map((r) => ({ r, v: value(r) }))
    .filter((x): x is { r: AthleteResult; v: number } => typeof x.v === 'number')
    .sort((a, b) => (desc ? b.v - a.v : a.v - b.v))
    .map((x, i) => ({
      result: x.r,
      value: x.v,
      display: display(x.v),
      rank: i + 1,
    }))
  return rows
}

/** Category-score leaderboard factory. */
function categoryBoard(category: Category, id: string, title: string): LeaderboardDef {
  return {
    id,
    title,
    rows: (results) =>
      rankBy(
        results,
        (r) => r.current.categories[category] || undefined,
        (v) => v.toFixed(1),
      ),
  }
}

/** Per-test leaderboard factory (respects test direction). */
function testBoard(metricKey: string): LeaderboardDef {
  const m = METRIC_BY_KEY[metricKey]
  return {
    id: `test-${metricKey}`,
    title: m.label,
    subtitle: m.higherBetter ? 'Higher is better' : 'Lower is better',
    rows: (results) =>
      rankBy(
        results,
        (r) => r.current.metrics[metricKey],
        (v) => fmt(v, m.unit),
        m.higherBetter,
      ),
  }
}

export const CORE_LEADERBOARDS: LeaderboardDef[] = [
  {
    id: 'fai',
    title: 'Overall FAI',
    subtitle: 'Football Athlete Index',
    rows: (results) =>
      rankBy(results, (r) => r.current.fai, (v) => v.toFixed(1)),
  },
  {
    id: 'improved',
    title: 'Most Improved',
    subtitle: 'FAI gain since last test',
    rows: (results) =>
      rankBy(
        results,
        (r) => (r.previous ? r.faiImprovement : undefined),
        (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`,
      ),
  },
  categoryBoard('Speed', 'speed', 'Speed Score'),
  categoryBoard('Power', 'power', 'Power Score'),
  categoryBoard('Strength', 'strength', 'Strength Score'),
  categoryBoard('Change of Direction', 'cod', 'COD Score'),
  categoryBoard('Conditioning', 'conditioning', 'Conditioning Score'),
]

export const TEST_LEADERBOARDS: LeaderboardDef[] = SCORED_METRICS.map((m) =>
  testBoard(m.key),
)

export const ALL_LEADERBOARDS: LeaderboardDef[] = [
  ...CORE_LEADERBOARDS,
  ...TEST_LEADERBOARDS,
]

/** Position-group rankings: leaders of each group by FAI. */
export function positionGroupBoards(
  results: AthleteResult[],
): { group: PositionGroup; rows: LeaderRow[] }[] {
  return POSITION_GROUPS.map((group) => ({
    group,
    rows: rankBy(
      results.filter((r) => r.athlete.positionGroup === group),
      (r) => r.current.fai,
      (v) => v.toFixed(1),
    ),
  })).filter((b) => b.rows.length > 0)
}

// --- Coach dashboard aggregates -----------------------------------------

export interface TeamStats {
  athleteCount: number
  avgFai: number
  avgImprovement: number
  testedCount: number
  fastest?: LeaderRow
  strongest?: LeaderRow
  mostExplosive?: LeaderRow
  bestCod?: LeaderRow
  mostImproved?: LeaderRow
  weakestCategory?: { category: Category; avg: number }
  bestCategory?: { category: Category; avg: number }
  categoryAverages: { category: Category; avg: number }[]
}

export function teamStats(results: AthleteResult[]): TeamStats {
  const withPrev = results.filter((r) => r.previous)
  const board = (id: string) =>
    ALL_LEADERBOARDS.find((b) => b.id === id)!.rows(results)[0]

  const categoryAverages = CATEGORIES.map((category) => ({
    category,
    avg: round1(
      avg(
        results
          .map((r) => r.current.categories[category])
          .filter((v) => typeof v === 'number' && v > 0),
      ),
    ),
  }))
  const ranked = [...categoryAverages].sort((a, b) => a.avg - b.avg)

  return {
    athleteCount: results.length,
    avgFai: round1(avg(results.map((r) => r.current.fai))),
    avgImprovement: round1(avg(withPrev.map((r) => r.faiImprovement))),
    testedCount: results.length,
    fastest: board('test-best40'),
    strongest: board('strength'),
    mostExplosive: board('power'),
    bestCod: board('cod'),
    mostImproved: withPrev.length ? board('improved') : undefined,
    weakestCategory: ranked[0],
    bestCategory: ranked[ranked.length - 1],
    categoryAverages,
  }
}
