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

/** Short display label for categories (radar / TV cards). */
export const CATEGORY_SHORT: Record<Category, string> = {
  Speed: 'SPD',
  Power: 'PWR',
  'Change of Direction': 'COD',
  Conditioning: 'COND',
  Strength: 'STR',
}

/** Format total inches as feet'inches" (e.g. 74 -> 6'2"). */
export function formatHeight(totalInches: number): string {
  if (!totalInches || totalInches <= 0) return '—'
  const ft = Math.floor(totalInches / 12)
  const inch = Math.round(totalInches % 12)
  return `${ft}'${inch}"`
}

/** Parse 6'2" / 6-2 / 74 into total inches. */
export function parseHeight(input: string): number {
  const s = input.trim()
  if (!s) return 0
  const m = s.match(/^(\d+)\s*['\-\s]\s*(\d+)/)
  if (m) return parseInt(m[1], 10) * 12 + parseInt(m[2], 10)
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
