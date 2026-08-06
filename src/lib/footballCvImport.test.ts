import { describe, expect, it } from 'vitest'
import type { Athlete, FilmAnnotation } from '../types'
import {
  buildFootballCvPlayerTracks,
  defaultFootballCvSelection,
  footballCvTrackKey,
  footballCvUnitLimitErrors,
  mergeFootballCvPlayerTracks,
  parseFootballCvTrackingJson,
  suggestFootballCvAlignmentFrame,
  summarizeFootballCvTracks,
} from './footballCvImport'

const sample = {
  meta: {
    source: 'scrimmage.mp4',
    fps: 30,
    angle: 'sideline',
    createdWith: 'fai-football-cv v0.1',
  },
  frames: [
    {
      t: 0,
      players: [
        { trackId: 3, team: 'A', number: 7, img: { x: 0.42, y: 0.61 }, field: [33.5, 12] },
        { trackId: 8, team: 'B', number: null, img: { x: 0.72, y: 0.48 }, field: null },
      ],
    },
    {
      t: 0.1,
      players: [
        { trackId: 3, team: 'A', number: 7, img: { x: 0.44, y: 0.60 }, confidence: 0.86 },
        { trackId: 8, team: 'B', number: null, img: { x: 0.70, y: 0.49 } },
      ],
    },
    {
      t: 0.2,
      players: [
        { trackId: 3, team: 'A', number: 7, img: { x: 1.4, y: 0.5 } },
      ],
    },
  ],
}

const athlete: Athlete = {
  id: 'athlete-1',
  name: 'Mapped Athlete',
  grade: 11,
  position: 'X',
  positionGroup: 'WR',
  heightIn: 72,
  weightLbs: 180,
}

describe('Football CV tracking JSON parsing', () => {
  it('validates the notebook contract and ignores invalid samples', () => {
    const parsed = parseFootballCvTrackingJson(JSON.stringify(sample))
    expect(parsed.data.meta).toMatchObject({ fps: 30, angle: 'sideline' })
    expect(parsed.data.frames).toHaveLength(2)
    expect(parsed.rejectedSamples).toBe(1)
    expect(parsed.warnings.join(' ')).toContain('invalid player sample')
  })

  it('rejects files without valid normalized player samples', () => {
    expect(() => parseFootballCvTrackingJson({ frames: [{ t: 0, players: [] }] }))
      .toThrow('No valid player samples')
    expect(() => parseFootballCvTrackingJson('{broken')).toThrow('not valid JSON')
  })

  it('parses the player box and carries it into the track points', () => {
    const withBox = {
      frames: [{
        t: 0,
        players: [{ trackId: 5, team: 'A', img: { x: 0.5, y: 0.6 }, box: [0.45, 0.4, 0.55, 0.65] }],
      }],
    }
    const parsed = parseFootballCvTrackingJson(withBox)
    expect(parsed.data.frames[0].players[0].box).toEqual([0.45, 0.4, 0.55, 0.65])
    const summary = summarizeFootballCvTracks(parsed.data)[0]
    expect(summary.points[0].box).toEqual([0.45, 0.4, 0.55, 0.65])
  })
})

describe('Football CV track conversion', () => {
  it('groups frame records into timed player trails', () => {
    const parsed = parseFootballCvTrackingJson(sample)
    const summaries = summarizeFootballCvTracks(parsed.data)
    expect(summaries).toHaveLength(2)
    expect(summaries.find((track) => track.key === footballCvTrackKey('A', '3'))).toMatchObject({
      number: '7',
      pointCount: 2,
      firstTimeSec: 0,
      lastTimeSec: 0.1,
    })
  })

  it('chooses the longest eleven identities per team and suggests the earliest best-covered frame', () => {
    const parsed = parseFootballCvTrackingJson(sample)
    const summaries = summarizeFootballCvTracks(parsed.data)
    const selected = defaultFootballCvSelection(summaries)
    expect(selected.size).toBe(2)
    expect(suggestFootballCvAlignmentFrame(parsed.data, selected)).toEqual({
      timeSec: 0,
      visibleTracks: 2,
      selectedTracks: 2,
    })
  })

  it('requires explicit team and roster mapping while preserving editable auto points', () => {
    const parsed = parseFootballCvTrackingJson(sample)
    const summaries = summarizeFootballCvTracks(parsed.data)
    const tracks = buildFootballCvPlayerTracks({
      summaries,
      teamMappings: {
        A: { trackingTeam: 'ours', side: 'offense' },
        B: { trackingTeam: 'opponent', side: 'defense' },
      },
      trackOptions: {
        'A::3': { selected: true, athleteId: athlete.id, role: 'X' },
        'B::8': { selected: true, athleteId: athlete.id },
      },
      offsetSec: 12.5,
      athletes: [athlete],
    })

    expect(tracks).toHaveLength(2)
    expect(tracks[0]).toMatchObject({
      id: 'track-cv-a-3',
      athleteId: athlete.id,
      label: '#7',
      tracking: true,
      trackingTeam: 'ours',
      trackingSide: 'offense',
      formationRole: 'X',
      trackingComplete: true,
    })
    expect(tracks[0].points[0]).toMatchObject({ t: 12.5, source: 'auto' })
    expect(tracks[1].athleteId).toBeUndefined()
  })

  it('blocks more than eleven tracks in the same unit and replaces matching imports only', () => {
    const imported = Array.from({ length: 12 }, (_, index): FilmAnnotation => ({
      id: `track-cv-a-${index}`,
      kind: 'trail',
      tracking: true,
      trackingTeam: 'opponent',
      trackingSide: 'offense',
      points: [{ x: 0.1, y: 0.1, t: 0 }],
    }))
    expect(footballCvUnitLimitErrors(imported)[0]).toContain('supports 11')

    const drawing: FilmAnnotation = {
      id: 'manual-arrow',
      kind: 'arrow',
      points: [{ x: 0.2, y: 0.2 }],
    }
    const oldTrack: FilmAnnotation = { ...imported[0], points: [{ x: 0, y: 0, t: 0 }] }
    const merged = mergeFootballCvPlayerTracks([drawing, oldTrack], [imported[0]])
    expect(merged).toHaveLength(2)
    expect(merged.find((item) => item.id === 'manual-arrow')).toBeDefined()
    expect(merged.find((item) => item.id === imported[0].id)?.points[0].x).toBe(0.1)
  })
})
