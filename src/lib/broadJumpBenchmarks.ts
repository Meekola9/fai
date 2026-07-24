import type { PositionGroup } from '../types'

export type BroadJumpFamily = 'skill' | 'hybrid' | 'line'
export type BroadJumpBandId = 'elite' | 'excellent' | 'good' | 'average' | 'developing'

export interface BroadJumpBand {
  id: BroadJumpBandId
  label: string
  percentileLabel: string
  minInches: number
  description: string
}

export interface HistoricalBroadJumpBand {
  percentile: string
  lowMeters: number
  highMeters: number
  minInches: number
  maxInches: number
}

const skillBands: readonly BroadJumpBand[] = [
  { id: 'elite', label: 'Elite', percentileLabel: 'Impact prospect', minInches: 112, description: 'Rare horizontal explosion for a high-school skill athlete.' },
  { id: 'excellent', label: 'Excellent', percentileLabel: 'All-conference range', minInches: 108, description: 'Excellent lower-body power for a skill-position player.' },
  { id: 'good', label: 'Good', percentileLabel: 'Strong varsity range', minInches: 104, description: 'Strong football-specific broad-jump performance.' },
  { id: 'average', label: 'Average', percentileLabel: 'Varsity baseline', minInches: 98, description: 'A useful high-school football baseline for skill positions.' },
  { id: 'developing', label: 'Developing', percentileLabel: 'Below varsity baseline', minInches: 0, description: 'Horizontal force production remains a development priority.' },
]

const hybridBands: readonly BroadJumpBand[] = [
  { id: 'elite', label: 'Elite', percentileLabel: 'Impact prospect', minInches: 108, description: 'Rare horizontal explosion for a linebacker, tight end, or hybrid.' },
  { id: 'excellent', label: 'Excellent', percentileLabel: 'All-conference range', minInches: 104, description: 'Excellent broad-jump power for a hybrid position.' },
  { id: 'good', label: 'Good', percentileLabel: 'Strong varsity range', minInches: 100, description: 'Strong football-specific broad-jump performance.' },
  { id: 'average', label: 'Average', percentileLabel: 'Varsity baseline', minInches: 94, description: 'A useful high-school football baseline for hybrid positions.' },
  { id: 'developing', label: 'Developing', percentileLabel: 'Below varsity baseline', minInches: 0, description: 'Horizontal force production needs focused development.' },
]

const lineBands: readonly BroadJumpBand[] = [
  { id: 'elite', label: 'Elite', percentileLabel: 'Impact prospect', minInches: 102, description: 'Rare horizontal explosion for an offensive or defensive lineman.' },
  { id: 'excellent', label: 'Excellent', percentileLabel: 'All-conference range', minInches: 98, description: 'Excellent broad-jump power for a lineman.' },
  { id: 'good', label: 'Good', percentileLabel: 'Strong varsity range', minInches: 94, description: 'Strong football-specific broad-jump performance for the line.' },
  { id: 'average', label: 'Average', percentileLabel: 'Varsity baseline', minInches: 88, description: 'A useful high-school football baseline for linemen.' },
  { id: 'developing', label: 'Developing', percentileLabel: 'Below varsity baseline', minInches: 0, description: 'Horizontal force production should be emphasized.' },
]

const METERS_TO_INCHES = 39.3700787402

function historicalBand(percentile: string, lowMeters: number, highMeters: number): HistoricalBroadJumpBand {
  return {
    percentile,
    lowMeters,
    highMeters,
    minInches: lowMeters * METERS_TO_INCHES,
    maxInches: highMeters * METERS_TO_INCHES,
  }
}

/**
 * Male standing-long-jump reference ranges transcribed from the user-provided
 * chart attributed to Donald A. Chu, Explosive Power & Strength (1996).
 * These are historical general-athletic ranges, not FAI football standards.
 */
export const HISTORICAL_MALE_BROAD_JUMP_BANDS: readonly HistoricalBroadJumpBand[] = [
  historicalBand('91–100', 3.40, 3.75),
  historicalBand('81–90', 3.10, 3.39),
  historicalBand('71–80', 2.95, 3.09),
  historicalBand('61–70', 2.80, 2.94),
  historicalBand('51–60', 2.65, 2.79),
  historicalBand('41–50', 2.50, 2.64),
  historicalBand('31–40', 2.35, 2.49),
  historicalBand('21–30', 2.20, 2.34),
  historicalBand('11–20', 2.05, 2.19),
  historicalBand('1–10', 1.90, 2.04),
]

export function broadJumpFamilyFor(group: PositionGroup): BroadJumpFamily {
  if (group === 'OL' || group === 'DL') return 'line'
  if (group === 'LB' || group === 'TE') return 'hybrid'
  return 'skill'
}

export function broadJumpBandsFor(group: PositionGroup): readonly BroadJumpBand[] {
  const family = broadJumpFamilyFor(group)
  if (family === 'line') return lineBands
  if (family === 'hybrid') return hybridBands
  return skillBands
}

export function broadJumpBandFor(inches: number, group: PositionGroup): BroadJumpBand {
  const safe = Number.isFinite(inches) ? Math.max(0, inches) : 0
  return broadJumpBandsFor(group).find((band) => safe >= band.minInches) ?? broadJumpBandsFor(group).at(-1)!
}

export function historicalMaleBroadJumpBandFor(inches: number): HistoricalBroadJumpBand | undefined {
  if (!Number.isFinite(inches)) return undefined
  return HISTORICAL_MALE_BROAD_JUMP_BANDS.find((band) => inches >= band.minInches)
}

export function formatBroadJump(inches: number): string {
  const safe = Number.isFinite(inches) ? Math.max(0, inches) : 0
  const feet = Math.floor(safe / 12)
  const remainder = safe - feet * 12
  return `${feet}'${remainder.toFixed(1)}"`
}
