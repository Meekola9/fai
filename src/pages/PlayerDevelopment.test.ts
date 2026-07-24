import { describe, expect, it } from 'vitest'
import { sectionFromLocation } from './PlayerDevelopment'

describe('player development routing', () => {
  it('opens the requested section from the combined development URL', () => {
    expect(sectionFromLocation('/development', '?section=badges')).toBe('badges')
    expect(sectionFromLocation('/development', '?section=vertical')).toBe('vertical')
    expect(sectionFromLocation('/development', '?section=archetypes')).toBe('archetypes')
  })

  it('preserves legacy archetype, badge, and vertical URLs', () => {
    expect(sectionFromLocation('/archetypes', '')).toBe('archetypes')
    expect(sectionFromLocation('/badges', '')).toBe('badges')
    expect(sectionFromLocation('/vertical', '')).toBe('vertical')
  })

  it('defaults invalid or missing sections to archetypes', () => {
    expect(sectionFromLocation('/development', '')).toBe('archetypes')
    expect(sectionFromLocation('/development', '?section=unknown')).toBe('archetypes')
  })
})
