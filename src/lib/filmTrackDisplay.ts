import type { FilmAnnotation } from '../types'
import { isPlayerTrack } from './filmTracking'

export interface FilmTrackDisplayOptions {
  activeTrackId?: string
  focusActiveTrack?: boolean
}

/**
 * Resolve the player tracks that should be rendered on the Film Room stage.
 * Auto-follow uses focused mode so unrelated player dots, labels, and trails do
 * not obscure the selected athlete. Coaches can still opt into the full unit
 * view for formation diagnostics.
 */
export function tracksForFilmStage(
  annotations: readonly FilmAnnotation[],
  options: FilmTrackDisplayOptions = {},
): FilmAnnotation[] {
  const tracks = annotations.filter(isPlayerTrack)
  if (!options.focusActiveTrack || !options.activeTrackId) return tracks
  return tracks.filter((track) => track.id === options.activeTrackId)
}

export function shouldShowTrackLabel(
  track: Pick<FilmAnnotation, 'id' | 'label'>,
  options: FilmTrackDisplayOptions = {},
): boolean {
  if (!track.label?.trim()) return false
  if (!options.focusActiveTrack || !options.activeTrackId) return true
  return track.id === options.activeTrackId
}
