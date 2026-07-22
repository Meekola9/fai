import { describe, expect, it } from 'vitest'
import type { TestSession } from '../types'
import {
  estimatePowerClean1RM,
  powerCleanMaxFor,
  powerCleanResultFor,
} from './powerClean'

function session(values: Partial<TestSession>): TestSession {
  return {
    id: 'session-1',
    athleteId: 'athlete-1',
    eventId: 'event-1',
    date: '2026-07-01',
    phase: 'Summer',
    ...values,
  }
}

describe('power-clean conversion', () => {
  it('estimates legacy body-weight repetitions with the Epley equation', () => {
    expect(estimatePowerClean1RM(180, 10)).toBe(240)
    expect(estimatePowerClean1RM(200, 15)).toBe(300)
    expect(estimatePowerClean1RM(185, 8)).toBe(235)
  })

  it('uses a recorded Power Clean max before a legacy estimate', () => {
    const result = powerCleanResultFor(session({
      powerCleanMax: 255,
      weightLbsSnapshot: 180,
      hangCleanReps: 15,
    }))

    expect(result).toEqual({ max: 255, source: 'direct', bodyWeight: 180 })
    expect(powerCleanMaxFor(session({
      powerCleanMax: 255,
      weightLbsSnapshot: 180,
      hangCleanReps: 15,
    }))).toBe(255)
  })

  it('uses the body weight attached to the legacy clean result', () => {
    const result = powerCleanResultFor(session({
      weightLbsSnapshot: 205,
      hangCleanWeightLbsSnapshot: 180,
      hangCleanReps: 10,
    }))

    expect(result).toEqual({
      max: 240,
      source: 'estimated',
      bodyWeight: 180,
      reps: 10,
    })
  })

  it('does not invent an estimate when testing weight or reps are missing', () => {
    expect(estimatePowerClean1RM(undefined, 10)).toBeUndefined()
    expect(estimatePowerClean1RM(180, undefined)).toBeUndefined()
    expect(powerCleanMaxFor(session({ hangCleanReps: 10 }))).toBeUndefined()
  })
})
