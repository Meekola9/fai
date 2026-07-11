import { describe, expect, it } from 'vitest'
import type { AppData } from '../types'
import { exportCsv, importCsv } from './csv'

const data: AppData = {
  athletes: [
    {
      id: 'athlete-1',
      name: 'Untested Athlete',
      grade: 10,
      position: 'ATH',
      positionGroup: 'ATH',
      heightIn: 70,
      weightLbs: 175,
    },
  ],
  events: [
    {
      id: 'event-1',
      name: 'Baseline Combine',
      phase: 'Baseline',
      startDate: '2026-02-01',
    },
  ],
  sessions: [],
}

describe('CSV backup and restore', () => {
  it('preserves athletes who have no testing sessions', () => {
    const restored = importCsv(exportCsv(data))
    expect(restored.athletes).toHaveLength(1)
    expect(restored.athletes[0].name).toBe('Untested Athlete')
    expect(restored.events).toHaveLength(1)
    expect(restored.sessions).toHaveLength(0)
  })

  it('rejects empty or malformed replacement files', () => {
    expect(() => importCsv('Name')).toThrow()
    expect(() => importCsv('foo,bar\none,two')).toThrow()
  })

  it('uses ATH instead of silently assigning unknown positions to RB', () => {
    const imported = importCsv('Name,Grade,Position\nJordan Example,11,SUPERBACK')
    expect(imported.athletes[0].positionGroup).toBe('ATH')
  })

  it('round-trips quoted commas safely', () => {
    const source: AppData = {
      athletes: [{ ...data.athletes[0], name: 'Kemp, Jr.' }],
      events: data.events,
      sessions: [],
    }
    const restored = importCsv(exportCsv(source))
    expect(restored.athletes[0].name).toBe('Kemp, Jr.')
  })
})
