import { describe, expect, it } from 'vitest'
import type { Athlete, FilmPlay } from '../types'
import {
  deploymentFlagsFor,
  deploymentStatusFor,
  positionSideForGroup,
  trackedDeploymentUsage,
} from './deploymentBoard'
import { recommendDeployment } from './deploymentRecommendation'

const athlete: Athlete = {
  id: 'athlete-1',
  name: 'Board Athlete',
  grade: 11,
  position: 'X',
  positionGroup: 'WR',
  usage: 'iron-man',
  secondaryPosition: 'Boundary Corner',
  secondaryPositionGroup: 'DB',
  heightIn: 72,
  weightLbs: 185,
  ironManPackage: {
    status: 'ready',
    formations: ['Doubles'],
    calls: ['Cloud', 'Sky'],
    secondarySnapCapPct: 30,
    reviewDate: '2026-08-20',
  },
}

function play(id: string, side: FilmPlay['side']): FilmPlay {
  return {
    id,
    side,
    annotations: [{
      id: `track-${id}`,
      kind: 'trail',
      athleteId: athlete.id,
      points: [{ x: 0.4, y: 0.5 }],
    }],
  }
}

describe('deployment board usage tracking', () => {
  it('maps position groups to their side of the ball', () => {
    expect(positionSideForGroup('WR')).toBe('offense')
    expect(positionSideForGroup('DB')).toBe('defense')
    expect(positionSideForGroup('K/P')).toBe('special')
    expect(positionSideForGroup('ATH')).toBeUndefined()
  })

  it('counts distinct tracked film snaps and calculates secondary usage', () => {
    const usage = trackedDeploymentUsage(athlete, [
      play('1', 'offense'),
      play('2', 'defense'),
      play('3', 'defense'),
      play('4', 'defense'),
    ])
    expect(usage.primarySnaps).toBe(1)
    expect(usage.secondarySnaps).toBe(3)
    expect(usage.totalTrackedSnaps).toBe(4)
    expect(usage.secondaryPct).toBe(75)
  })

  it('does not invent a split when both positions are on the same side', () => {
    const usage = trackedDeploymentUsage({
      ...athlete,
      secondaryPosition: 'Slot WR',
      secondaryPositionGroup: 'WR',
    }, [play('1', 'offense')])
    expect(usage.sameSideRoles).toBe(true)
    expect(usage.secondaryPct).toBeUndefined()
  })
})

describe('deployment board flags', () => {
  it('marks over-cap Iron Man usage as action required', () => {
    const recommendation = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 78,
      secondaryScore: 72,
      awarenessScore: 76,
      rosterNeed: 'rotation',
      coachMentalReadiness: 3,
      assignmentReliability: 74,
    })
    const flags = deploymentFlagsFor({
      activeUsage: 'iron-man',
      recommendation,
      ironManPackage: athlete.ironManPackage,
      trackedUsage: {
        primarySnaps: 1,
        secondarySnaps: 3,
        totalTrackedSnaps: 4,
        secondaryPct: 75,
        sameSideRoles: false,
      },
      todayIso: '2026-08-03',
    })
    expect(flags).toContain('over-secondary-cap')
    expect(deploymentStatusFor(flags)).toBe('action')
  })

  it('flags due reviews and incomplete packages without changing the athlete role', () => {
    const recommendation = recommendDeployment({
      hasSecondaryPosition: true,
      primaryScore: 76,
      secondaryScore: 70,
      rosterNeed: 'rotation',
      coachMentalReadiness: 3,
      assignmentReliability: 73,
    })
    const flags = deploymentFlagsFor({
      activeUsage: 'iron-man',
      recommendation,
      ironManPackage: {
        status: 'installing',
        formations: [],
        calls: [],
        secondarySnapCapPct: 30,
        reviewDate: '2026-08-01',
      },
      trackedUsage: {
        primarySnaps: 0,
        secondarySnaps: 0,
        totalTrackedSnaps: 0,
        sameSideRoles: false,
      },
      todayIso: '2026-08-03',
    })
    expect(flags).toContain('review-due')
    expect(flags).toContain('package-incomplete')
  })
})
