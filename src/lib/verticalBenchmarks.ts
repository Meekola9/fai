import type { PositionGroup } from '../types'

export type VerticalBenchmarkMode = 'national-hs' | 'georgia-hs' | 'ncaa-recruiting'
export type VerticalFamily = 'skill' | 'hybrid' | 'line'
export type VerticalBandId = 'elite' | 'excellent' | 'good' | 'average' | 'developing'

export interface VerticalBand {
  id: VerticalBandId
  label: string
  percentileLabel: string
  min: number
  score: number
  description: string
}

export interface VerticalBenchmarkProfile {
  mode: VerticalBenchmarkMode
  label: string
  shortLabel: string
  note: string
  families: Record<VerticalFamily, readonly VerticalBand[]>
}

const skillNational: readonly VerticalBand[] = [
  { id: 'elite', label: 'Elite', percentileLabel: 'Top 5%', min: 35, score: 100, description: 'Elite high-school explosion and a strong college-prospect marker.' },
  { id: 'excellent', label: 'Excellent', percentileLabel: 'Top 10%', min: 32, score: 90, description: 'Excellent lower-body explosion for a high-school skill player.' },
  { id: 'good', label: 'Good', percentileLabel: 'Top 25%', min: 30, score: 80, description: 'Good skill-position vertical-jump performance.' },
  { id: 'average', label: 'Average', percentileLabel: 'Around average', min: 27, score: 65, description: 'Around the national high-school football average.' },
  { id: 'developing', label: 'Developing', percentileLabel: 'Below average', min: 0, score: 45, description: 'Explosive strength remains a clear development priority.' },
]

const hybridNational: readonly VerticalBand[] = [
  { id: 'elite', label: 'Elite', percentileLabel: 'Top 5%', min: 33, score: 100, description: 'Elite explosion for a linebacker, tight end, or hybrid athlete.' },
  { id: 'excellent', label: 'Excellent', percentileLabel: 'Top 10%', min: 30, score: 90, description: 'Excellent vertical power for a hybrid position.' },
  { id: 'good', label: 'Good', percentileLabel: 'Top 25%', min: 27, score: 80, description: 'Good vertical-jump performance for a hybrid player.' },
  { id: 'average', label: 'Average', percentileLabel: 'Around average', min: 24, score: 65, description: 'Solid high-school baseline for the position family.' },
  { id: 'developing', label: 'Developing', percentileLabel: 'Below average', min: 0, score: 45, description: 'Lower-body explosion needs focused development.' },
]

const lineNational: readonly VerticalBand[] = [
  { id: 'elite', label: 'Elite', percentileLabel: 'Top 5%', min: 30, score: 100, description: 'Rare lower-body explosion for a high-school lineman.' },
  { id: 'excellent', label: 'Excellent', percentileLabel: 'Top 10%', min: 27, score: 90, description: 'Excellent jump power for an offensive or defensive lineman.' },
  { id: 'good', label: 'Good', percentileLabel: 'Top 25%', min: 24, score: 80, description: 'Good lineman vertical-jump performance.' },
  { id: 'average', label: 'Average', percentileLabel: 'Around average', min: 21, score: 65, description: 'Typical high-school lineman range.' },
  { id: 'developing', label: 'Developing', percentileLabel: 'Below average', min: 0, score: 45, description: 'Explosive strength should be emphasized.' },
]

function shiftBands(bands: readonly VerticalBand[], shift: number, note: string): readonly VerticalBand[] {
  return bands.map((band) => ({
    ...band,
    min: band.id === 'developing' ? 0 : band.min + shift,
    description: `${band.description} ${note}`,
  }))
}

export const VERTICAL_BENCHMARK_PROFILES: Record<VerticalBenchmarkMode, VerticalBenchmarkProfile> = {
  'national-hs': {
    mode: 'national-hs',
    label: 'National High School',
    shortLabel: 'National HS',
    note: 'FAI coaching standards based on the high-school ranges selected for the program. Percentile labels are benchmark-style tiers, not a statistical census.',
    families: {
      skill: skillNational,
      hybrid: hybridNational,
      line: lineNational,
    },
  },
  'georgia-hs': {
    mode: 'georgia-hs',
    label: 'Georgia High School',
    shortLabel: 'Georgia HS',
    note: 'A tougher in-state coaching comparison set one inch above the national high-school thresholds. It is an FAI program standard, not an official GHSA percentile dataset.',
    families: {
      skill: shiftBands(skillNational, 1, 'Georgia comparison standard.'),
      hybrid: shiftBands(hybridNational, 1, 'Georgia comparison standard.'),
      line: shiftBands(lineNational, 1, 'Georgia comparison standard.'),
    },
  },
  'ncaa-recruiting': {
    mode: 'ncaa-recruiting',
    label: 'NCAA Recruiting Projection',
    shortLabel: 'NCAA Projection',
    note: 'A recruiting-projection coaching standard set three inches above the national high-school thresholds. It is not an NCAA eligibility rule or guaranteed scholarship standard.',
    families: {
      skill: shiftBands(skillNational, 3, 'NCAA recruiting projection standard.'),
      hybrid: shiftBands(hybridNational, 3, 'NCAA recruiting projection standard.'),
      line: shiftBands(lineNational, 3, 'NCAA recruiting projection standard.'),
    },
  },
}

export function verticalFamilyFor(group: PositionGroup): VerticalFamily {
  if (group === 'OL' || group === 'DL') return 'line'
  if (group === 'LB' || group === 'TE') return 'hybrid'
  return 'skill'
}

export function verticalBandsFor(
  group: PositionGroup,
  mode: VerticalBenchmarkMode = 'national-hs',
): readonly VerticalBand[] {
  return VERTICAL_BENCHMARK_PROFILES[mode].families[verticalFamilyFor(group)]
}

export function verticalBandFor(
  inches: number,
  group: PositionGroup,
  mode: VerticalBenchmarkMode = 'national-hs',
): VerticalBand {
  const safe = Number.isFinite(inches) ? Math.max(0, inches) : 0
  return verticalBandsFor(group, mode).find((band) => safe >= band.min) ?? verticalBandsFor(group, mode).at(-1)!
}

/**
 * National High School is the fixed scoring mode for FAI. The comparison-mode
 * selector changes the athlete-facing context only, never the athlete's score.
 */
export function verticalFaiScore(inches: number, group: PositionGroup): number {
  const bands = verticalBandsFor(group, 'national-hs')
  const safe = Math.max(0, inches)
  const currentIndex = bands.findIndex((band) => safe >= band.min)
  const index = currentIndex === -1 ? bands.length - 1 : currentIndex
  const current = bands[index]
  const higher = index > 0 ? bands[index - 1] : undefined

  if (!higher || current.id === 'elite') return current.score
  if (higher.min <= current.min) return current.score

  const progress = (safe - current.min) / (higher.min - current.min)
  return Math.max(current.score, Math.min(higher.score, current.score + progress * (higher.score - current.score)))
}
