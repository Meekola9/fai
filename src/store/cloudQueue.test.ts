import { describe, expect, it } from 'vitest'
import type { CloudMutation } from './cloudTypes'
import { coalesceMutations, overlayCloudQueue } from './cloudQueue'

function mutation(partial: Partial<CloudMutation> = {}): CloudMutation {
  return {
    id: partial.id ?? 'm1',
    teamId: partial.teamId ?? 'team-1',
    entity: partial.entity ?? 'athlete',
    operation: partial.operation ?? 'upsert',
    recordId: partial.recordId ?? 'a1',
    payload: partial.payload,
    expectedVersion: partial.expectedVersion ?? null,
    createdAt: partial.createdAt ?? 1,
    attempts: partial.attempts ?? 0,
  }
}

describe('cloud mutation queue', () => {
  it('keeps the newest mutation for one team/entity/record', () => {
    const first = mutation({ id: 'first', payload: { id: 'a1', name: 'Old', grade: 9, position: 'RB', positionGroup: 'RB', heightIn: 68, weightLbs: 170 }, createdAt: 1 })
    const second = mutation({ id: 'second', payload: { id: 'a1', name: 'New', grade: 10, position: 'RB', positionGroup: 'RB', heightIn: 69, weightLbs: 180 }, createdAt: 2 })
    const result = coalesceMutations([first, second])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('second')
  })

  it('does not coalesce records from different teams', () => {
    const result = coalesceMutations([
      mutation({ id: 'one', teamId: 'team-1' }),
      mutation({ id: 'two', teamId: 'team-2' }),
    ])
    expect(result).toHaveLength(2)
  })

  it('overlays queued upserts and deletes without changing other teams', () => {
    const base = {
      athletes: [
        { id: 'a1', name: 'Alpha', grade: 9, position: 'RB', positionGroup: 'RB' as const, heightIn: 68, weightLbs: 170 },
        { id: 'a2', name: 'Beta', grade: 10, position: 'WR', positionGroup: 'WR' as const, heightIn: 70, weightLbs: 180 },
      ],
      events: [],
      sessions: [],
    }
    const queue = [
      mutation({ id: 'delete', recordId: 'a1', operation: 'delete' }),
      mutation({ id: 'update', recordId: 'a2', payload: { ...base.athletes[1], name: 'Beta Updated' } }),
      mutation({ id: 'other-team', teamId: 'team-2', recordId: 'a3', payload: { id: 'a3', name: 'Other', grade: 9, position: 'QB', positionGroup: 'QB', heightIn: 72, weightLbs: 190 } }),
    ]
    const result = overlayCloudQueue(base, queue, 'team-1')
    expect(result.athletes.map((athlete) => athlete.id)).toEqual(['a2'])
    expect(result.athletes[0].name).toBe('Beta Updated')
  })
})
