import { describe, expect, it } from 'vitest'
import { ARCHETYPE_CATALOG } from './archetypes'
import {
  ARCHETYPE_FILM_LIBRARY,
  filmModelForArchetype,
  searchArchetypeFilmLibrary,
} from './archetypeFilmLibrary'

describe('archetype film library', () => {
  it('covers every current FAI archetype id exactly once', () => {
    const catalogIds = ARCHETYPE_CATALOG.map((item) => item.id).sort()
    const libraryIds = ARCHETYPE_FILM_LIBRARY.map((item) => item.archetypeId).sort()
    expect(libraryIds).toEqual(catalogIds)
    expect(new Set(libraryIds).size).toBe(libraryIds.length)
  })

  it('preserves exact FAI display names', () => {
    for (const archetype of ARCHETYPE_CATALOG) {
      expect(filmModelForArchetype(archetype.id)?.faiName).toBe(archetype.name)
    }
  })

  it('searches by player, archetype, position, and study topic', () => {
    expect(searchArchetypeFilmLibrary({ query: 'Joe Burrow' }).map((item) => item.archetypeId)).toContain('qb-field-general')
    expect(searchArchetypeFilmLibrary({ positionGroup: 'CB' })).toHaveLength(5)
    expect(searchArchetypeFilmLibrary({ studyTopic: 'jam timing' }).map((item) => item.archetypeId)).toContain('cb-press-bully')
    expect(searchArchetypeFilmLibrary({ query: 'vertical phase' }).map((item) => item.archetypeId)).toContain('cb-long-strider')
  })

  it('keeps film claims coach-verified instead of pretending testing proves technique', () => {
    expect(ARCHETYPE_FILM_LIBRARY.every((item) => item.verified === false)).toBe(true)
  })
})
