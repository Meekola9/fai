import { describe, expect, it } from 'vitest'
import type { Athlete } from '../types'
import {
  athletePositionLine,
  decodeCloudPosition,
  encodeCloudPosition,
  positionGroupFor,
  positionOptionFor,
  usageLabel,
} from './positions'

describe('special football positions', () => {
  it.each([
    ['Mike', 'LB'],
    ['Will', 'LB'],
    ['Star', 'LB'],
    ['Boundary Corner', 'DB'],
    ['Field Corner', 'DB'],
    ['Rover', 'DB'],
    ['Jack', 'DL'],
    ['Badger', 'DB'],
    ['B Back', 'TE'],
    ['H', 'WR'],
  ] as const)('maps %s to the %s FAI group', (position, group) => {
    expect(positionGroupFor(position)).toBe(group)
  })

  it('defines Star as the fast, long overhang linebacker role', () => {
    expect(positionOptionFor('Star')).toMatchObject({
      group: 'LB',
      special: true,
    })
    expect(positionOptionFor('Star')?.description).toContain('Fast, long overhang linebacker')
  })

  it('defines Rover as the big-nickel defensive back role', () => {
    expect(positionOptionFor('Rover')).toMatchObject({
      group: 'DB',
      special: true,
    })
    expect(positionOptionFor('Rover')?.description).toContain('Big nickel defensive back')
  })
})

describe('two-way and Iron Man roster roles', () => {
  const athlete: Athlete = {
    id: 'athlete-1',
    name: 'Two Way Athlete',
    grade: 11,
    position: 'H',
    positionGroup: 'WR',
    usage: 'iron-man',
    secondaryPosition: 'Star',
    secondaryPositionGroup: 'LB',
    heightIn: 70,
    weightLbs: 175,
  }

  it('formats both roles for roster display', () => {
    expect(athletePositionLine(athlete)).toBe('H / Star')
    expect(usageLabel(athlete.usage)).toBe('Iron Man')
  })

  it('round-trips deployment metadata through the existing cloud position field', () => {
    const decoded = decodeCloudPosition(encodeCloudPosition(athlete))
    expect(decoded).toEqual({
      position: 'H',
      usage: 'iron-man',
      secondaryPosition: 'Star',
      secondaryPositionGroup: 'LB',
    })
  })

  it('repairs stale cloud metadata using the corrected position family', () => {
    const stale: Athlete = {
      ...athlete,
      secondaryPosition: 'Rover',
      secondaryPositionGroup: 'LB',
    }
    const decoded = decodeCloudPosition(encodeCloudPosition(stale))
    expect(decoded.secondaryPositionGroup).toBe('DB')
  })

  it('keeps one-way cloud positions human-readable', () => {
    expect(encodeCloudPosition({ ...athlete, usage: 'one-way', secondaryPosition: undefined })).toBe('H')
  })
})
