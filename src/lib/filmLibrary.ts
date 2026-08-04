// ---------------------------------------------------------------------------
// FAI Film Library — joins each named archetype with its film teaching models
// (docs/archetype-film-model-library.md → archetypeFilmModels.ts) and provides
// search across position, archetype, player, school, league, trait, and play
// style. Powers the Library page and the athlete profile's "You play most
// similarly to…" panel.
// ---------------------------------------------------------------------------
import { ARCHETYPE_CATALOG } from './archetypes'
import { ARCHETYPE_FILM_MODELS, filmModelFor, type ArchetypeFilmModel } from '../data/archetypeFilmModels'
import type { Category, PositionGroup } from '../types'

export interface FilmLibraryEntry {
  archetypeId: string
  name: string
  group: PositionGroup
  role: string
  description: string
  primaryTraits: readonly Category[]
  film?: ArchetypeFilmModel
}

export const FILM_LIBRARY: readonly FilmLibraryEntry[] = ARCHETYPE_CATALOG.map((archetype) => ({
  archetypeId: archetype.id,
  name: archetype.name,
  group: archetype.group,
  role: archetype.role,
  description: archetype.description,
  primaryTraits: archetype.primary,
  film: filmModelFor(archetype.id),
}))

const ENTRY_BY_ID: ReadonlyMap<string, FilmLibraryEntry> = new Map(
  FILM_LIBRARY.map((entry) => [entry.archetypeId, entry] as const),
)

export function libraryEntryFor(archetypeId?: string): FilmLibraryEntry | undefined {
  return archetypeId ? ENTRY_BY_ID.get(archetypeId) : undefined
}

/** Everything a term can match against, lower-cased once. */
function haystack(entry: FilmLibraryEntry): string {
  return [
    entry.name,
    entry.group,
    entry.role,
    entry.description,
    entry.primaryTraits.join(' '),
    entry.film?.nfl ?? '',
    entry.film?.college ?? '',
    entry.film?.focus ?? '',
    entry.film ? 'nfl college pro' : '',
  ]
    .join(' ')
    .toLowerCase()
}

const HAYSTACKS: ReadonlyMap<string, string> = new Map(
  FILM_LIBRARY.map((entry) => [entry.archetypeId, haystack(entry)] as const),
)

/**
 * Case-insensitive AND search: every whitespace-separated term must appear
 * somewhere in the entry (position, archetype name, player, school, league,
 * trait, or play-style text). An empty query returns the whole library.
 */
export function searchFilmLibrary(query: string): FilmLibraryEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const matches = FILM_LIBRARY.filter((entry) => {
    if (terms.length === 0) return true
    const hay = HAYSTACKS.get(entry.archetypeId) ?? ''
    return terms.every((term) => hay.includes(term))
  })
  return [...matches].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
}

export { ARCHETYPE_FILM_MODELS }
