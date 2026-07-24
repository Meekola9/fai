import { describe, expect, it } from 'vitest'
import {
  autoMapHudlColumns,
  buildHudlImportPreview,
  clipNumberFromName,
  formationSpots,
  naturalClipSort,
  parseHudlTable,
} from './hudlImport'

describe('Hudl import', () => {
  it('parses quoted CSV rows without shifting columns', () => {
    const table = parseHudlTable(
      'PLAY #,ODK,OFF FORM,OFF PLAY,NOTES\n1,O,Trips,"Inside Zone, Read","Boundary, check"\n2,D,Doubles,Pass,"Two-high"',
    )

    expect(table.headers).toEqual(['PLAY #', 'ODK', 'OFF FORM', 'OFF PLAY', 'NOTES'])
    expect(table.rows).toHaveLength(2)
    expect(table.rows[0].NOTES).toBe('Boundary, check')
    expect(table.rows[0]['OFF PLAY']).toBe('Inside Zone, Read')
  })

  it('detects tab-delimited Hudl exports and maps common columns', () => {
    const table = parseHudlTable(
      'PLAY #\tODK\tOFF FORM\tOFF PLAY\tPLAY TYPE\tDN\tDIST\tYD LINE\tGN/LS\n1\tO\tTrips\tInside Zone\tRun\t1\t10\tOWN 35\t6',
    )
    const mapping = autoMapHudlColumns(table.headers)

    expect(table.delimiter).toBe('\t')
    expect(mapping.clip).toBe('PLAY #')
    expect(mapping.side).toBe('ODK')
    expect(mapping.formation).toBe('OFF FORM')
    expect(mapping.concept).toBe('OFF PLAY')
    expect(mapping.call).toBe('PLAY TYPE')
    expect(mapping.gain).toBe('GN/LS')
  })

  it('pairs numbered rows to naturally sorted clip files', () => {
    const clips = naturalClipSort([
      { name: 'play_10.mp4' },
      { name: 'play_2.mp4' },
      { name: 'play_1.mp4' },
    ])
    expect(clips.map((clip) => clip.name)).toEqual(['play_1.mp4', 'play_2.mp4', 'play_10.mp4'])
    expect(clipNumberFromName('game-play-018.mp4')).toBe(18)

    const table = parseHudlTable(
      'PLAY #,ODK,OFF FORM,OFF PLAY,PLAY TYPE,DN,DIST,YD LINE,HASH,GN/LS\n2,O,Trips,Inside Zone,Run,1,10,OWN 35,L,6\n10,O,Doubles,Four Verticals,Pass,2,4,OPP 40,R,18',
    )
    const preview = buildHudlImportPreview(
      table,
      autoMapHudlColumns(table.headers),
      { opponent: 'Central', date: '2026-09-04', sourceUrl: 'https://www.hudl.com/video/example' },
      clips,
    )

    expect(preview[0].clip?.name).toBe('play_2.mp4')
    expect(preview[1].clip?.name).toBe('play_10.mp4')
    expect(preview[0].play.side).toBe('offense')
    expect(preview[0].play.formation).toBe('trips')
    expect(preview[0].play.call).toBe('run')
    expect(preview[0].play.concept).toBe('inside_zone')
    expect(preview[0].play.yardLine).toBe(35)
    expect(preview[1].play.yardLine).toBe(60)
    expect(preview[1].play.note).toContain('Source: https://www.hudl.com/video/example')
  })

  it('creates eleven-player formation templates', () => {
    const trips = formationSpots('trips', '11')
    const doubles = formationSpots('doubles', '11')
    const empty = formationSpots('empty', '00')

    expect(trips).toHaveLength(11)
    expect(doubles).toHaveLength(11)
    expect(empty).toHaveLength(11)
    expect(trips.filter((spot) => spot.x > 65 && !['rt'].includes(spot.id)).length).toBeGreaterThanOrEqual(3)
  })
})
