import { describe, expect, it } from 'vitest'
import { developmentSectionFromLocation } from '../lib/playerDevelopment'

describe('player development routing', () => {
  it('opens the requested section from the combined development URL', () => {
    expect(developmentSectionFromLocation('/development', '?section=badges')).toBe('badges')
    expect(developmentSectionFromLocation('/development', '?section=vertical')).toBe('vertical')
    expect(developmentSectionFromLocation('/development', '?section=archetypes')).toBe('archetypes')
  })

  it('preserves legacy archetype, badge, and vertical URLs', () => {
    expect(developmentSectionFromLocation('/archetypes', '')).toBe('archetypes')
    expect(developmentSectionFromLocation('/badges', '')).toBe('badges')
    expect(developmentSectionFromLocation('/vertical', '')).toBe('vertical')
  })

  it('defaults invalid or missing sections to archetypes', () => {
    expect(developmentSectionFromLocation('/development', '')).toBe('archetypes')
    expect(developmentSectionFromLocation('/development', '?section=unknown')).toBe('archetypes')
  })
})
