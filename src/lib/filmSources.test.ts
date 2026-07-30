import { describe, expect, it } from 'vitest'
import type { FilmPlay, FilmSource } from '../types'
import { normalizeAppData } from './events'
import { consolidateAthleteAliases } from './athleteIdentity'

const source: FilmSource = { id: 'src-1', label: 'vs Central', kind: 'game' }
const play: FilmPlay = {
  id: 'film-1',
  filmSourceId: 'src-1',
  startTimeSec: 42.5,
  endTimeSec: 50,
  formation: 'trips',
  call: 'run',
}

describe('full-film workflow data model', () => {
  it('normalizeAppData carries film sources and per-play clip ranges', () => {
    const data = normalizeAppData({
      athletes: [],
      sessions: [],
      filmPlays: [play],
      filmSources: [source],
    })
    expect(data.filmSources).toEqual([source])
    expect(data.filmPlays[0]).toMatchObject({ filmSourceId: 'src-1', startTimeSec: 42.5, endTimeSec: 50 })
  })

  it('defaults film sources to an empty list for legacy data', () => {
    const data = normalizeAppData({ athletes: [], sessions: [] })
    expect(data.filmSources).toEqual([])
  })

  it('alias consolidation preserves sources and clip ranges on every mutation', () => {
    const data = consolidateAthleteAliases({
      athletes: [],
      sessions: [],
      filmPlays: [play],
      filmSources: [source],
    })
    expect(data.filmSources).toEqual([source])
    expect(data.filmPlays[0]).toMatchObject({ filmSourceId: 'src-1', startTimeSec: 42.5, endTimeSec: 50 })
  })
})
