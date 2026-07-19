import type { AthleteResult, Category } from '../types'
import { CATEGORIES } from '../data/constants'
import { METRICS_BY_CATEGORY } from '../data/scoring'
import type { LeaderRow } from './leaderboards'
import { avg, round1 } from './compute'

function hasCategoryData(result: AthleteResult, category: Category): boolean {
  return METRICS_BY_CATEGORY(category).some(
    (metric) => typeof result.current.normalized[metric.key] === 'number',
  )
}

function leaderBy(
  results: AthleteResult[],
  valueFor: (result: AthleteResult) => number | undefined,
  display: (value: number) => string,
  descending = true,
): LeaderRow | undefined {
  const ranked = results
    .map((result) => ({ result, value: valueFor(result) }))
    .filter(
      (item): item is { result: AthleteResult; value: number } =>
        typeof item.value === 'number' && Number.isFinite(item.value),
    )
    .sort((a, b) => (descending ? b.value - a.value : a.value - b.value))

  const first = ranked[0]
  if (!first) return undefined
  return {
    result: first.result,
    value: first.value,
    display: display(first.value),
    rank: 1,
  }
}

function categoryLeader(results: AthleteResult[], category: Category): LeaderRow | undefined {
  return leaderBy(
    results,
    (result) =>
      hasCategoryData(result, category) ? result.current.categories[category] : undefined,
    (value) => value.toFixed(1),
  )
}

export interface AvailableDashboardStats {
  fastest?: LeaderRow
  strongest?: LeaderRow
  mostExplosive?: LeaderRow
  bestCod?: LeaderRow
  categoryAverages: { category: Category; avg: number }[]
  categoryDataCount: number
}

/**
 * Dashboard-only available-data summaries.
 *
 * These deliberately include provisional/partial records so the historical dashboard
 * is useful. They never replace official FAI averages or official rankings, which remain
 * restricted to complete testing batteries in teamStats().
 */
export function availableDashboardStats(results: AthleteResult[]): AvailableDashboardStats {
  const categoryAverages = CATEGORIES.map((category) => {
    const withData = results.filter((result) => hasCategoryData(result, category))
    return {
      category,
      avg: round1(avg(withData.map((result) => result.current.categories[category]))),
    }
  })

  return {
    fastest: leaderBy(
      results,
      (result) => result.current.metrics.best40,
      (value) => `${value.toFixed(2)}s`,
      false,
    ),
    strongest: categoryLeader(results, 'Strength'),
    mostExplosive: categoryLeader(results, 'Power'),
    bestCod: categoryLeader(results, 'Change of Direction'),
    categoryAverages,
    categoryDataCount: categoryAverages.filter((item) => item.avg > 0).length,
  }
}
