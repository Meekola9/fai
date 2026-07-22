import { describe, expect, it } from 'vitest'
import { PLAYER_BADGE_CATALOG } from './badges'
import { BADGE_ART, BADGE_ART_IDS } from './badgeArt'

describe('custom player badge artwork', () => {
  it('provides a unique vector design for every badge in the catalog', () => {
    const catalogIds = PLAYER_BADGE_CATALOG.map((badge) => badge.id).sort()
    const artworkIds = [...BADGE_ART_IDS].sort()

    expect(artworkIds).toEqual(catalogIds)
    expect(new Set(artworkIds).size).toBe(artworkIds.length)
  })

  it('uses drawable vector instructions rather than emoji artwork', () => {
    for (const badge of PLAYER_BADGE_CATALOG) {
      const art = BADGE_ART[badge.id]
      const drawableCount =
        (art.paths?.length ?? 0)
        + (art.lines?.length ?? 0)
        + (art.circles?.length ?? 0)
        + (art.text ? 1 : 0)

      expect(drawableCount, `${badge.name} needs custom vector artwork`).toBeGreaterThan(0)
      expect(art.group).toBe(badge.group)
    }
  })
})
