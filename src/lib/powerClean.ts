import type { TestSession } from '../types'

export type PowerCleanSource = 'direct' | 'estimated'

export interface PowerCleanResult {
  max: number
  source: PowerCleanSource
  bodyWeight?: number
  reps?: number
}

/**
 * Estimate a one-repetition maximum from the legacy body-weight AMRAP test.
 * Uses the Epley equation and rounds to the nearest five pounds because power
 * cleans are normally loaded in five-pound increments.
 */
export function estimatePowerClean1RM(
  bodyWeight?: number,
  reps?: number,
): number | undefined {
  if (
    typeof bodyWeight !== 'number'
    || !Number.isFinite(bodyWeight)
    || bodyWeight <= 0
    || typeof reps !== 'number'
    || !Number.isFinite(reps)
    || reps <= 0
  ) return undefined

  const estimate = bodyWeight * (1 + reps / 30)
  return Math.round(estimate / 5) * 5
}

/**
 * Return the clean value used by FAI. A measured Power Clean max always wins;
 * legacy body-weight hang-clean repetitions are only a fallback estimate.
 */
export function powerCleanResultFor(session: TestSession): PowerCleanResult | undefined {
  if (
    typeof session.powerCleanMax === 'number'
    && Number.isFinite(session.powerCleanMax)
    && session.powerCleanMax > 0
  ) {
    return {
      max: session.powerCleanMax,
      source: 'direct',
      bodyWeight: session.weightLbsSnapshot,
    }
  }

  if (
    typeof session.estimatedPowerCleanMax === 'number'
    && Number.isFinite(session.estimatedPowerCleanMax)
    && session.estimatedPowerCleanMax > 0
  ) {
    return {
      max: session.estimatedPowerCleanMax,
      source: 'estimated',
      bodyWeight: session.hangCleanWeightLbsSnapshot ?? session.weightLbsSnapshot,
      reps: session.hangCleanReps,
    }
  }

  const bodyWeight = session.hangCleanWeightLbsSnapshot ?? session.weightLbsSnapshot
  const estimated = estimatePowerClean1RM(bodyWeight, session.hangCleanReps)
  if (!estimated) return undefined

  return {
    max: estimated,
    source: 'estimated',
    bodyWeight,
    reps: session.hangCleanReps,
  }
}

export function powerCleanMaxFor(session: TestSession): number | undefined {
  return powerCleanResultFor(session)?.max
}
