import { describe, expect, it } from 'vitest'
import type { Athlete } from '../types'
import {
  deriveGameImpactCandidates,
  detectGameImpactColumns,
  matchRosterAthlete,
} from './gameImpactImport'

const HEADER =
  'PLAY #,ODK,DN,DIST,HASH,YARD LN,PLAY TYPE,RESULT,GN/LS,OFF FORM,OFF PLAY,DEF FRONT,COVERAGE,BLITZ,QTR,RUSHER_Jersey,RUSHER_Name,PASSER_Jersey,PASSER_Name,RECEIVER_Jersey,RECEIVER_Name,KICKER_Jersey,KICKER_Name'

function athlete(id: string, name: string): Athlete {
  return { id, name, grade: 11, position: 'ATH', positionGroup: 'ATH', heightIn: 70, weightLbs: 180 }
}

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join('\n')
}

describe('detectGameImpactColumns', () => {
  it('maps the real Hudl playlist header', () => {
    const columns = detectGameImpactColumns(HEADER.split(','))
    expect(columns.odk).toBe('ODK')
    expect(columns.result).toBe('RESULT')
    expect(columns.gain).toBe('GN/LS')
    expect(columns.rusherName).toBe('RUSHER_Name')
    expect(columns.receiverName).toBe('RECEIVER_Name')
    expect(columns.passerName).toBe('PASSER_Name')
  })
})

describe('deriveGameImpactCandidates — event detection', () => {
  it('detects an offensive passing touchdown', () => {
    const { candidates } = deriveGameImpactCandidates(csv('26,O,3,6,L,6,Pass,"Complete, TD",6'), [])
    const td = candidates.find((c) => c.typeKey === 'touchdown')
    expect(td).toBeDefined()
    expect(td!.role).toBe('receiver')
    expect(td!.points).toBe(5)
    expect(td!.category).toBe('playmaker')
  })

  it('detects an explosion play from a 20+ gain', () => {
    const passExplosion = deriveGameImpactCandidates(csv('4,O,1,10,M,45,Pass,Complete,29'), [])
    expect(passExplosion.candidates.find((c) => c.typeKey === 'explosion')?.role).toBe('receiver')
    const runExplosion = deriveGameImpactCandidates(csv('22,O,1,10,,-44,Run,Rush,53'), [])
    expect(runExplosion.candidates.find((c) => c.typeKey === 'explosion')?.role).toBe('rusher')
  })

  it('detects an interception thrown and a dropped pass as offensive negatives', () => {
    const int = deriveGameImpactCandidates(csv('12,O,3,3,L,-37,Pass,Interception,-7'), [])
    expect(int.candidates.find((c) => c.typeKey === 'interception_thrown')?.points).toBe(-3)
    const drop = deriveGameImpactCandidates(csv('16,O,2,6,L,-44,Pass,Dropped,0'), [])
    expect(drop.candidates.find((c) => c.typeKey === 'dropped_pass')?.role).toBe('receiver')
  })

  it('credits a defensive TFL when the opponent rush loses yards', () => {
    const { candidates } = deriveGameImpactCandidates(csv('48,D,2,1,,27,Run,Rush,-7'), [])
    const tfl = candidates.find((c) => c.typeKey === 'tfl')
    expect(tfl).toBeDefined()
    expect(tfl!.role).toBe('defender')
    expect(tfl!.category).toBe('havoc')
  })

  it('does NOT credit our players when the opponent scores on defense', () => {
    // ODK=D "Rush, TD" is a touchdown ALLOWED — never our playmaker/havoc.
    const { candidates } = deriveGameImpactCandidates(csv('40,D,1,6,,6,Run,"Rush, TD",6'), [])
    expect(candidates).toHaveLength(0)
  })

  it('skips rows with no unit or no result', () => {
    const { candidates, playsScanned } = deriveGameImpactCandidates(csv('68,,,,,,,,'), [])
    expect(candidates).toHaveLength(0)
    expect(playsScanned).toBe(0)
  })
})

describe('deriveGameImpactCandidates — roster matching (guardrail)', () => {
  const roster = [athlete('a1', 'Keanu Crump'), athlete('a2', 'Kenan Crump')]

  it('leaves every event unassigned when the export tags no players', () => {
    const { candidates, autoMatched } = deriveGameImpactCandidates(
      csv('26,O,3,6,L,6,Pass,"Complete, TD",6'),
      roster,
    )
    expect(autoMatched).toBe(0)
    expect(candidates[0].matchedAthleteId).toBeUndefined()
    expect(candidates[0].ambiguous).toBe(false)
  })

  it('matches an exact tagged name to the roster', () => {
    const row = '26,O,3,6,L,6,Pass,"Complete, TD",6,,,,,,,,,,,,Keanu Crump,,'
    const { candidates, autoMatched } = deriveGameImpactCandidates(csv(row), roster)
    expect(autoMatched).toBe(1)
    expect(candidates[0].matchedAthleteId).toBe('a1')
  })

  it('never guesses between look-alike names', () => {
    // A last-name-only tag must not resolve to either Crump.
    expect(matchRosterAthlete('Crump', roster)).toEqual({ ambiguous: false })
    // An exact duplicate name is flagged ambiguous, not auto-picked.
    const dupes = [athlete('a1', 'Sam Lee'), athlete('a2', 'Sam Lee')]
    expect(matchRosterAthlete('Sam Lee', dupes)).toEqual({ ambiguous: true })
  })
})
