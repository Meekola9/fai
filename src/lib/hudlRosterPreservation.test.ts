import { describe, expect, it } from 'vitest'
import type { AppData, FilmPlay } from '../types'

function appendFilms(current: Required<AppData>, films: FilmPlay[]): Required<AppData> {
  const existingIds = new Set(current.filmPlays.map((film) => film.id))
  return {
    ...current,
    filmPlays: [...current.filmPlays, ...films.filter((film) => !existingIds.has(film.id))],
  }
}

describe('Hudl batch film import', () => {
  it('preserves the complete roster and every non-film dataset', () => {
    const current: Required<AppData> = {
      athletes: [{ id: 'athlete-1', name: 'Player One', grade: 11, position: 'WR', positionGroup: 'WR', heightIn: 70, weightLbs: 170 }],
      events: [{ id: 'event-1', name: 'Testing', phase: 'Summer', startDate: '2026-07-01', status: 'open' }],
      sessions: [],
      plays: [],
      filmPlays: [],
      filmSources: [],
      awarenessResults: [],
    }
    const incoming: FilmPlay[] = [{ id: 'film-1', formation: 'trips' }]
    const next = appendFilms(current, incoming)

    expect(next.athletes).toEqual(current.athletes)
    expect(next.events).toEqual(current.events)
    expect(next.sessions).toEqual(current.sessions)
    expect(next.plays).toEqual(current.plays)
    expect(next.awarenessResults).toEqual(current.awarenessResults)
    expect(next.filmPlays).toEqual(incoming)
  })
})
