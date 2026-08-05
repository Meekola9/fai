import { describe, expect, it } from 'vitest'
import type { ChiefKingPlan } from '../types'
import { buildChiefKingPlaybook, planForOpponent } from './chiefToKing'

const base: ChiefKingPlan = {
  id: 'p1',
  opponent: 'Central',
  kingLabel: '#7 QB',
  kingPosition: 'qb',
  chiefs: [
    { id: 'c1', label: '#55 C', role: 'center' },
    { id: 'c2', label: '#3 slot', role: 'slot' },
  ],
  weakestChiefId: 'c2',
}

describe('chief-to-king playbook', () => {
  it('is complete with a King, Chiefs, and a weakest Chief, and names the attack', () => {
    const pb = buildChiefKingPlaybook(base)
    expect(pb.complete).toBe(true)
    expect(pb.missing).toEqual([])
    expect(pb.weakestChief).toBe('#3 slot (slot)')
    expect(pb.alertDetail).toMatch(/Attack #3 slot/)
    expect(pb.alertDetail).toMatch(/#7 QB/)
    // QB-specific play text is included
    expect(pb.positionPlay).toMatch(/weakest protector/)
    expect(pb.steps).toHaveLength(5)
  })

  it('uses the position-specific example for the King', () => {
    expect(buildChiefKingPlaybook({ ...base, kingPosition: 'mlb' }).positionPlay).toMatch(/overhang/)
    expect(buildChiefKingPlaybook({ ...base, kingPosition: 'de' }).positionPlay).toMatch(/trap, wham, or read/)
    expect(buildChiefKingPlaybook({ ...base, kingPosition: 'safety' }).positionPlay).toMatch(/shot behind him/)
  })

  it('reports what is missing when incomplete', () => {
    const noWeak = buildChiefKingPlaybook({ ...base, weakestChiefId: undefined })
    expect(noWeak.complete).toBe(false)
    expect(noWeak.missing).toContain('which Chief is weakest')
    expect(noWeak.alertDetail).toMatch(/still need/)

    const empty = buildChiefKingPlaybook({ ...base, kingLabel: '', chiefs: [], weakestChiefId: undefined })
    expect(empty.missing).toEqual(['the King', 'at least one Chief', 'which Chief is weakest'])
  })

  it('finds the plan for an opponent', () => {
    expect(planForOpponent([base], 'Central')?.id).toBe('p1')
    expect(planForOpponent([base], 'North')).toBeUndefined()
    expect(planForOpponent([base], undefined)).toBeUndefined()
  })
})
