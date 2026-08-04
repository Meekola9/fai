import { describe, expect, it } from 'vitest'
import type { FilmCatalogEntry, FilmPlay } from '../types'
import {
  buildTendencyReport,
  catalogLabelResolver,
  conceptOptionsForCall,
  formationOptions,
  personnelOptions,
} from './filmAnalysis'

const custom: FilmCatalogEntry[] = [
  { id: 'c1', kind: 'formation', key: 'diamond', label: 'Diamond' },
  { id: 'c2', kind: 'formation', key: 'trips', label: 'Trips (custom name)' }, // overrides a built-in label
  { id: 'c3', kind: 'personnel', key: '01', label: '01 (0 RB, 1 TE)' },
  { id: 'c4', kind: 'run_concept', key: 'gt_counter', label: 'GT Counter' },
  { id: 'c5', kind: 'pass_concept', key: 'dagger_switch', label: 'Dagger Switch' },
]

describe('custom film catalog merge', () => {
  it('appends custom formations and lets a custom entry override a built-in label', () => {
    const options = formationOptions(custom)
    expect(options.find((o) => o.key === 'diamond')?.label).toBe('Diamond')
    expect(options.find((o) => o.key === 'trips')?.label).toBe('Trips (custom name)')
    // No duplicate keys after merge.
    expect(new Set(options.map((o) => o.key)).size).toBe(options.length)
  })

  it('adds custom personnel groupings', () => {
    expect(personnelOptions(custom).map((o) => o.key)).toContain('01')
  })

  it('offers custom concepts by call, and both families on RPO', () => {
    expect(conceptOptionsForCall('run', custom).map((o) => o.key)).toContain('gt_counter')
    expect(conceptOptionsForCall('pass', custom).map((o) => o.key)).toContain('dagger_switch')
    expect(conceptOptionsForCall('run', custom).map((o) => o.key)).not.toContain('dagger_switch')
    const rpo = conceptOptionsForCall('rpo', custom).map((o) => o.key)
    expect(rpo).toEqual(expect.arrayContaining(['gt_counter', 'dagger_switch']))
    expect(conceptOptionsForCall(undefined, custom)).toEqual([])
  })

  it('resolves custom labels and falls back to built-ins', () => {
    const resolve = catalogLabelResolver(custom)
    expect(resolve('formation', 'diamond')).toBe('Diamond')
    expect(resolve('concept', 'gt_counter')).toBe('GT Counter')
    expect(resolve('formation', 'bunch')).toBe('Bunch') // built-in still works
    expect(resolve('formation', 'unknown_key')).toBe('unknown_key') // graceful fallback
  })

  it('shows custom formation names in the scouting report', () => {
    const plays: FilmPlay[] = [
      { id: 'p1', formation: 'diamond', call: 'run', concept: 'gt_counter', down: 1, distance: 10 },
      { id: 'p2', formation: 'diamond', call: 'run', concept: 'gt_counter', down: 2, distance: 4 },
    ]
    const report = buildTendencyReport(plays, {}, custom)
    expect(report.byFormation.find((g) => g.key === 'diamond')?.label).toBe('Diamond')
    const carrierConcept = report.byFormation
      .find((g) => g.key === 'diamond')
      ?.topConcepts.find((c) => c.key === 'gt_counter')
    expect(carrierConcept?.label).toBe('GT Counter')
  })
})
