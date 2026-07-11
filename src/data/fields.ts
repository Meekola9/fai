import type { TestSession } from '../types'

/** A raw numeric input on the testing form (one per stat a coach enters). */
export interface RawField {
  key: keyof TestSession
  label: string
  unit: string
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Optional'
  step: number
  placeholder?: string
}

export const RAW_FIELDS: RawField[] = [
  // Monday — Speed + Bench
  { key: 'benchMax', label: 'Bench Max', unit: 'lbs', day: 'Monday', step: 5, placeholder: '225' },
  { key: 'dash40_1', label: '40 Dash — Attempt 1', unit: 's', day: 'Monday', step: 0.01, placeholder: '4.98' },
  { key: 'dash40_2', label: '40 Dash — Attempt 2', unit: 's', day: 'Monday', step: 0.01, placeholder: '5.02' },
  { key: 'fly10_1', label: '10 Fly — Attempt 1', unit: 's', day: 'Monday', step: 0.01, placeholder: '1.55' },
  { key: 'fly10_2', label: '10 Fly — Attempt 2', unit: 's', day: 'Monday', step: 0.01, placeholder: '1.58' },
  // Tuesday — Power Endurance + COD
  { key: 'hangCleanReps', label: 'Hang Clean Reps (bodyweight)', unit: 'reps', day: 'Tuesday', step: 1, placeholder: '8' },
  { key: 'shuttle20_1', label: '20 Shuttle — Attempt 1', unit: 's', day: 'Tuesday', step: 0.01, placeholder: '4.35' },
  { key: 'shuttle20_2', label: '20 Shuttle — Attempt 2', unit: 's', day: 'Tuesday', step: 0.01, placeholder: '4.41' },
  { key: 'latShuttle_1', label: 'Lateral 10 Shuttle — Attempt 1', unit: 's', day: 'Tuesday', step: 0.01, placeholder: '2.80' },
  { key: 'latShuttle_2', label: 'Lateral 10 Shuttle — Attempt 2', unit: 's', day: 'Tuesday', step: 0.01, placeholder: '2.85' },
  { key: 'illinois', label: 'Illinois Agility Test', unit: 's', day: 'Tuesday', step: 0.01, placeholder: '16.20' },
  // Wednesday — Lower Body + Jumps
  { key: 'squatMax', label: 'Squat Max', unit: 'lbs', day: 'Wednesday', step: 5, placeholder: '405' },
  { key: 'broadJump', label: 'Broad Jump', unit: 'in', day: 'Wednesday', step: 1, placeholder: '108' },
  { key: 'verticalJump', label: 'Vertical Jump', unit: 'in', day: 'Wednesday', step: 0.5, placeholder: '32' },
  // Optional conditioning
  { key: 'cond51015', label: '5-10-15 Shuttle — total yards (30s)', unit: 'yd', day: 'Optional', step: 1, placeholder: '150' },
]

export const RAW_FIELDS_BY_DAY = (day: RawField['day']): RawField[] =>
  RAW_FIELDS.filter((f) => f.day === day)

export const TESTING_DAYS: RawField['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Optional']

export const DAY_TITLE: Record<RawField['day'], string> = {
  Monday: 'Monday — Speed + Bench',
  Tuesday: 'Tuesday — Power Endurance + Change of Direction',
  Wednesday: 'Wednesday — Lower Body + Jumps',
  Optional: 'Optional — Conditioning',
}
