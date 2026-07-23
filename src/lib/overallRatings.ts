export type OverallRatingTone = 'legend' | 'dawg' | 'difference' | 'developing' | 'building' | 'needs-work'

export interface OverallRatingBand {
  id: string
  label: string
  rangeLabel: string
  min: number
  tone: OverallRatingTone
  description: string
}

/**
 * Coach-facing names for the overall 0–100 FAI score.
 *
 * The source note left 80–89 and 65–69 unnamed. FAI uses Difference Maker and
 * Building Block for those two gaps so every score receives a readable label.
 */
export const OVERALL_RATING_BANDS: readonly OverallRatingBand[] = [
  {
    id: 'one-of-a-kind',
    label: 'One of a Kind',
    rangeLabel: '96–100',
    min: 96,
    tone: 'legend',
    description: 'A rare, complete testing profile at the top of the FAI scale.',
  },
  {
    id: 'dawg',
    label: 'DAWG',
    rangeLabel: '90–95',
    min: 90,
    tone: 'dawg',
    description: 'An exceptional overall athletic profile with very few limitations.',
  },
  {
    id: 'difference-maker',
    label: 'Difference Maker',
    rangeLabel: '80–89',
    min: 80,
    tone: 'difference',
    description: 'A high-level athlete whose testing profile can create a clear on-field advantage.',
  },
  {
    id: 'developing-talent',
    label: 'Developing Talent',
    rangeLabel: '70–79',
    min: 70,
    tone: 'developing',
    description: 'A useful athletic foundation with identifiable areas still being developed.',
  },
  {
    id: 'building-block',
    label: 'Building Block',
    rangeLabel: '65–69',
    min: 65,
    tone: 'building',
    description: 'A developing profile that can contribute while priority traits are built.',
  },
  {
    id: 'needs-work',
    label: 'Needs Work',
    rangeLabel: '64 and below',
    min: 0,
    tone: 'needs-work',
    description: 'The current testing profile has multiple areas that need focused development.',
  },
] as const

export function overallRatingFor(score: number): OverallRatingBand {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0
  return OVERALL_RATING_BANDS.find((band) => safeScore >= band.min) ?? OVERALL_RATING_BANDS.at(-1)!
}
