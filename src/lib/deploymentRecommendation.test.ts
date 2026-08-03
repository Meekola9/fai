import { describe, expect, it } from 'vitest'
import {
  IRON_MAN_MAX_CALLS,
  IRON_MAN_MAX_FORMATIONS,
  normalizeIronManPackage,
  parseDeploymentPackageItems,
  recommendDeployment,
} from './deploymentRecommendation'
import { decodeCloudPosition, encodeCloudPosition } from '../data/positions'
import type { Athlete } from '../types'

describe('deployment recommendation', () => {
  it('recommends Two-Way only when physical, mental, and roster-need gates clear', () => {
    const result = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 82,
      secondaryScore: 78,
      awarenessScore: 87,
      rosterNeed: 'starter',
      coachMentalReadiness: 4,
      assignmentReliability: 91,
    })
    expect(result.usage).toBe('two-way')
    expect(result.reasons.join(' ')).toContain('two complete plans')
  })

  it('routes a physically ready athlete with incomplete mental evidence to Iron Man', () => {
    const result = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 76,
      secondaryScore: 71,
      rosterNeed: 'rotation',
      coachMentalReadiness: 3,
      assignmentReliability: 74,
    })
    expect(result.usage).toBe('iron-man')
    expect(result.guardrails.join(' ')).toContain('10 calls')
  })

  it('protects the primary role when the roster has no second-side need', () => {
    const result = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 90,
      secondaryScore: 88,
      awarenessScore: 100,
      rosterNeed: 'none',
      coachMentalReadiness: 5,
      assignmentReliability: 100,
    })
    expect(result.usage).toBe('one-way')
  })

  it('keeps a severe mental-readiness flag out of the secondary package', () => {
    const result = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 80,
      secondaryScore: 75,
      awarenessScore: 72,
      rosterNeed: 'rotation',
      coachMentalReadiness: 1,
      assignmentReliability: 55,
    })
    expect(result.usage).toBe('one-way')
  })
})

describe('Iron Man package limits', () => {
  it('deduplicates coach-entered lines', () => {
    expect(parseDeploymentPackageItems('Trips\nTrips\nDoubles, Goal Line')).toEqual([
      'Trips',
      'Doubles',
      'Goal Line',
    ])
  })

  it('enforces two formations, ten calls, and a 30 percent snap cap', () => {
    const normalized = normalizeIronManPackage({
      formations: ['Trips', 'Doubles', 'Empty'],
      calls: Array.from({ length: 14 }, (_, index) => `Call ${index + 1}`),
      secondarySnapCapPct: 55,
    })
    expect(normalized.formations).toHaveLength(IRON_MAN_MAX_FORMATIONS)
    expect(normalized.calls).toHaveLength(IRON_MAN_MAX_CALLS)
    expect(normalized.secondarySnapCapPct).toBe(30)
  })

  it('round-trips assessment and package metadata through cloud position packing', () => {
    const athlete: Athlete = {
      id: 'athlete-1',
      name: 'Test Athlete',
      grade: 11,
      position: 'X',
      positionGroup: 'WR',
      usage: 'iron-man',
      secondaryPosition: 'Boundary Corner',
      secondaryPositionGroup: 'DB',
      heightIn: 72,
      weightLbs: 185,
      deploymentAssessment: {
        rosterNeed: 'rotation',
        coachMentalReadiness: 3,
        assignmentReliability: 78,
      },
      ironManPackage: {
        status: 'installing',
        formations: ['Doubles'],
        calls: ['Cloud', 'Sky'],
        secondarySnapCapPct: 25,
      },
    }
    const decoded = decodeCloudPosition(encodeCloudPosition(athlete))
    expect(decoded.deploymentAssessment?.rosterNeed).toBe('rotation')
    expect(decoded.ironManPackage?.calls).toEqual(['Cloud', 'Sky'])
    expect(decoded.ironManPackage?.secondarySnapCapPct).toBe(25)
  })
})
