import { describe, expect, it } from 'vitest'
import { ARCHETYPE_CATALOG } from './archetypes'
import { FILM_LIBRARY, libraryEntryFor, searchFilmLibrary } from './filmLibrary'
import { ARCHETYPE_FILM_MODELS } from '../data/archetypeFilmModels'

describe('film library', () => {
  it('covers every archetype and attaches a film model to each', () => {
    expect(FILM_LIBRARY.length).toBe(ARCHETYPE_CATALOG.length)
    for (const entry of FILM_LIBRARY) {
      expect(entry.film, `${entry.archetypeId} needs a film model`).toBeDefined()
    }
  })

  it('keeps film-model names in sync with the archetype catalog', () => {
    for (const archetype of ARCHETYPE_CATALOG) {
      expect(ARCHETYPE_FILM_MODELS[archetype.id]?.faiName).toBe(archetype.name)
    }
  })

  it('searches by player, school, position, and trait', () => {
    expect(searchFilmLibrary('Tyreek Hill').map((e) => e.archetypeId)).toContain('wr-field-stretcher')
    expect(searchFilmLibrary('Georgia').length).toBeGreaterThan(1) // school match across entries
    expect(searchFilmLibrary('QB').every((e) => e.group === 'QB')).toBe(true)
    expect(searchFilmLibrary('field general').map((e) => e.archetypeId)).toContain('qb-field-general')
  })

  it('requires every term to match (AND semantics) and handles empty query', () => {
    expect(searchFilmLibrary('').length).toBe(FILM_LIBRARY.length)
    // A player term plus a non-matching term returns nothing.
    expect(searchFilmLibrary('Tyreek zzzznope')).toEqual([])
  })

  it('looks up a single entry by archetype id', () => {
    expect(libraryEntryFor('rb-bell-cow')?.film?.nfl).toBe('Derrick Henry')
    expect(libraryEntryFor(undefined)).toBeUndefined()
    expect(libraryEntryFor('not-real')).toBeUndefined()
  })
})
