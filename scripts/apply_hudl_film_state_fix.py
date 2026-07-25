from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


film_filters = r'''import type { Athlete, FilmPlay, PlayCall, PlaySide, PositionGroup } from '../types'

export type FilmRoomSort = 'newest' | 'oldest' | 'gain-high' | 'gain-low'

export interface FilmRoomFilters {
  opponent: string
  side: '' | PlaySide
  formation: string
  personnel: string
  call: '' | PlayCall
  result: string
  group: '' | PositionGroup
  position: string
  athleteId: string
  sort: FilmRoomSort
}

export const EMPTY_FILM_ROOM_FILTERS: FilmRoomFilters = {
  opponent: '',
  side: '',
  formation: '',
  personnel: '',
  call: '',
  result: '',
  group: '',
  position: '',
  athleteId: '',
  sort: 'newest',
}

export function athleteMatchesFilmPositionFilters(
  athlete: Athlete,
  group: FilmRoomFilters['group'],
  position: string,
): boolean {
  if (
    group
    && athlete.positionGroup !== group
    && athlete.secondaryPositionGroup !== group
  ) return false

  const query = position.trim().toLowerCase()
  if (!query) return true
  const searchable = `${athlete.position} ${athlete.secondaryPosition ?? ''}`.toLowerCase()
  return searchable.includes(query)
}

export function filterRosterForFilm(
  athletes: Athlete[],
  filters: Pick<FilmRoomFilters, 'group' | 'position'>,
): Athlete[] {
  return athletes.filter((athlete) =>
    athleteMatchesFilmPositionFilters(athlete, filters.group, filters.position),
  )
}

export function filmPlayAthleteIds(play: FilmPlay): string[] {
  const ids = new Set<string>()
  if (play.ballCarrierId) ids.add(play.ballCarrierId)
  if (play.targetId) ids.add(play.targetId)
  for (const annotation of play.annotations ?? []) {
    if (annotation.athleteId) ids.add(annotation.athleteId)
  }
  return [...ids]
}

function dateKey(play: FilmPlay): string {
  return `${play.date ?? ''}|${play.createdAt ?? ''}`
}

function gainValue(play: FilmPlay): number {
  return typeof play.gain === 'number' && Number.isFinite(play.gain)
    ? play.gain
    : Number.NEGATIVE_INFINITY
}

export function filterFilmPlays(
  plays: FilmPlay[],
  athletes: Athlete[],
  filters: FilmRoomFilters,
): FilmPlay[] {
  const eligibleAthleteIds = new Set(
    filterRosterForFilm(athletes, filters).map((athlete) => athlete.id),
  )
  const resultQuery = filters.result.trim().toLowerCase()
  const needsPositionMatch = Boolean(filters.group || filters.position.trim())

  const filtered = plays.filter((play) => {
    if (filters.opponent && (play.opponent ?? '') !== filters.opponent) return false
    if (filters.side && (play.side ?? 'offense') !== filters.side) return false
    if (filters.formation && (play.formation ?? '') !== filters.formation) return false
    if (filters.personnel && (play.personnel ?? '') !== filters.personnel) return false
    if (filters.call && (play.call ?? '') !== filters.call) return false
    if (resultQuery && !(play.result ?? '').toLowerCase().includes(resultQuery)) return false

    const playAthleteIds = filmPlayAthleteIds(play)
    if (filters.athleteId && !playAthleteIds.includes(filters.athleteId)) return false
    if (
      needsPositionMatch
      && !playAthleteIds.some((athleteId) => eligibleAthleteIds.has(athleteId))
    ) return false
    return true
  })

  return [...filtered].sort((a, b) => {
    if (filters.sort === 'oldest') return dateKey(a).localeCompare(dateKey(b))
    if (filters.sort === 'gain-high') return gainValue(b) - gainValue(a) || dateKey(b).localeCompare(dateKey(a))
    if (filters.sort === 'gain-low') return gainValue(a) - gainValue(b) || dateKey(b).localeCompare(dateKey(a))
    return dateKey(b).localeCompare(dateKey(a))
  })
}
'''
Path('src/lib/filmRoomFilters.ts').write_text(film_filters)

film_tests = r'''import { describe, expect, it } from 'vitest'
import type { Athlete, FilmPlay } from '../types'
import {
  EMPTY_FILM_ROOM_FILTERS,
  athleteMatchesFilmPositionFilters,
  filterFilmPlays,
  filterRosterForFilm,
} from './filmRoomFilters'

const twoWay: Athlete = {
  id: 'two-way',
  name: 'Two Way Player',
  grade: 11,
  position: 'WR',
  positionGroup: 'WR',
  usage: 'two-way',
  secondaryPosition: 'CB',
  secondaryPositionGroup: 'DB',
  heightIn: 71,
  weightLbs: 175,
}

const runningBack: Athlete = {
  id: 'rb',
  name: 'Running Back',
  grade: 10,
  position: 'RB',
  positionGroup: 'RB',
  heightIn: 69,
  weightLbs: 180,
}

const play: FilmPlay = {
  id: 'film-1',
  opponent: 'Central',
  date: '2026-09-01',
  side: 'offense',
  formation: 'trips',
  personnel: '11',
  call: 'pass',
  targetId: twoWay.id,
  gain: 18,
  result: 'first down',
}

describe('Hudl Film Room two-way filters', () => {
  it('includes one two-way athlete in both position groups and both position searches', () => {
    expect(athleteMatchesFilmPositionFilters(twoWay, 'WR', '')).toBe(true)
    expect(athleteMatchesFilmPositionFilters(twoWay, 'DB', '')).toBe(true)
    expect(athleteMatchesFilmPositionFilters(twoWay, '', 'WR')).toBe(true)
    expect(athleteMatchesFilmPositionFilters(twoWay, '', 'CB')).toBe(true)
    expect(filterRosterForFilm([twoWay, runningBack], { group: 'DB', position: '' }))
      .toEqual([twoWay])
  })

  it('shows a tagged play under either side of a two-way athlete without duplicating it', () => {
    const wr = filterFilmPlays([play], [twoWay, runningBack], {
      ...EMPTY_FILM_ROOM_FILTERS,
      group: 'WR',
    })
    const db = filterFilmPlays([play], [twoWay, runningBack], {
      ...EMPTY_FILM_ROOM_FILTERS,
      group: 'DB',
    })

    expect(wr.map((item) => item.id)).toEqual(['film-1'])
    expect(db.map((item) => item.id)).toEqual(['film-1'])
  })

  it('combines Hudl metadata, player, result, and sort filters', () => {
    const second: FilmPlay = {
      ...play,
      id: 'film-2',
      date: '2026-09-02',
      ballCarrierId: runningBack.id,
      targetId: undefined,
      call: 'run',
      gain: 4,
      result: 'tackle',
    }
    const filtered = filterFilmPlays([play, second], [twoWay, runningBack], {
      ...EMPTY_FILM_ROOM_FILTERS,
      opponent: 'Central',
      call: 'pass',
      athleteId: twoWay.id,
      result: 'first',
      sort: 'gain-high',
    })

    expect(filtered.map((item) => item.id)).toEqual(['film-1'])
  })
})
'''
Path('src/lib/filmRoomFilters.test.ts').write_text(film_tests)

# Film Room imports.
replace_once(
    'src/pages/FilmRoom.tsx',
    "import { useEffect, useMemo, useRef, useState } from 'react'\n",
    "import { useEffect, useMemo, useRef, useState } from 'react'\n",
)
replace_once(
    'src/pages/FilmRoom.tsx',
    "import HudlImportWizard from '../components/HudlImportWizard'\n",
    "import HudlImportWizard from '../components/HudlImportWizard'\nimport { POSITION_GROUPS } from '../data/constants'\nimport { usePageMemory, usePageScrollMemory } from '../hooks/usePageMemory'\nimport {\n  EMPTY_FILM_ROOM_FILTERS,\n  filterFilmPlays,\n  filterRosterForFilm,\n  type FilmRoomFilters,\n} from '../lib/filmRoomFilters'\n",
)

replace_once(
    'src/pages/FilmRoom.tsx',
    "type FormState = Partial<FilmPlay>\n\nconst EMPTY_FORM: FormState = {\n",
    "type FormState = Partial<FilmPlay>\n\nlet filmRoomSourceFileCache: File | undefined\n\nconst EMPTY_FORM: FormState = {\n",
)

old_state = """  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState<FilmAnnotation[]>([])
  const [drawKind, setDrawKind] = useState<FilmAnnotationKind>('route')
  const [drawAthleteId, setDrawAthleteId] = useState('')

  const [opponentFilter, setOpponentFilter] = useState('')

  const roster = useMemo(
    () => [...data.athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [data.athletes],
  )
  const opponents = useMemo(() => opponentsFromFilm(data.filmPlays), [data.filmPlays])
  const report = useMemo(
    () => buildTendencyReport(data.filmPlays, { opponent: opponentFilter || undefined }),
    [data.filmPlays, opponentFilter],
  )
  const recent = useMemo(
    () =>
      [...data.filmPlays]
        .sort((a, b) => `${b.date ?? ''}${b.createdAt ?? ''}`.localeCompare(`${a.date ?? ''}${a.createdAt ?? ''}`))
        .slice(0, 14),
    [data.filmPlays],
  )
"""
new_state = """  const [form, setForm] = usePageMemory<FormState>('fai:film:tag-form', EMPTY_FORM)
  const [editingId, setEditingId] = usePageMemory<string | null>('fai:film:editing-id', null)
  const [pending, setPending] = usePageMemory<FilmAnnotation[]>('fai:film:annotations', [])
  const [drawKind, setDrawKind] = usePageMemory<FilmAnnotationKind>('fai:film:draw-kind', 'route')
  const [drawAthleteId, setDrawAthleteId] = usePageMemory('fai:film:draw-athlete', '')

  const [opponentFilter, setOpponentFilter] = usePageMemory('fai:film:scouting-opponent', '')
  const [listFilters, setListFilters] = usePageMemory<FilmRoomFilters>(
    'fai:film:charted-filters',
    EMPTY_FILM_ROOM_FILTERS,
  )
  usePageScrollMemory('fai:film:scroll')

  const roster = useMemo(
    () => [...data.athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [data.athletes],
  )
  const filteredRoster = useMemo(
    () => filterRosterForFilm(roster, listFilters),
    [listFilters, roster],
  )
  const opponents = useMemo(() => opponentsFromFilm(data.filmPlays), [data.filmPlays])
  const report = useMemo(
    () => buildTendencyReport(data.filmPlays, { opponent: opponentFilter || undefined }),
    [data.filmPlays, opponentFilter],
  )
  const recent = useMemo(
    () => filterFilmPlays(data.filmPlays, data.athletes, listFilters).slice(0, 40),
    [data.athletes, data.filmPlays, listFilters],
  )
"""
replace_once('src/pages/FilmRoom.tsx', old_state, new_state)

# Rehydrate the locally selected video when returning to Film Room.
replace_once(
    'src/pages/FilmRoom.tsx',
    """  // Release any object URL / capture stream when the page unmounts.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])
""",
    """  // Rehydrate the selected local clip when returning, then release browser resources on unmount.
  useEffect(() => {
    if (filmRoomSourceFileCache) loadFile(filmRoomSourceFileCache)
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
    // loadFile is intentionally stable for this one-time route restoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
""",
)

replace_once(
    'src/pages/FilmRoom.tsx',
    """  function loadFile(file: File) {
    setCaptureError(undefined)
""",
    """  function loadFile(file: File) {
    filmRoomSourceFileCache = file
    setCaptureError(undefined)
""",
)

replace_once(
    'src/pages/FilmRoom.tsx',
    """  function setField<K extends keyof FilmPlay>(key: K, value: FilmPlay[K] | undefined) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function numberField(value: string): number | undefined {
""",
    """  function setField<K extends keyof FilmPlay>(key: K, value: FilmPlay[K] | undefined) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setListFilter<K extends keyof FilmRoomFilters>(key: K, value: FilmRoomFilters[K]) {
    setListFilters((current) => ({ ...current, [key]: value }))
  }

  function numberField(value: string): number | undefined {
""",
)

old_charted = """      {recent.length > 0 && (
        <Card className=\"p-5\">
          <SectionTitle>Charted Plays</SectionTitle>
          <div className=\"space-y-1.5\">
            {recent.map((play) => {
              const carrier = roster.find((item) => item.id === play.ballCarrierId)
              return (
                <div
                  key={play.id}
                  className=\"flex flex-wrap items-center gap-2 rounded-lg bg-panel-2/40 px-3 py-2 text-sm\"
                >
                  {play.opponent && <span className=\"font-bold text-chalk\">{play.opponent}</span>}
                  {play.down && (
                    <Pill>{play.down} &amp; {play.distance ?? '?'}</Pill>
                  )}
                  {play.formation && <span className=\"text-muted\">{labelFor('formation', play.formation)}</span>}
                  {play.call && <Pill tone={play.call === 'run' ? 'gold' : 'fai'}>{labelFor('call', play.call)}</Pill>}
                  {play.concept && <span className=\"text-xs text-muted\">{labelFor('concept', play.concept)}</span>}
                  {carrier && <span className=\"text-xs text-muted\">· {carrier.name}</span>}
                  {typeof play.gain === 'number' && (
                    <span className={`text-xs font-bold nums ${play.gain >= 0 ? 'text-up' : 'text-down'}`}>
                      {play.gain >= 0 ? '+' : ''}{play.gain}
                    </span>
                  )}
                  {play.annotations && play.annotations.length > 0 && (
                    <Pill tone=\"fai\">✎ {play.annotations.length}</Pill>
                  )}
                  {canEdit && (
                    <div className=\"ml-auto flex items-center gap-1\">
                      {typeof play.videoTimeSec === 'number' && (
                        <button
                          type=\"button\"
                          onClick={() => jumpTo(play)}
                          className=\"rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-fai/40 hover:text-chalk\"
                        >
                          ⤳ {Math.round(play.videoTimeSec)}s
                        </button>
                      )}
                      <button
                        type=\"button\"
                        onClick={() => editPlay(play)}
                        className=\"rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-fai/40 hover:text-chalk\"
                      >
                        Edit
                      </button>
                      <button
                        type=\"button\"
                        onClick={() => deleteFilmPlay(play.id)}
                        className=\"rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-down/40 hover:text-down\"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
"""
new_charted = """      {data.filmPlays.length > 0 && (
        <Card className=\"p-5\">
          <SectionTitle
            right={<Pill tone=\"fai\">{recent.length} shown · {data.filmPlays.length} total</Pill>}
          >
            Charted Plays
          </SectionTitle>

          <div className=\"mb-4 grid gap-2 rounded-xl border border-line bg-panel-2/30 p-3 sm:grid-cols-2 lg:grid-cols-5\">
            <select value={listFilters.opponent} onChange={(event) => setListFilter('opponent', event.target.value)} className={selectClass}>
              <option value=\"\">All games / opponents</option>
              {opponents.map((opp) => <option key={opp} value={opp}>{opp}</option>)}
            </select>
            <select value={listFilters.side} onChange={(event) => setListFilter('side', event.target.value as FilmRoomFilters['side'])} className={selectClass}>
              <option value=\"\">All units</option>
              <option value=\"offense\">Offense</option>
              <option value=\"defense\">Defense</option>
              <option value=\"special\">Special teams</option>
            </select>
            <select value={listFilters.formation} onChange={(event) => setListFilter('formation', event.target.value)} className={selectClass}>
              <option value=\"\">All formations</option>
              {FORMATIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <select value={listFilters.personnel} onChange={(event) => setListFilter('personnel', event.target.value)} className={selectClass}>
              <option value=\"\">All personnel</option>
              {PERSONNEL.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <select value={listFilters.call} onChange={(event) => setListFilter('call', event.target.value as FilmRoomFilters['call'])} className={selectClass}>
              <option value=\"\">All play types</option>
              {PLAY_CALLS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>

            <select value={listFilters.group} onChange={(event) => setListFilter('group', event.target.value as FilmRoomFilters['group'])} className={selectClass}>
              <option value=\"\">All position groups</option>
              {POSITION_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
            <input value={listFilters.position} onChange={(event) => setListFilter('position', event.target.value)} placeholder=\"Position (WR, CB…)\" className={inputClass} />
            <select value={listFilters.athleteId} onChange={(event) => setListFilter('athleteId', event.target.value)} className={selectClass}>
              <option value=\"\">All matching players</option>
              {filteredRoster.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name} · {athlete.position}{athlete.secondaryPosition ? ` / ${athlete.secondaryPosition}` : ''}
                </option>
              ))}
            </select>
            <input value={listFilters.result} onChange={(event) => setListFilter('result', event.target.value)} placeholder=\"Result (TD, INT…)\" className={inputClass} />
            <select value={listFilters.sort} onChange={(event) => setListFilter('sort', event.target.value as FilmRoomFilters['sort'])} className={selectClass}>
              <option value=\"newest\">Newest first</option>
              <option value=\"oldest\">Oldest first</option>
              <option value=\"gain-high\">Highest gain</option>
              <option value=\"gain-low\">Lowest gain</option>
            </select>

            {Object.entries(listFilters).some(([key, value]) => key === 'sort' ? value !== 'newest' : Boolean(value)) && (
              <button
                type=\"button\"
                onClick={() => setListFilters(EMPTY_FILM_ROOM_FILTERS)}
                className=\"rounded-lg border border-line px-3 py-2 text-sm font-bold text-muted hover:text-chalk sm:col-span-2 lg:col-span-5\"
              >
                Clear charted-play filters
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <div className=\"rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted\">
              No charted plays match these filters.
            </div>
          ) : (
            <div className=\"space-y-1.5\">
              {recent.map((play) => {
                const carrier = roster.find((item) => item.id === play.ballCarrierId)
                const target = roster.find((item) => item.id === play.targetId)
                return (
                  <div
                    key={play.id}
                    className=\"flex flex-wrap items-center gap-2 rounded-lg bg-panel-2/40 px-3 py-2 text-sm\"
                  >
                    {play.opponent && <span className=\"font-bold text-chalk\">{play.opponent}</span>}
                    {play.down && <Pill>{play.down} &amp; {play.distance ?? '?'}</Pill>}
                    {play.formation && <span className=\"text-muted\">{labelFor('formation', play.formation)}</span>}
                    {play.call && <Pill tone={play.call === 'run' ? 'gold' : 'fai'}>{labelFor('call', play.call)}</Pill>}
                    {play.concept && <span className=\"text-xs text-muted\">{labelFor('concept', play.concept)}</span>}
                    {carrier && <span className=\"text-xs text-muted\">· Carrier: {carrier.name}</span>}
                    {target && <span className=\"text-xs text-muted\">· Target: {target.name}</span>}
                    {typeof play.gain === 'number' && (
                      <span className={`text-xs font-bold nums ${play.gain >= 0 ? 'text-up' : 'text-down'}`}>
                        {play.gain >= 0 ? '+' : ''}{play.gain}
                      </span>
                    )}
                    {play.result && <span className=\"text-xs font-semibold text-chalk\">{play.result}</span>}
                    {play.annotations && play.annotations.length > 0 && <Pill tone=\"fai\">✎ {play.annotations.length}</Pill>}
                    {canEdit && (
                      <div className=\"ml-auto flex items-center gap-1\">
                        {typeof play.videoTimeSec === 'number' && (
                          <button type=\"button\" onClick={() => jumpTo(play)} className=\"rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-fai/40 hover:text-chalk\">
                            ⤳ {Math.round(play.videoTimeSec)}s
                          </button>
                        )}
                        <button type=\"button\" onClick={() => editPlay(play)} className=\"rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-fai/40 hover:text-chalk\">Edit</button>
                        <button type=\"button\" onClick={() => deleteFilmPlay(play.id)} className=\"rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-down/40 hover:text-down\">Remove</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}
"""
replace_once('src/pages/FilmRoom.tsx', old_charted, new_charted)

# Hudl importer retains its draft and selected File objects during SPA navigation.
replace_once(
    'src/components/HudlImportWizard.tsx',
    "import { useMemo, useState } from 'react'\n",
    "import { useEffect, useMemo, useState } from 'react'\n",
)
replace_once(
    'src/components/HudlImportWizard.tsx',
    "import { FORMATIONS, PERSONNEL, PLAY_CALLS, labelFor } from '../lib/filmAnalysis'\n",
    "import { FORMATIONS, PERSONNEL, PLAY_CALLS, labelFor } from '../lib/filmAnalysis'\nimport { usePageMemory } from '../hooks/usePageMemory'\n",
)
replace_once(
    'src/components/HudlImportWizard.tsx',
    "const emptyTable: HudlTable = { headers: [], rows: [], delimiter: ',' }\n",
    "const emptyTable: HudlTable = { headers: [], rows: [], delimiter: ',' }\nlet hudlClipCache: File[] = []\n",
)

old_hudl_state = """  const [expanded, setExpanded] = useState(false)
  const [breakdownText, setBreakdownText] = useState('')
  const [table, setTable] = useState<HudlTable>(emptyTable)
  const [mapping, setMapping] = useState<HudlColumnMap>({})
  const [clips, setClips] = useState<File[]>([])
  const [defaults, setDefaults] = useState<HudlImportDefaults>({ side: 'offense' })
  const [overrides, setOverrides] = useState<Record<number, Partial<Omit<FilmPlay, 'id' | 'createdAt'>>>>({})
  const [selectedRow, setSelectedRow] = useState(0)
  const [message, setMessage] = useState<string>()
"""
new_hudl_state = """  const [expanded, setExpanded] = usePageMemory('fai:hudl:expanded', false)
  const [breakdownText, setBreakdownText] = usePageMemory('fai:hudl:breakdown-text', '')
  const [table, setTable] = usePageMemory<HudlTable>('fai:hudl:table', emptyTable)
  const [mapping, setMapping] = usePageMemory<HudlColumnMap>('fai:hudl:mapping', {})
  const [clips, setClips] = useState<File[]>(() => hudlClipCache)
  const [defaults, setDefaults] = usePageMemory<HudlImportDefaults>('fai:hudl:defaults', { side: 'offense' })
  const [overrides, setOverrides] = usePageMemory<Record<number, Partial<Omit<FilmPlay, 'id' | 'createdAt'>>>>('fai:hudl:overrides', {})
  const [selectedRow, setSelectedRow] = usePageMemory('fai:hudl:selected-row', 0)
  const [message, setMessage] = useState<string>()

  useEffect(() => {
    hudlClipCache = clips
  }, [clips])
"""
replace_once('src/components/HudlImportWizard.tsx', old_hudl_state, new_hudl_state)

replace_once(
    'src/components/HudlImportWizard.tsx',
    """  const preview = basePreview.map((row) => applyOverride(row, overrides[row.index]))
  const selected = preview[selectedRow] ?? preview[0]
""",
    """  const preview = basePreview.map((row) => applyOverride(row, overrides[row.index]))
  const selected = preview[selectedRow] ?? preview[0]

  useEffect(() => {
    if (preview.length === 0 && selectedRow !== 0) setSelectedRow(0)
    else if (selectedRow >= preview.length) setSelectedRow(Math.max(0, preview.length - 1))
  }, [preview.length, selectedRow, setSelectedRow])
""",
)

print('Hudl Film Room state and two-way filters applied.')
