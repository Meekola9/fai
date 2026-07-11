import type { PositionGroup, TestingPhase, Category } from '../types'

export const POSITION_GROUPS: PositionGroup[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'OL',
  'DL',
  'LB',
  'DB',
  'K/P',
  'ATH',
]

export const TESTING_PHASES: TestingPhase[] = [
  'Baseline',
  'Midpoint',
  'Final',
  'Offseason',
  'Summer',
  'Preseason',
]

export const CATEGORIES: Category[] = [
  'Speed',
  'Power',
  'Change of Direction',
  'Conditioning',
  'Strength',
]

export const GRADES = [9, 10, 11, 12]

export const CATEGORY_SHORT: Record<Category, string> = {
  Speed: 'SPD',
  Power: 'PWR',
  'Change of Direction': 'COD',
  Conditioning: 'COND',
  Strength: 'STR',
}

export function formatHeight(totalInches: number): string {
  if (!totalInches || totalInches <= 0) return '—'
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return `${feet}'${inches}"`
}

export function parseHeight(input: string): number {
  const value = input.trim()
  if (!value) return 0
  const match = value.match(/^(\d+)\s*['\-\s]\s*(\d+)/)
  if (match) return parseInt(match[1], 10) * 12 + parseInt(match[2], 10)
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}
