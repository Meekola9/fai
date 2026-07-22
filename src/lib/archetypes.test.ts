import { describe, expect, it } from 'vitest'
import { ARCHETYPE_CATALOG, archetypeFor, type ArchetypeRole } from './archetypes'
import type { CategoryScores, ComputedSession, PositionGroup } from '../types'

const metricByCategory = {
  Speed: 'bestFly',
  Acceleration: 'best40',
  Jump: 'verticalJump',
  Power: 'broadJump',
  Pursuit: 'illinois',
  'Change of Direction': 'best20Shuttle',
  Conditioning: 'cond51015',
  Strength: 'benchRatio',
} as const

interface ResultOptions {
  weight?: number
  height?: number
  position?: string
}

function resultFor(
  group: PositionGroup,
  scores: Partial<CategoryScores>,
  options: ResultOptions = {},
): ComputedSession {
  const weight = options.weight ?? 185
  const height = options.height ?? 72
  const position = options.position ?? group
  const categories: CategoryScores = {
    Speed: 0,
    Acceleration: 0,
    Jump: 0,
    Power: 0,
    Pursuit: 0,
    'Change of Direction': 0,
    Conditioning: 0,
    Strength: 0,
    ...scores,
  }
  const normalized: Record<string, number | undefined> = {}
  for (const [category, value] of Object.entries(scores)) {
    normalized[metricByCategory[category as keyof typeof metricByCategory]] = value
  }
  const availableCount = Object.keys(scores).length
  const completionPct = Math.round((availableCount / 8) * 100)

  return {
    athlete: {
      id: 'athlete-1',
      name: 'Test Athlete',
      grade: 11,
      position,
      positionGroup: group,
      heightIn: height,
      weightLbs: weight,
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
      weightLbsSnapshot: weight,
    },
    metrics: {},
    normalized,
    categories,
    fai: 70,
    completionPct,
    scoreStatus:
      completionPct >= 100
        ? 'complete'
        : completionPct >= 60
          ? 'provisional'
          : 'insufficient',
  }
}

const coachNames = [
  'Field General',
  'Gunslinger',
  'Point Guard QB',
  'Escape Artist',
  'Bulldozer QB',
  'Raw Cannon',
  'Rhythm Passer',
  'Downhill Hammer',
  'One-Cut Slasher',
  'Satellite Back',
  'Bell Cow',
  'Jitterbug',
  'Battering Ram',
  'Track Star Convert',
  'Field Stretcher',
  'Chain Mover',
  'Big Body Boundary',
  'Route Technician',
  'Yards-After Menace',
  'Contested Catch Freak',
  'Straight Line Blur',
  'Gadget Weapon',
  'Move Piece',
  'In-Line Mauler',
  'Seam Buster',
  'Basketball Body',
  'Hybrid H-Back',
  'Anchor Tackle',
  'Road Grader',
  'Puller',
  'Pass Pro Technician',
  'Phone Booth Brawler',
  'Clay Frame',
  'Space Eater',
  'Gap Plugger',
  'Penetrator',
  'Bull Rusher',
  'Bend Specialist',
  'Two-Gapper',
  'Twitch Freak',
  'Motor Guy',
  'Speed Rusher',
  'Power Convert',
  'Set Edge Setter',
  'Length Freak',
  'Chase Athlete',
  'Downhill Thumper',
  'Sideline-to-Sideline',
  'Coverage Backer',
  'Green Dot',
  'Blitz Specialist',
  'Undersized Missile',
  'Press Bully',
  'Off-Man Mirror',
  'Ball Hawk',
  'Sticky Feet',
  'Long Strider',
  'Center Field Eraser',
  'Box Enforcer',
  'Nickel Chess Piece',
] as const

const completeProfile = {
  Speed: 82,
  Acceleration: 80,
  Jump: 74,
  Power: 72,
  Pursuit: 76,
  'Change of Direction': 78,
  Conditioning: 73,
  Strength: 65,
}

describe('player archetypes', () => {
  it('contains all 60 coach-supplied names exactly once', () => {
    const names = ARCHETYPE_CATALOG.map((archetype) => archetype.name)
    expect(new Set(coachNames).size).toBe(60)
    for (const name of coachNames) {
      expect(names.filter((candidate) => candidate === name)).toHaveLength(1)
    }
    expect(new Set(names).size).toBe(names.length)
  })

  it('keeps the requested count for every detailed football role', () => {
    const expected: Record<Exclude<ArchetypeRole, 'K/P'>, number> = {
      QB: 7,
      RB: 7,
      WR: 8,
      TE: 5,
      OL: 7,
      DL: 7,
      EDGE: 5,
      LB: 6,
      CB: 5,
      S: 3,
    }

    for (const [role, count] of Object.entries(expected)) {
      expect(ARCHETYPE_CATALOG.filter((archetype) => archetype.role === role)).toHaveLength(count)
    }
  })

  it('splits edge players from inside linebackers using the listed position', () => {
    const edge = archetypeFor(resultFor('LB', completeProfile, { position: 'OLB' }))
    const inside = archetypeFor(resultFor('LB', completeProfile, { position: 'MLB' }))

    expect(edge?.role).toBe('EDGE')
    expect(inside?.role).toBe('LB')
    expect(edge?.name).not.toBe(inside?.name)
  })

  it('splits corners from safeties inside the DB benchmark group', () => {
    const corner = archetypeFor(resultFor('DB', completeProfile, { position: 'CB' }))
    const safety = archetypeFor(resultFor('DB', completeProfile, { position: 'FS' }))

    expect(corner?.role).toBe('CB')
    expect(safety?.role).toBe('S')
    expect(corner?.name).not.toBe(safety?.name)
  })

  it('uses position when assigning the same athletic profile', () => {
    const receiver = archetypeFor(resultFor('WR', completeProfile, {
      position: 'WR',
      weight: 170,
    }))
    const corner = archetypeFor(resultFor('DB', completeProfile, {
      position: 'CB',
      weight: 170,
    }))

    expect(receiver?.positionGroup).toBe('WR')
    expect(receiver?.role).toBe('WR')
    expect(corner?.positionGroup).toBe('DB')
    expect(corner?.role).toBe('CB')
    expect(receiver?.name).not.toBe(corner?.name)
  })

  it('distinguishes speed-led and power-led running backs', () => {
    const speedBack = archetypeFor(resultFor('RB', {
      Speed: 96,
      Acceleration: 92,
      Power: 55,
      Jump: 50,
      'Change of Direction': 80,
      Strength: 48,
    }, { weight: 165, position: 'RB' }))
    const powerBack = archetypeFor(resultFor('RB', {
      Speed: 48,
      Acceleration: 74,
      Power: 94,
      Jump: 82,
      'Change of Direction': 55,
      Strength: 91,
    }, { weight: 205, position: 'RB' }))

    expect(speedBack?.name).not.toBe(powerBack?.name)
    expect(speedBack?.evidence[0]).toContain('Speed')
    expect(powerBack?.evidence[0]).toContain('Power')
  })

  it('does not let a light speed-skill athlete’s relative strength dominate the evidence', () => {
    const receiver = archetypeFor(resultFor('WR', {
      Speed: 82,
      Acceleration: 79,
      Jump: 70,
      Power: 68,
      'Change of Direction': 76,
      Strength: 100,
    }, { weight: 135, position: 'WR' }))

    expect(receiver?.evidence[0]).toContain('Speed')
    expect(receiver?.evidence.slice(0, 2).some((item) => item.startsWith('Strength'))).toBe(false)
  })

  it('uses Clay Frame for a developmental offensive-line profile', () => {
    const project = archetypeFor(resultFor('OL', {
      Speed: 22,
      Acceleration: 25,
      Jump: 20,
      Power: 28,
      Pursuit: 24,
      'Change of Direction': 23,
      Conditioning: 21,
      Strength: 27,
    }, { weight: 255, height: 77, position: 'OT' }))

    expect(project?.name).toBe('Clay Frame')
    expect(project?.role).toBe('OL')
  })

  it('lets ATH records borrow from their listed football positions', () => {
    const athlete = archetypeFor(resultFor('ATH', completeProfile, {
      position: 'WR/RB',
      weight: 172,
    }))

    expect(['WR', 'RB']).toContain(athlete?.role)
    expect(coachNames).toContain(athlete?.name as (typeof coachNames)[number])
  })

  it('retains a specialist fallback when no K/P names were supplied', () => {
    const specialist = archetypeFor(resultFor('K/P', completeProfile, {
      position: 'K/P',
      weight: 175,
    }))

    expect(specialist?.role).toBe('K/P')
    expect(specialist?.name).toBeTruthy()
  })

  it('marks sparse testing profiles as low confidence', () => {
    const archetype = archetypeFor(resultFor('ATH', { Acceleration: 80 }, {
      position: 'ATH',
    }))
    expect(archetype?.confidence).toBe('low')
  })
})
