import { describe, expect, it } from 'vitest'
import type { FilmAnnotation } from '../types'
import { shouldShowTrackLabel, tracksForFilmStage } from './filmTrackDisplay'

const playerTrack = (id: string, label: string): FilmAnnotation => ({
  id,
  kind: 'trail',
  tracking: true,
  label,
  points: [],
})

const drawing: FilmAnnotation = {
  id: 'route-drawing',
  kind: 'route',
  points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }],
}

describe('film track display policy', () => {
  it('shows the complete tracked unit outside focused auto-follow', () => {
    const annotations = [playerTrack('one', 'Player 1'), drawing, playerTrack('two', 'Player 2')]
    expect(tracksForFilmStage(annotations).map((track) => track.id)).toEqual(['one', 'two'])
  })

  it('renders only the locked athlete in focused auto-follow', () => {
    const annotations = [playerTrack('one', 'Player 1'), playerTrack('two', 'Player 2')]
    expect(tracksForFilmStage(annotations, { activeTrackId: 'two', focusActiveTrack: true }))
      .toEqual([annotations[1]])
  })

  it('keeps the full unit visible when focused mode lacks a selected track', () => {
    const annotations = [playerTrack('one', 'Player 1'), playerTrack('two', 'Player 2')]
    expect(tracksForFilmStage(annotations, { focusActiveTrack: true })).toHaveLength(2)
  })

  it('hides unrelated labels while focused on one athlete', () => {
    const options = { activeTrackId: 'one', focusActiveTrack: true }
    expect(shouldShowTrackLabel(playerTrack('one', 'Player 1'), options)).toBe(true)
    expect(shouldShowTrackLabel(playerTrack('two', 'Player 2'), options)).toBe(false)
  })
})
