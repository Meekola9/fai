// ---------------------------------------------------------------------------
// Leaderboards, TV-mode slides, and coach-dashboard team aggregates.
// ---------------------------------------------------------------------------

import type { AthleteResult, Category, PositionGroup, TestSession } from '../types'
import { METRIC_BY_KEY, SCORED_METRICS } from '../data/scoring'
import { CATEGORIES, POSITION_GROUPS } from '../data/constants'
import { avg, round1 } from './compute'

export interface LeaderRow {
  result: AthleteResult
  value: number
  display: string
  rank: number
}

export interface LeaderboardDef {
  id: string
  title: string
  subtitle?: string
  rows: (results: AthleteResult[]) => LeaderRow[]
}

function formatValue(value: number, unit: string): string {
  if (unit === 's') return `${value.toFixed(2)}s`
  if (unit === 'in') return `${round1(value)}"`
  if (unit === 'lbs') return `${Math.round(value)} lbs`
  if (unit === 'reps') return `${Math.round(value)} reps`
  if (unit === 'yd') return `${Math.round(value)} yd`
  if (unit === 'x') return `${value.toFixed(2)}x`
  return `${round1(value)}`
}

function rankBy(
  results: AthleteResult[],
  value: (result: AthleteResult) => number | undefined,
  display: (value: number) => string,
  descending = true,
  officialOnly = true,
): LeaderRow[] {
  return results
    .filter((result) => !officialOnly || result.rankEligible)
    .map((result) => ({ result, value: value(result) }))
    .filter((item): item is { result: AthleteResult; value: number } =>
      typeof item.value === 'number' && Number.isFinite(item.value),
    )
    .sort((a, b) => (descending ? b.value - a.value : a.value - b.value))
    .map((item, index) => ({
      result: item.result,
      value: item.value,
      display: display(item.value),
      rank: index + 1,
    }))
}

function categoryBoard(category: Category, id: string, title: string): LeaderboardDef {
  return {
    id,
    title,
    rows: (results) =>
      rankBy(
        results,
        (result) => result.current.categories[category],
        (value) => value.toFixed(1),
      ),
  }
}

function scoredTestBoard(metricKey: string): LeaderboardDef {
  const metric = METRIC_BY_KEY[metricKey]
  return {
    id: `test-${metricKey}`,
    title: metric.label,
    subtitle: metric.higherBetter ? 'Higher is better' : 'Lower is better',
    rows: (results) =>
      rankBy(
        results,
        (result) => result.current.metrics[metricKey],
        (value) => formatValue(value, metric.unit),
        metric.higherBetter,
      ),
  }
}

function rawTestBoard(
  id: string,
  title: string,
  key: keyof TestSession,
  unit: string,
  higherBetter = true,
): LeaderboardDef {
  return {
    id,
    title,
    subtitle: higherBetter ? 'Higher is better' : 'Lower is better',
    rows: (results) =>
      rankBy(
        results,
        (result) => {
          const value = result.current.session[key]
          return typeof value === 'number' ? value : undefined
        },
        (value) => formatValue(value, unit),
        higherBetter,
      ),
  }
}

export const CORE_LEADERBOARDS: LeaderboardDef[] = [
  {
    id: 'fai',
    title: 'Overall FAI',
    subtitle: 'Complete testing events only',
    rows: (results) => rankBy(results, (result) => result.current.fai, (value) => value.toFixed(1)),
  },
  {
    id: 'improved',
    title: 'Most Improved',
    subtitle: 'FAI gain since previous event',
    rows: (results) =>
      rankBy(
        results,
        (result) => (result.previous ? result.faiImprovement : undefined),
        (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}`,
      ),
  },
  categoryBoard('Speed', 'speed', 'Speed Score'),
  categoryBoard('Power', 'power', 'Power Score'),
  categoryBoard('Strength', 'strength', 'Strength Score'),
  categoryBoard('Change of Direction', 'cod', 'COD Score'),
  categoryBoard('Conditioning', 'conditioning', 'Conditioning Score'),
]

export const TEST_LEADERBOARDS: LeaderboardDef[] = [
  ...SCORED_METRICS.map((metric) => scoredTestBoard(metric.key)),
  rawTestBoard('test-benchMax', 'Bench Max', 'benchMax', 'lbs'),
  rawTestBoard('test-squatMax', 'Squat Max', 'squatMax', 'lbs'),
]

export const ALL_LEADERBOARDS = [...CORE_LEADERBOARDS, ...TEST_LEADERBOARDS]

export function positionGroupBoards(
  results: AthleteResult[],
): { group: PositionGroup; rows: LeaderRow[] }[] {
  return POSITION_GROUPS.map((group) => ({
    group,
    rows: rankBy(
      results.filter(
        (result) =>
          (result.current.session.positionGroupSnapshot ?? result.athlete.positionGroup) === group,
      ),
      (result) => result.current.fai,
      (value) => value.toFixed(1),
    ),
  })).filter((board) => board.rows.length > 0)
}

export interface TeamStats {
  athleteCount: number
  avgFai: number
  avgImprovement: number
  testedCount: number
  completeCount: number
  provisionalCount: number
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
  const eligible = results.filter((result) => result.rankEligible)
  const withPrevious = eligible.filter((result) => result.previous)
  const board = (id: string) =>
    ALL_LEADERBOARDS.find((item) => item.id === id)?.rows(results)[0]

  const categoryAverages = CATEGORIES.map((category) => ({
    category,
    avg: round1(avg(eligible.map((result) => result.current.categories[category]))),
  }))
  const availableCategories = categoryAverages.filter((item) =>
    eligible.some((result) =>
      result.current.normalized &&
      Object.entries(result.current.normalized).some(
        ([key, score]) => METRIC_BY_KEY[key]?.category === item.category && typeof score === 'number',
      ),
    ),
  )
  const ranked = [...availableCategories].sort((a, b) => a.avg - b.avg)

  return {
    athleteCount: results.length,
    avgFai: round1(avg(eligible.map((result) => result.current.fai))),
    avgImprovement: round1(avg(withPrevious.map((result) => result.faiImprovement))),
    testedCount: results.length,
    completeCount: eligible.length,
    provisionalCount: results.length - eligible.length,
    fastest: board('test-best40'),
    strongest: board('strength'),
    mostExplosive: board('power'),
    bestCod: board('cod'),
    mostImproved: withPrevious.length ? board('improved') : undefined,
    weakestCategory: ranked[0],
    bestCategory: ranked[ranked.length - 1],
    categoryAverages,
  }
}
