import { describe, expect, it } from 'vitest'
import type { CategoryScores, ComputedSession, PositionGroup } from '../types'
import { archetypeFor } from './archetypes'
import { normalizeAppData } from './events'

const categories: CategoryScores = {
  Speed: 88,
  Acceleration: 84,
  Jump: 78,
  Power: 76,
  Pursuit: 90,
  'Change of Direction': 86,
  Conditioning: 80,
  Strength: 72,
}

function resultFor(group: PositionGroup, position: string): ComputedSession {
  return {
    athlete: {
      id: 'athlete-1',
      name: 'Test Athlete',
      grade: 11,
      position,
      positionGroup: group,
      heightIn: 73,
      weightLbs: 195,
    },
    event: {
      id: 'season-2026',
      name: '2026',
      phase: 'Summer',
      startDate: '2026-01-01',
    },
    session: {
      id: 'session-1',
      athleteId: 'athlete-1',
      eventId: 'season-2026',
      date: '2026-07-01',
      phase: 'Summer',
      positionSnapshot: position,
      positionGroupSnapshot: group,
      weightLbsSnapshot: 195,
    },
    metrics: {},
    normalized: {
      bestFly: 88,
      best40: 84,
      verticalJump: 78,
      broadJump: 76,
      illinois: 90,
      best20Shuttle: 86,
      cond51015: 80,
      benchRatio: 72,
    },
    categories,
    fai: 82,
    completionPct: 100,
    scoreStatus: 'complete',
  }
}

describe('Star and Rover role corrections', () => {
  it('routes Star through the linebacker archetype family', () => {
    const archetype = archetypeFor(resultFor('LB', 'Star'))
    expect(archetype?.positionGroup).toBe('LB')
    expect(archetype?.role).toBe('LB')
  })

  it('routes Rover through the safety / big-nickel archetype family', () => {
    const archetype = archetypeFor(resultFor('DB', 'Rover'))
    expect(archetype?.positionGroup).toBe('DB')
    expect(archetype?.role).toBe('S')
  })

  it('repairs stale roster and testing groups when data loads', () => {
    const normalized = normalizeAppData({
      athletes: [
        {
          id: 'star',
          name: 'Star Athlete',
          grade: 11,
          position: 'Star',
          positionGroup: 'DB',
          heightIn: 74,
          weightLbs: 195,
        },
        {
          id: 'rover',
          name: 'Rover Athlete',
          grade: 11,
          position: 'Rover',
          positionGroup: 'LB',
          heightIn: 71,
          weightLbs: 190,
        },
      ],
      events: [
        {
          id: 'event-1',
          name: 'Summer 2026',
          phase: 'Summer',
          startDate: '2026-07-01',
        },
      ],
      sessions: [
        {
          id: 'star-session',
          athleteId: 'star',
          eventId: 'event-1',
          date: '2026-07-01',
          phase: 'Summer',
          positionSnapshot: 'Star',
          positionGroupSnapshot: 'DB',
        },
        {
          id: 'rover-session',
          athleteId: 'rover',
          eventId: 'event-1',
          date: '2026-07-01',
          phase: 'Summer',
          positionSnapshot: 'Rover',
          positionGroupSnapshot: 'LB',
        },
      ],
    })

    expect(normalized.athletes.find((athlete) => athlete.id === 'star')?.positionGroup).toBe('LB')
    expect(normalized.athletes.find((athlete) => athlete.id === 'rover')?.positionGroup).toBe('DB')
    expect(normalized.sessions.find((session) => session.id === 'star-session')?.positionGroupSnapshot).toBe('LB')
    expect(normalized.sessions.find((session) => session.id === 'rover-session')?.positionGroupSnapshot).toBe('DB')
  })
})
