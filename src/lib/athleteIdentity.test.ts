import { describe, expect, it } from 'vitest'
import type { AppData, Athlete } from '../types'
import { consolidateAthleteAliases } from './athleteIdentity'

function athlete(id: string, name: string): Athlete {
  return {
    id,
    name,
    grade: 10,
    position: 'ATH',
    positionGroup: 'ATH',
    heightIn: 70,
    weightLbs: 180,
  }
}

describe('consolidateAthleteAliases', () => {
  it('merges an abbreviated historical identity into the canonical full name', () => {
    const input: AppData = {
      athletes: [athlete('full', 'Jude Nelson'), athlete('short', 'J. Nelson')],
      events: [{ id: 'e1', name: 'Test', phase: 'Summer', startDate: '2024-06-01' }],
      sessions: [
        {
          id: 's1',
          athleteId: 'short',
          eventId: 'e1',
          date: '2024-06-01',
          phase: 'Summer',
          dash40_1: 4.6,
        },
      ],
    }

    const result = consolidateAthleteAliases(input)
    expect(result.athletes).toHaveLength(1)
    expect(result.athletes[0].name).toBe('Jude Nelson')
    expect(result.sessions[0].athleteId).toBe('full')
  })

  it('keeps ambiguous initial-and-last-name matches separate', () => {
    const input: AppData = {
      athletes: [
        athlete('john', 'John Smith'),
        athlete('james', 'James Smith'),
        athlete('initial', 'J. Smith'),
      ],
      events: [],
      sessions: [],
    }

    const result = consolidateAthleteAliases(input)
    expect(result.athletes).toHaveLength(3)
    expect(result.athletes.map((item) => item.name)).toContain('J. Smith')
  })

  it('keeps the coach-maintained roster record over historical snapshots', () => {
    const input: AppData = {
      athletes: [athlete('full', 'Logan Cross'), athlete('short', 'Lu. Cross')],
      events: [{ id: 'e1', name: 'Test', phase: 'Summer', startDate: '2025-06-01' }],
      sessions: [
        {
          id: 's1',
          athleteId: 'short',
          eventId: 'e1',
          date: '2025-06-01',
          phase: 'Summer',
          gradeSnapshot: 11,
          weightLbsSnapshot: 205,
          dash40_1: 4.8,
        },
      ],
    }

    const result = consolidateAthleteAliases(input)
    expect(result.athletes).toHaveLength(1)
    expect(result.athletes[0]).toMatchObject({ name: 'Logan Cross', grade: 10, weightLbs: 180 })
  })

  it('fills roster fields the canonical record is missing from the latest snapshot', () => {
    const input: AppData = {
      athletes: [{ ...athlete('full', 'Logan Cross'), grade: 0, weightLbs: 0 }],
      events: [{ id: 'e1', name: 'Test', phase: 'Summer', startDate: '2025-06-01' }],
      sessions: [
        {
          id: 's1',
          athleteId: 'full',
          eventId: 'e1',
          date: '2025-06-01',
          phase: 'Summer',
          gradeSnapshot: 11,
          weightLbsSnapshot: 205,
          dash40_1: 4.8,
        },
      ],
    }

    const result = consolidateAthleteAliases(input)
    expect(result.athletes[0]).toMatchObject({ grade: 11, weightLbs: 205 })
  })

  it('keeps an edited position over the previous alias-derived position', () => {
    const input: AppData = {
      athletes: [{ ...athlete('full', 'Logan Cross'), position: 'RB/LB', positionGroup: 'RB' }],
      events: [],
      sessions: [],
    }

    const result = consolidateAthleteAliases(input)
    expect(result.athletes[0]).toMatchObject({ position: 'RB/LB', positionGroup: 'RB' })
  })
})
