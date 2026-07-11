// ---------------------------------------------------------------------------
// Sample roster + multi-period testing data so progress features are visible
// immediately. Values are realistic HS combine numbers.
// ---------------------------------------------------------------------------

import type { AppData, Athlete, TestSession, PositionGroup, TestingPhase } from '../types'

function mk(id: string, name: string, grade: number, position: string, positionGroup: PositionGroup, heightIn: number, weightLbs: number): Athlete {
  return { id, name, grade, position, positionGroup, heightIn, weightLbs }
}

const athletes: Athlete[] = [
  mk('a-marcus', 'Marcus Hill', 12, 'Slot WR', 'WR', 71, 185),
  mk('a-deshawn', 'DeShawn Carter', 11, 'CB', 'DB', 70, 178),
  mk('a-tyler', 'Tyler Brooks', 12, 'RB', 'RB', 69, 205),
  mk('a-jamal', 'Jamal Rivers', 11, 'WR', 'WR', 73, 190),
  mk('a-caleb', 'Caleb Nguyen', 10, 'QB', 'QB', 74, 195),
  mk('a-andre', 'Andre Wallace', 12, 'DE', 'DL', 76, 255),
  mk('a-mike', 'Mike Sullivan', 12, 'LT', 'OL', 77, 295),
  mk('a-xavier', 'Xavier Prince', 11, 'MLB', 'LB', 72, 225),
  mk('a-jordan', 'Jordan Klein', 10, 'S', 'DB', 71, 182),
  mk('a-brandon', 'Brandon Ives', 12, 'TE', 'TE', 76, 240),
  mk('a-luis', 'Luis Ferrer', 11, 'NT', 'DL', 74, 285),
  mk('a-noah', 'Noah Whitfield', 10, 'WLB', 'LB', 73, 215),
  mk('a-eli', 'Eli Ramos', 12, 'RG', 'OL', 75, 288),
  mk('a-cam', 'Cam Dobbs', 11, 'RB', 'RB', 68, 198),
  mk('a-trey', 'Trey Alston', 10, 'K/P', 'K/P', 72, 175),
  mk('a-devin', 'Devin Cross', 12, 'FS', 'DB', 72, 186),
]

let seq = 0
function session(
  athleteId: string,
  date: string,
  phase: TestingPhase,
  vals: Partial<Omit<TestSession, 'id' | 'athleteId' | 'date' | 'phase'>>,
): TestSession {
  return { id: `s-${++seq}`, athleteId, date, phase, ...vals }
}

// Baseline (spring) -> Midpoint (summer) -> Final (preseason). Not every athlete
// hits every phase; most improve, a couple regress in a category for realism.
const sessions: TestSession[] = [
  // Marcus Hill — the headline example: 40 goes 5.21 -> 4.98
  session('a-marcus', '2026-02-10', 'Baseline', { benchMax: 205, dash40_1: 5.21, dash40_2: 5.28, fly10_1: 1.62, fly10_2: 1.65, hangCleanReps: 6, shuttle20_1: 4.55, shuttle20_2: 4.60, latShuttle_1: 2.95, latShuttle_2: 2.99, illinois: 16.9, squatMax: 315, broadJump: 104, verticalJump: 30, cond51015: 138 }),
  session('a-marcus', '2026-06-15', 'Midpoint', { benchMax: 225, dash40_1: 4.98, dash40_2: 5.03, fly10_1: 1.55, fly10_2: 1.57, hangCleanReps: 8, shuttle20_1: 4.42, shuttle20_2: 4.47, latShuttle_1: 2.85, latShuttle_2: 2.88, illinois: 16.3, squatMax: 350, broadJump: 110, verticalJump: 33, cond51015: 150 }),

  // DeShawn — fast corner, big improver
  session('a-deshawn', '2026-02-10', 'Baseline', { benchMax: 185, dash40_1: 4.62, dash40_2: 4.66, fly10_1: 1.48, fly10_2: 1.50, hangCleanReps: 7, shuttle20_1: 4.28, shuttle20_2: 4.31, latShuttle_1: 2.70, latShuttle_2: 2.74, illinois: 15.8, squatMax: 300, broadJump: 116, verticalJump: 35, cond51015: 152 }),
  session('a-deshawn', '2026-06-15', 'Midpoint', { benchMax: 205, dash40_1: 4.51, dash40_2: 4.55, fly10_1: 1.43, fly10_2: 1.46, hangCleanReps: 9, shuttle20_1: 4.18, shuttle20_2: 4.22, latShuttle_1: 2.62, latShuttle_2: 2.66, illinois: 15.4, squatMax: 335, broadJump: 122, verticalJump: 37, cond51015: 162 }),

  // Tyler — RB power back
  session('a-tyler', '2026-02-10', 'Baseline', { benchMax: 275, dash40_1: 4.72, dash40_2: 4.78, fly10_1: 1.55, fly10_2: 1.58, hangCleanReps: 10, shuttle20_1: 4.40, shuttle20_2: 4.44, latShuttle_1: 2.82, latShuttle_2: 2.86, illinois: 16.2, squatMax: 405, broadJump: 112, verticalJump: 32, cond51015: 148 }),
  session('a-tyler', '2026-06-15', 'Midpoint', { benchMax: 295, dash40_1: 4.66, dash40_2: 4.70, fly10_1: 1.52, fly10_2: 1.54, hangCleanReps: 12, shuttle20_1: 4.33, shuttle20_2: 4.37, latShuttle_1: 2.78, latShuttle_2: 2.81, illinois: 15.9, squatMax: 445, broadJump: 117, verticalJump: 34, cond51015: 158 }),

  // Jamal — tall WR
  session('a-jamal', '2026-02-10', 'Baseline', { benchMax: 195, dash40_1: 4.70, dash40_2: 4.74, fly10_1: 1.53, fly10_2: 1.56, hangCleanReps: 6, shuttle20_1: 4.45, shuttle20_2: 4.49, latShuttle_1: 2.90, latShuttle_2: 2.94, illinois: 16.5, squatMax: 285, broadJump: 114, verticalJump: 34, cond51015: 144 }),
  session('a-jamal', '2026-06-15', 'Midpoint', { benchMax: 205, dash40_1: 4.63, dash40_2: 4.68, fly10_1: 1.50, fly10_2: 1.52, hangCleanReps: 7, shuttle20_1: 4.38, shuttle20_2: 4.42, latShuttle_1: 2.84, latShuttle_2: 2.88, illinois: 16.1, squatMax: 315, broadJump: 118, verticalJump: 36, cond51015: 152 }),

  // Caleb — young QB, athletic
  session('a-caleb', '2026-02-10', 'Baseline', { benchMax: 175, dash40_1: 4.85, dash40_2: 4.90, fly10_1: 1.60, fly10_2: 1.63, hangCleanReps: 5, shuttle20_1: 4.52, shuttle20_2: 4.56, latShuttle_1: 2.92, latShuttle_2: 2.96, illinois: 16.7, squatMax: 275, broadJump: 106, verticalJump: 29, cond51015: 136 }),
  session('a-caleb', '2026-06-15', 'Midpoint', { benchMax: 195, dash40_1: 4.79, dash40_2: 4.83, fly10_1: 1.57, fly10_2: 1.60, hangCleanReps: 7, shuttle20_1: 4.46, shuttle20_2: 4.50, latShuttle_1: 2.88, latShuttle_2: 2.91, illinois: 16.4, squatMax: 305, broadJump: 110, verticalJump: 31, cond51015: 146 }),

  // Andre — DE, strong/explosive
  session('a-andre', '2026-02-10', 'Baseline', { benchMax: 315, dash40_1: 4.88, dash40_2: 4.93, fly10_1: 1.61, fly10_2: 1.64, hangCleanReps: 11, shuttle20_1: 4.50, shuttle20_2: 4.55, latShuttle_1: 2.90, latShuttle_2: 2.95, illinois: 16.6, squatMax: 455, broadJump: 108, verticalJump: 31, cond51015: 140 }),
  session('a-andre', '2026-06-15', 'Midpoint', { benchMax: 345, dash40_1: 4.83, dash40_2: 4.88, fly10_1: 1.59, fly10_2: 1.62, hangCleanReps: 13, shuttle20_1: 4.44, shuttle20_2: 4.49, latShuttle_1: 2.86, latShuttle_2: 2.90, illinois: 16.3, squatMax: 495, broadJump: 112, verticalJump: 33, cond51015: 150 }),

  // Mike — OL, strongest, slowest (regresses slightly in conditioning)
  session('a-mike', '2026-02-10', 'Baseline', { benchMax: 340, dash40_1: 5.45, dash40_2: 5.52, fly10_1: 1.78, fly10_2: 1.82, hangCleanReps: 9, shuttle20_1: 4.85, shuttle20_2: 4.90, latShuttle_1: 3.15, latShuttle_2: 3.20, illinois: 17.8, squatMax: 500, broadJump: 96, verticalJump: 24, cond51015: 120 }),
  session('a-mike', '2026-06-15', 'Midpoint', { benchMax: 365, dash40_1: 5.40, dash40_2: 5.46, fly10_1: 1.76, fly10_2: 1.80, hangCleanReps: 10, shuttle20_1: 4.80, shuttle20_2: 4.85, latShuttle_1: 3.12, latShuttle_2: 3.16, illinois: 17.6, squatMax: 545, broadJump: 99, verticalJump: 25, cond51015: 116 }),

  // Xavier — MLB
  session('a-xavier', '2026-02-10', 'Baseline', { benchMax: 285, dash40_1: 4.78, dash40_2: 4.83, fly10_1: 1.57, fly10_2: 1.60, hangCleanReps: 10, shuttle20_1: 4.42, shuttle20_2: 4.46, latShuttle_1: 2.84, latShuttle_2: 2.88, illinois: 16.1, squatMax: 420, broadJump: 110, verticalJump: 32, cond51015: 150 }),
  session('a-xavier', '2026-06-15', 'Midpoint', { benchMax: 305, dash40_1: 4.72, dash40_2: 4.77, fly10_1: 1.54, fly10_2: 1.57, hangCleanReps: 12, shuttle20_1: 4.35, shuttle20_2: 4.39, latShuttle_1: 2.79, latShuttle_2: 2.83, illinois: 15.8, squatMax: 455, broadJump: 115, verticalJump: 34, cond51015: 160 }),

  // Jordan — young safety
  session('a-jordan', '2026-02-10', 'Baseline', { benchMax: 175, dash40_1: 4.68, dash40_2: 4.72, fly10_1: 1.51, fly10_2: 1.54, hangCleanReps: 6, shuttle20_1: 4.35, shuttle20_2: 4.39, latShuttle_1: 2.78, latShuttle_2: 2.82, illinois: 16.0, squatMax: 285, broadJump: 113, verticalJump: 34, cond51015: 150 }),
  session('a-jordan', '2026-06-15', 'Midpoint', { benchMax: 195, dash40_1: 4.60, dash40_2: 4.65, fly10_1: 1.47, fly10_2: 1.50, hangCleanReps: 8, shuttle20_1: 4.27, shuttle20_2: 4.31, latShuttle_1: 2.72, latShuttle_2: 2.76, illinois: 15.6, squatMax: 320, broadJump: 119, verticalJump: 36, cond51015: 160 }),

  // Brandon — TE
  session('a-brandon', '2026-02-10', 'Baseline', { benchMax: 265, dash40_1: 4.90, dash40_2: 4.95, fly10_1: 1.62, fly10_2: 1.65, hangCleanReps: 8, shuttle20_1: 4.55, shuttle20_2: 4.60, latShuttle_1: 2.92, latShuttle_2: 2.96, illinois: 16.7, squatMax: 405, broadJump: 106, verticalJump: 30, cond51015: 142 }),
  session('a-brandon', '2026-06-15', 'Midpoint', { benchMax: 285, dash40_1: 4.84, dash40_2: 4.89, fly10_1: 1.59, fly10_2: 1.62, hangCleanReps: 10, shuttle20_1: 4.49, shuttle20_2: 4.53, latShuttle_1: 2.88, latShuttle_2: 2.92, illinois: 16.4, squatMax: 440, broadJump: 110, verticalJump: 32, cond51015: 150 }),

  // Luis — NT
  session('a-luis', '2026-02-10', 'Baseline', { benchMax: 330, dash40_1: 5.30, dash40_2: 5.36, fly10_1: 1.72, fly10_2: 1.76, hangCleanReps: 8, shuttle20_1: 4.75, shuttle20_2: 4.80, latShuttle_1: 3.05, latShuttle_2: 3.10, illinois: 17.4, squatMax: 495, broadJump: 98, verticalJump: 25, cond51015: 124 }),
  session('a-luis', '2026-06-15', 'Midpoint', { benchMax: 355, dash40_1: 5.25, dash40_2: 5.31, fly10_1: 1.70, fly10_2: 1.74, hangCleanReps: 9, shuttle20_1: 4.70, shuttle20_2: 4.75, latShuttle_1: 3.02, latShuttle_2: 3.06, illinois: 17.2, squatMax: 535, broadJump: 101, verticalJump: 26, cond51015: 130 }),

  // Noah — young WLB
  session('a-noah', '2026-02-10', 'Baseline', { benchMax: 235, dash40_1: 4.80, dash40_2: 4.85, fly10_1: 1.58, fly10_2: 1.61, hangCleanReps: 8, shuttle20_1: 4.46, shuttle20_2: 4.50, latShuttle_1: 2.86, latShuttle_2: 2.90, illinois: 16.3, squatMax: 365, broadJump: 108, verticalJump: 31, cond51015: 146 }),
  session('a-noah', '2026-06-15', 'Midpoint', { benchMax: 260, dash40_1: 4.74, dash40_2: 4.79, fly10_1: 1.55, fly10_2: 1.58, hangCleanReps: 10, shuttle20_1: 4.39, shuttle20_2: 4.43, latShuttle_1: 2.81, latShuttle_2: 2.85, illinois: 16.0, squatMax: 400, broadJump: 113, verticalJump: 33, cond51015: 156 }),

  // Eli — RG
  session('a-eli', '2026-02-10', 'Baseline', { benchMax: 325, dash40_1: 5.38, dash40_2: 5.44, fly10_1: 1.75, fly10_2: 1.79, hangCleanReps: 9, shuttle20_1: 4.82, shuttle20_2: 4.87, latShuttle_1: 3.10, latShuttle_2: 3.15, illinois: 17.6, squatMax: 480, broadJump: 97, verticalJump: 24, cond51015: 122 }),
  session('a-eli', '2026-06-15', 'Midpoint', { benchMax: 350, dash40_1: 5.33, dash40_2: 5.39, fly10_1: 1.73, fly10_2: 1.77, hangCleanReps: 10, shuttle20_1: 4.77, shuttle20_2: 4.82, latShuttle_1: 3.06, latShuttle_2: 3.11, illinois: 17.4, squatMax: 520, broadJump: 100, verticalJump: 25, cond51015: 128 }),

  // Cam — shifty RB, only baseline so far (not yet re-tested)
  session('a-cam', '2026-02-10', 'Baseline', { benchMax: 225, dash40_1: 4.66, dash40_2: 4.70, fly10_1: 1.50, fly10_2: 1.53, hangCleanReps: 9, shuttle20_1: 4.30, shuttle20_2: 4.34, latShuttle_1: 2.74, latShuttle_2: 2.78, illinois: 15.9, squatMax: 355, broadJump: 116, verticalJump: 35, cond51015: 154 }),
  session('a-cam', '2026-06-15', 'Midpoint', { benchMax: 245, dash40_1: 4.61, dash40_2: 4.65, fly10_1: 1.48, fly10_2: 1.50, hangCleanReps: 11, shuttle20_1: 4.24, shuttle20_2: 4.28, latShuttle_1: 2.70, latShuttle_2: 2.73, illinois: 15.6, squatMax: 385, broadJump: 120, verticalJump: 37, cond51015: 164 }),

  // Trey — K/P, athletic specialist
  session('a-trey', '2026-02-10', 'Baseline', { benchMax: 165, dash40_1: 4.95, dash40_2: 5.00, fly10_1: 1.63, fly10_2: 1.66, hangCleanReps: 5, shuttle20_1: 4.58, shuttle20_2: 4.62, latShuttle_1: 2.95, latShuttle_2: 2.99, illinois: 16.9, squatMax: 265, broadJump: 104, verticalJump: 28, cond51015: 134 }),
  session('a-trey', '2026-06-15', 'Midpoint', { benchMax: 180, dash40_1: 4.90, dash40_2: 4.95, fly10_1: 1.61, fly10_2: 1.64, hangCleanReps: 6, shuttle20_1: 4.53, shuttle20_2: 4.57, latShuttle_1: 2.91, latShuttle_2: 2.95, illinois: 16.6, squatMax: 290, broadJump: 107, verticalJump: 29, cond51015: 140 }),

  // Devin — FS, three testing periods to show a longer trend
  session('a-devin', '2026-02-10', 'Baseline', { benchMax: 195, dash40_1: 4.65, dash40_2: 4.69, fly10_1: 1.49, fly10_2: 1.52, hangCleanReps: 7, shuttle20_1: 4.33, shuttle20_2: 4.37, latShuttle_1: 2.76, latShuttle_2: 2.80, illinois: 15.9, squatMax: 305, broadJump: 115, verticalJump: 35, cond51015: 152 }),
  session('a-devin', '2026-06-15', 'Midpoint', { benchMax: 215, dash40_1: 4.58, dash40_2: 4.62, fly10_1: 1.46, fly10_2: 1.49, hangCleanReps: 9, shuttle20_1: 4.26, shuttle20_2: 4.30, latShuttle_1: 2.71, latShuttle_2: 2.75, illinois: 15.6, squatMax: 340, broadJump: 120, verticalJump: 37, cond51015: 162 }),
  session('a-devin', '2026-08-01', 'Preseason', { benchMax: 230, dash40_1: 4.54, dash40_2: 4.58, fly10_1: 1.44, fly10_2: 1.47, hangCleanReps: 10, shuttle20_1: 4.21, shuttle20_2: 4.25, latShuttle_1: 2.67, latShuttle_2: 2.71, illinois: 15.3, squatMax: 365, broadJump: 124, verticalJump: 39, cond51015: 170 }),

  // Preseason — the WHOLE team re-tests together. Keeping the full roster in every
  // phase keeps the comparison cohort constant, so FAI changes reflect real
  // relative improvement (and every athlete gets a 3rd point on their trend line).
  session('a-marcus', '2026-08-01', 'Preseason', { benchMax: 235, dash40_1: 4.92, dash40_2: 4.97, fly10_1: 1.53, fly10_2: 1.55, hangCleanReps: 9, shuttle20_1: 4.37, shuttle20_2: 4.41, latShuttle_1: 2.82, latShuttle_2: 2.85, illinois: 16.1, squatMax: 365, broadJump: 113, verticalJump: 34, cond51015: 156 }),
  session('a-deshawn', '2026-08-01', 'Preseason', { benchMax: 215, dash40_1: 4.46, dash40_2: 4.50, fly10_1: 1.41, fly10_2: 1.44, hangCleanReps: 10, shuttle20_1: 4.13, shuttle20_2: 4.17, latShuttle_1: 2.58, latShuttle_2: 2.62, illinois: 15.2, squatMax: 350, broadJump: 125, verticalJump: 38, cond51015: 168 }),
  session('a-tyler', '2026-08-01', 'Preseason', { benchMax: 305, dash40_1: 4.62, dash40_2: 4.66, fly10_1: 1.50, fly10_2: 1.52, hangCleanReps: 13, shuttle20_1: 4.29, shuttle20_2: 4.33, latShuttle_1: 2.75, latShuttle_2: 2.78, illinois: 15.7, squatMax: 470, broadJump: 120, verticalJump: 35, cond51015: 164 }),
  session('a-cam', '2026-08-01', 'Preseason', { benchMax: 255, dash40_1: 4.58, dash40_2: 4.62, fly10_1: 1.46, fly10_2: 1.49, hangCleanReps: 12, shuttle20_1: 4.20, shuttle20_2: 4.24, latShuttle_1: 2.67, latShuttle_2: 2.70, illinois: 15.4, squatMax: 400, broadJump: 122, verticalJump: 38, cond51015: 168 }),
  session('a-jordan', '2026-08-01', 'Preseason', { benchMax: 205, dash40_1: 4.56, dash40_2: 4.60, fly10_1: 1.45, fly10_2: 1.48, hangCleanReps: 9, shuttle20_1: 4.22, shuttle20_2: 4.26, latShuttle_1: 2.68, latShuttle_2: 2.72, illinois: 15.4, squatMax: 335, broadJump: 122, verticalJump: 37, cond51015: 164 }),
  session('a-xavier', '2026-08-01', 'Preseason', { benchMax: 320, dash40_1: 4.68, dash40_2: 4.73, fly10_1: 1.52, fly10_2: 1.55, hangCleanReps: 13, shuttle20_1: 4.31, shuttle20_2: 4.35, latShuttle_1: 2.76, latShuttle_2: 2.80, illinois: 15.6, squatMax: 475, broadJump: 118, verticalJump: 35, cond51015: 166 }),
  session('a-andre', '2026-08-01', 'Preseason', { benchMax: 360, dash40_1: 4.80, dash40_2: 4.85, fly10_1: 1.57, fly10_2: 1.60, hangCleanReps: 14, shuttle20_1: 4.40, shuttle20_2: 4.45, latShuttle_1: 2.83, latShuttle_2: 2.87, illinois: 16.1, squatMax: 515, broadJump: 115, verticalJump: 34, cond51015: 156 }),
  session('a-jamal', '2026-08-01', 'Preseason', { benchMax: 215, dash40_1: 4.59, dash40_2: 4.63, fly10_1: 1.48, fly10_2: 1.50, hangCleanReps: 8, shuttle20_1: 4.34, shuttle20_2: 4.38, latShuttle_1: 2.80, latShuttle_2: 2.84, illinois: 15.9, squatMax: 335, broadJump: 121, verticalJump: 38, cond51015: 158 }),
  session('a-caleb', '2026-08-01', 'Preseason', { benchMax: 210, dash40_1: 4.74, dash40_2: 4.78, fly10_1: 1.55, fly10_2: 1.58, hangCleanReps: 8, shuttle20_1: 4.41, shuttle20_2: 4.45, latShuttle_1: 2.84, latShuttle_2: 2.87, illinois: 16.1, squatMax: 330, broadJump: 113, verticalJump: 32, cond51015: 152 }),
  session('a-mike', '2026-08-01', 'Preseason', { benchMax: 385, dash40_1: 5.36, dash40_2: 5.42, fly10_1: 1.74, fly10_2: 1.78, hangCleanReps: 11, shuttle20_1: 4.76, shuttle20_2: 4.81, latShuttle_1: 3.09, latShuttle_2: 3.13, illinois: 17.4, squatMax: 580, broadJump: 101, verticalJump: 26, cond51015: 118 }),
  session('a-brandon', '2026-08-01', 'Preseason', { benchMax: 300, dash40_1: 4.80, dash40_2: 4.85, fly10_1: 1.57, fly10_2: 1.60, hangCleanReps: 11, shuttle20_1: 4.45, shuttle20_2: 4.49, latShuttle_1: 2.85, latShuttle_2: 2.89, illinois: 16.2, squatMax: 465, broadJump: 112, verticalJump: 33, cond51015: 154 }),
  session('a-luis', '2026-08-01', 'Preseason', { benchMax: 370, dash40_1: 5.21, dash40_2: 5.27, fly10_1: 1.68, fly10_2: 1.72, hangCleanReps: 10, shuttle20_1: 4.66, shuttle20_2: 4.71, latShuttle_1: 2.99, latShuttle_2: 3.03, illinois: 17.0, squatMax: 560, broadJump: 103, verticalJump: 27, cond51015: 134 }),
  session('a-noah', '2026-08-01', 'Preseason', { benchMax: 275, dash40_1: 4.70, dash40_2: 4.75, fly10_1: 1.53, fly10_2: 1.56, hangCleanReps: 11, shuttle20_1: 4.35, shuttle20_2: 4.39, latShuttle_1: 2.78, latShuttle_2: 2.82, illinois: 15.8, squatMax: 420, broadJump: 116, verticalJump: 34, cond51015: 160 }),
  session('a-eli', '2026-08-01', 'Preseason', { benchMax: 365, dash40_1: 5.29, dash40_2: 5.35, fly10_1: 1.71, fly10_2: 1.75, hangCleanReps: 11, shuttle20_1: 4.73, shuttle20_2: 4.78, latShuttle_1: 3.03, latShuttle_2: 3.08, illinois: 17.2, squatMax: 545, broadJump: 102, verticalJump: 26, cond51015: 132 }),
  session('a-trey', '2026-08-01', 'Preseason', { benchMax: 190, dash40_1: 4.86, dash40_2: 4.91, fly10_1: 1.59, fly10_2: 1.62, hangCleanReps: 7, shuttle20_1: 4.49, shuttle20_2: 4.53, latShuttle_1: 2.88, latShuttle_2: 2.92, illinois: 16.4, squatMax: 310, broadJump: 109, verticalJump: 30, cond51015: 144 }),
]

export function sampleData(): AppData {
  seq = 0
  return {
    athletes: structuredClone(athletes),
    sessions: structuredClone(sessions),
  }
}
