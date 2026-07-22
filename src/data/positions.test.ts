import { describe, expect, it } from 'vitest'
import type { Athlete } from '../types'
import {
  athletePositionLine,
  decodeCloudPosition,
  encodeCloudPosition,
  positionGroupFor,
  usageLabel,
} from './positions'

describe('special football positions', () => {
  it.each([
    ['Mike', 'LB'],
    ['Will', 'LB'],
    ['Star', 'DB'],
    ['Boundary Corner', 'DB'],
    ['Field Corner', 'DB'],
    ['Rover', 'LB'],
    ['Jack', 'DL'],
    ['Badger', 'DB'],
    ['B Back', 'TE'],
    ['H', 'WR'],
  ] as const)('maps %s to the %s FAI group', (position, group) => {
    expect(positionGroupFor(position)).toBe(group)
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
    secondaryPositionGroup: 'DB',
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
      secondaryPositionGroup: 'DB',
    })
  })

  it('keeps one-way cloud positions human-readable', () => {
    expect(encodeCloudPosition({ ...athlete, usage: 'one-way', secondaryPosition: undefined })).toBe('H')
  })
})
