export type IllinoisAgilityBandId = 'excellent' | 'above-average' | 'average' | 'below-average' | 'poor'

export interface IllinoisAgilityBand {
  id: IllinoisAgilityBandId
  label: string
  rangeLabel: string
  description: string
}

/**
 * Male 16–19 Illinois Agility Test classifications supplied by the coach
 * (Davis et al. 2000 table). Lower times are better.
 */
export const ILLINOIS_AGILITY_BANDS: readonly IllinoisAgilityBand[] = [
  {
    id: 'excellent',
    label: 'Excellent',
    rangeLabel: 'Under 15.2s',
    description: 'Excellent Illinois Agility Test performance for males age 16–19.',
  },
  {
    id: 'above-average',
    label: 'Above Average',
    rangeLabel: '15.2–16.1s',
    description: 'Above-average Illinois Agility Test performance for males age 16–19.',
  },
  {
    id: 'average',
    label: 'Average',
    rangeLabel: '16.2–18.1s',
    description: 'Average Illinois Agility Test performance for males age 16–19.',
  },
  {
    id: 'below-average',
    label: 'Below Average',
    rangeLabel: '18.2–19.3s',
    description: 'Below-average Illinois Agility Test performance for males age 16–19.',
  },
  {
    id: 'poor',
    label: 'Poor',
    rangeLabel: 'Over 19.3s',
    description: 'Poor Illinois Agility Test performance for males age 16–19.',
  },
] as const

export function illinoisAgilityBandFor(seconds: number): IllinoisAgilityBand {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : Number.POSITIVE_INFINITY
  if (safe < 15.2) return ILLINOIS_AGILITY_BANDS[0]
  if (safe <= 16.1) return ILLINOIS_AGILITY_BANDS[1]
  if (safe <= 18.1) return ILLINOIS_AGILITY_BANDS[2]
  if (safe <= 19.3) return ILLINOIS_AGILITY_BANDS[3]
  return ILLINOIS_AGILITY_BANDS[4]
}

interface IllinoisScoreAnchor {
  seconds: number
  score: number
}

/**
 * FAI normalization anchors derived from the supplied classifications.
 *
 * 15.2 = 100 (excellent boundary)
 * 16.1 = 90 (top of above average)
 * 18.1 = 75 (top of average)
 * 19.3 = 60 (top of below average)
 * 22.5 = 0 (continued separation inside the poor range)
 */
export const ILLINOIS_AGILITY_SCORE_ANCHORS: readonly IllinoisScoreAnchor[] = [
  { seconds: 15.2, score: 100 },
  { seconds: 16.1, score: 90 },
  { seconds: 18.1, score: 75 },
  { seconds: 19.3, score: 60 },
  { seconds: 22.5, score: 0 },
] as const

export function illinoisAgilityScore(seconds: number): number | undefined {
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined
  const anchors = ILLINOIS_AGILITY_SCORE_ANCHORS
  if (seconds <= anchors[0].seconds) return 100
  if (seconds >= anchors.at(-1)!.seconds) return 0

  for (let index = 1; index < anchors.length; index += 1) {
    const slower = anchors[index]
    const faster = anchors[index - 1]
    if (seconds <= slower.seconds) {
      const progress = (seconds - faster.seconds) / (slower.seconds - faster.seconds)
      return faster.score + progress * (slower.score - faster.score)
    }
  }

  return 0
}
