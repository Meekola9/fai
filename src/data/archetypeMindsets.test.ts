import { describe, expect, it } from 'vitest'
import { ARCHETYPE_CATALOG } from '../lib/archetypes'
import { ARCHETYPE_MINDSET_GUIDE } from './archetypeMindsets'

describe('archetype mindset and usage guide', () => {
  it('covers every archetype currently exposed by FAI', () => {
    const catalogIds = ARCHETYPE_CATALOG.map((archetype) => archetype.id).sort()
    const guideIds = Object.keys(ARCHETYPE_MINDSET_GUIDE).sort()

    expect(guideIds).toEqual(catalogIds)
  })

  it('provides substantive mindset and on-field usage language for every entry', () => {
    for (const archetype of ARCHETYPE_CATALOG) {
      const guide = ARCHETYPE_MINDSET_GUIDE[archetype.id]
      expect(guide).toBeDefined()
      expect(guide.mindset.length).toBeGreaterThan(70)
      expect(guide.onFieldUse.length).toBeGreaterThan(70)
    }
  })
})
