import { describe, expect, it } from 'vitest'
import { CATEGORIES } from './constants'
import {
  CATEGORY_WEIGHTS,
  SCORED_METRICS,
  SPEED_SKILL_CATEGORY_WEIGHTS,
} from './scoring'
import { ACTIVE_STAT_GUIDE } from './activeStatGuide'

describe('FAI stat guide', () => {
  it('documents every scored metric exposed by the scoring engine', () => {
    const documentedMetricKeys = new Set(
      ACTIVE_STAT_GUIDE.flatMap((entry) => entry.metricKey ? [entry.metricKey] : []),
    )

    for (const metric of SCORED_METRICS) {
      expect(documentedMetricKeys.has(metric.key), `${metric.key} is missing from the stat guide`).toBe(true)
    }
  })

  it('documents every derived FAI category', () => {
    for (const category of CATEGORIES) {
      const entry = ACTIVE_STAT_GUIDE.find(
        (candidate) => candidate.section === 'category' && candidate.category === category,
      )
      expect(entry, `${category} category is missing from the stat guide`).toBeDefined()
    }
  })

  it('provides substantive meaning, football interpretation, and caution language', () => {
    for (const entry of ACTIVE_STAT_GUIDE) {
      expect(entry.meaning.length, `${entry.name} needs a measurement explanation`).toBeGreaterThan(45)
      expect(entry.footballMeaning.length, `${entry.name} needs football meaning`).toBeGreaterThan(45)
      expect(entry.interpretation.length, `${entry.name} needs interpretation guidance`).toBeGreaterThan(10)
      expect(entry.caution.length, `${entry.name} needs a caution`).toBeGreaterThan(45)
    }
  })

  it('keeps both category-weight profiles at 100 percent', () => {
    expect(Object.values(CATEGORY_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
    expect(Object.values(SPEED_SKILL_CATEGORY_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
  })
})
