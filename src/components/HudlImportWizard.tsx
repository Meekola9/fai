import { useMemo, useState } from 'react'
import { Card, Pill, SectionTitle } from './ui'
import { useStore } from '../store/useStore'
import { newId } from '../store/storage'
import type { FilmPlay, PlayCall, PlaySide } from '../types'
import {
  HUDL_FIELDS,
  autoMapHudlColumns,
  buildHudlImportPreview,
  formationSpots,
  formationSvg,
  hudlSourceFromNote,
  naturalClipSort,
  parseHudlTable,
  type HudlColumnMap,
  type HudlImportDefaults,
  type HudlImportPreviewRow,
  type HudlTable,
} from '../lib/hudlImport'
import { FORMATIONS, PERSONNEL, PLAY_CALLS, labelFor } from '../lib/filmAnalysis'

const emptyTable: HudlTable = { headers: [], rows: [], delimiter: ',' }
const inputClass =
  'rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai'

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportRows(rows: readonly HudlImportPreviewRow[]) {
  const header = [
    'Clip',
    'File',
    'Opponent',
    'Date',
    'ODK',
    'Quarter',
    'Down',
    'Distance',
    'Yard Line',
    'Hash',
    'Formation',
    'Personnel',
    'Play Type',
    'Concept',
    'Gain',
    'Result',
  ]
  const body = rows.map((row) => [
    row.clipNumber,
    row.clip?.name,
    row.play.opponent,
    row.play.date,
    row.play.side,
    row.play.quarter,
    row.play.down,
    row.play.distance,
    row.play.yardLine,
    row.play.hash,
    row.play.formation,
    row.play.personnel,
    row.play.call,
    row.play.concept,
    row.play.gain,
    row.play.result,
  ])
  downloadFile(
    'fai-hudl-cleaned-breakdown.csv',
    [header, ...body].map((row) => row.map(csvCell).join(',')).join('\n'),
    'text/csv;charset=utf-8',
  )
}

function FormationBoard({ play }: { play: Pick<FilmPlay, 'formation' | 'personnel'> }) {
  const spots = formationSpots(play.formation, play.personnel)
  return (
    <div className="relative aspect-[8/5] overflow-hidden rounded-xl border border-white/15 bg-emerald-950">
      {[20, 40, 60, 80].map((top) => (
        <div key={top} className="absolute inset-x-0 border-t border-white/20" style={{ top: `${top}%` }} />
      ))}
      <div className="absolute inset-x-0 top-[53%] border-t-2 border-gold/90" />
      <div className="absolute left-2 top-2 rounded bg-black/45 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
        {play.formation ? labelFor('formation', play.formation) : 'Formation not tagged'}
      </div>
      {spots.map((item) => (
        <div
          key={item.id}
          className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-fai bg-ink text-[9px] font-black text-chalk shadow-[0_0_12px_rgba(183,245,42,.25)]"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
          title={item.label}
        >
          {item.label}
        </div>
      ))}
    </div>
  )
}

function templateCsv() {
  return [
    'PLAY #,ODK,OFF FORM,PERSONNEL,OFF PLAY,PLAY TYPE,DN,DIST,YD LINE,HASH,GN/LS,RESULT,NOTES,HUDL LINK',
    '1,O,Trips,11,Inside Zone,Run,1,10,OWN 35,L,6,,,',
    '2,O,Doubles,10,Four Verticals,Pass,2,4,OPP 40,R,18,,,',
  ].join('\n')
}

function applyOverride(
  row: HudlImportPreviewRow,
  override?: Partial<Omit<FilmPlay, 'id' | 'createdAt'>>,
): HudlImportPreviewRow {
  if (!override) return row
  return { ...row, play: { ...row.play, ...override } }
}

export default function HudlImportWizard() {
  const { data, addFilmPlays, canEdit } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [breakdownText, setBreakdownText] = useState('')
  const [table, setTable] = useState<HudlTable>(emptyTable)
  const [mapping, setMapping] = useState<HudlColumnMap>({})
  const [clips, setClips] = useState<File[]>([])
  const [defaults, setDefaults] = useState<HudlImportDefaults>({ side: 'offense' })
  const [overrides, setOverrides] = useState<Record<number, Partial<Omit<FilmPlay, 'id' | 'createdAt'>>>>({})
  const [selectedRow, setSelectedRow] = useState(0)
  const [message, setMessage] = useState<string>()

  const basePreview = useMemo(
    () => buildHudlImportPreview(table, mapping, defaults, clips),
    [clips, defaults, mapping, table],
  )
  const preview = basePreview.map((row) => applyOverride(row, overrides[row.index]))
  const selected = preview[selectedRow] ?? preview[0]
  const imported = [...data.filmPlays]
    .filter((play) => play.note?.startsWith('[Hudl Import]'))
    .sort((a, b) => `${b.createdAt ?? ''}`.localeCompare(`${a.createdAt ?? ''}`))
    .slice(0, 8)

  if (!canEdit) return null

  function parseBreakdown(text = breakdownText) {
    try {
      const parsed = parseHudlTable(text)
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        throw new Error('No breakdown rows were found. Include one header row and at least one play.')
      }
      setTable(parsed)
      setMapping(autoMapHudlColumns(parsed.headers))
      setOverrides({})
      setSelectedRow(0)
      setMessage(`${parsed.rows.length} breakdown rows loaded.`)
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Could not parse the breakdown.')
    }
  }

  async function loadBreakdownFile(file: File) {
    const text = await file.text()
    setBreakdownText(text)
    parseBreakdown(text)
  }

  function updateDefault<K extends keyof HudlImportDefaults>(key: K, value: HudlImportDefaults[K]) {
    setDefaults((current) => ({ ...current, [key]: value }))
  }

  function updatePlay<K extends keyof Omit<FilmPlay, 'id' | 'createdAt'>>(
    index: number,
    key: K,
    value: Omit<FilmPlay, 'id' | 'createdAt'>[K],
  ) {
    setOverrides((current) => ({
      ...current,
      [index]: { ...current[index], [key]: value },
    }))
  }

  function importGame() {
    if (preview.length === 0) {
      setMessage('Load a breakdown before importing.')
      return
    }
    const existing = new Set(
      data.filmPlays.map((play) => `${play.date ?? ''}|${play.opponent ?? ''}|${play.filmLabel ?? ''}`),
    )
    const now = new Date().toISOString()
    const records: FilmPlay[] = []
    let duplicates = 0
    for (const row of preview) {
      const key = `${row.play.date ?? ''}|${row.play.opponent ?? ''}|${row.play.filmLabel ?? ''}`
      if (existing.has(key)) {
        duplicates += 1
        continue
      }
      existing.add(key)
      records.push({ ...row.play, id: newId('film'), createdAt: now })
    }
    if (records.length === 0) {
      setMessage('Every preview row already exists in the Film Room. Nothing was imported.')
      return
    }
    addFilmPlays(records)
    setMessage(
      `Imported ${records.length} plays in one save${duplicates ? `; skipped ${duplicates} duplicates` : ''}.`,
    )
  }

  const rowMismatch = clips.length > 0 && table.rows.length > 0 && clips.length !== table.rows.length

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <div>
          <div className="text-[11px] font-black uppercase tracking-[.22em] text-fai">Hudl workflow</div>
          <div className="mt-1 text-xl font-black text-chalk">Import Clips &amp; Breakdown</div>
          <div className="mt-1 text-xs text-muted">
            Pair downloaded Hudl clips with ODK, formation, play and situation data.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {imported.length > 0 && <Pill tone="fai">{imported.length} recent</Pill>}
          <span className="text-xl text-muted">{expanded ? '−' : '+'}</span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-6 border-t border-line p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-panel-2/30 p-4">
              <SectionTitle>1 · Downloaded clips</SectionTitle>
              <label className="block cursor-pointer rounded-xl border border-dashed border-line p-5 text-center hover:border-fai/50">
                <div className="font-bold text-chalk">Select Hudl video clips</div>
                <div className="mt-1 text-xs text-muted">Choose all clips for the game. Numeric file names are sorted naturally.</div>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const next = naturalClipSort(Array.from(event.target.files ?? []))
                    setClips(next)
                    setMessage(next.length ? `${next.length} clips selected.` : undefined)
                  }}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone={clips.length ? 'fai' : undefined}>{clips.length} clips</Pill>
                {clips.slice(0, 5).map((clip) => <Pill key={`${clip.name}-${clip.size}`}>{clip.name}</Pill>)}
                {clips.length > 5 && <Pill>+{clips.length - 5} more</Pill>}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-panel-2/30 p-4">
              <SectionTitle right={(
                <button
                  type="button"
                  className="text-xs font-bold text-fai hover:underline"
                  onClick={() => downloadFile('fai-hudl-import-template.csv', templateCsv(), 'text/csv;charset=utf-8')}
                >
                  Download template
                </button>
              )}>
                2 · Breakdown data
              </SectionTitle>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-bold text-chalk hover:border-fai/50">
                  Upload CSV / TSV
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void loadBreakdownFile(file)
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => parseBreakdown()}
                  className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink"
                >
                  Parse pasted rows
                </button>
              </div>
              <textarea
                value={breakdownText}
                onChange={(event) => setBreakdownText(event.target.value)}
                placeholder="Paste the Hudl breakdown table here…"
                className={inputClass + ' mt-3 min-h-32 w-full resize-y font-mono text-xs'}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill tone={table.rows.length ? 'fai' : undefined}>{table.rows.length} rows</Pill>
                {table.headers.length > 0 && <Pill>{table.headers.length} columns</Pill>}
                {rowMismatch && <Pill tone="gold">Clips and rows do not match</Pill>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-panel-2/30 p-4">
            <SectionTitle>3 · Game defaults</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <input
                value={defaults.gameLabel ?? ''}
                onChange={(event) => updateDefault('gameLabel', event.target.value || undefined)}
                placeholder="Game / playlist label"
                className={inputClass}
              />
              <input
                value={defaults.opponent ?? ''}
                onChange={(event) => updateDefault('opponent', event.target.value || undefined)}
                placeholder="Opponent"
                className={inputClass}
              />
              <input
                type="date"
                value={defaults.date ?? ''}
                onChange={(event) => updateDefault('date', event.target.value || undefined)}
                className={inputClass}
              />
              <select
                value={defaults.side ?? ''}
                onChange={(event) => updateDefault('side', (event.target.value || undefined) as PlaySide | undefined)}
                className={inputClass}
              >
                <option value="">Default ODK…</option>
                <option value="offense">Offense</option>
                <option value="defense">Defense</option>
                <option value="special">Special teams</option>
              </select>
              <input
                value={defaults.sourceUrl ?? ''}
                onChange={(event) => updateDefault('sourceUrl', event.target.value || undefined)}
                placeholder="Hudl game / playlist link"
                className={inputClass}
              />
            </div>
          </div>

          {table.headers.length > 0 && (
            <div className="rounded-xl border border-line bg-panel-2/30 p-4">
              <SectionTitle>4 · Column mapping</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {HUDL_FIELDS.map((field) => (
                  <label key={field.key} className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {field.label}
                    <select
                      value={mapping[field.key] ?? ''}
                      onChange={(event) => setMapping((current) => ({
                        ...current,
                        [field.key]: event.target.value || undefined,
                      }))}
                      className={inputClass + ' mt-1 w-full normal-case tracking-normal'}
                    >
                      <option value="">Not mapped</option>
                      {table.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(280px,2fr)]">
              <div className="min-w-0 rounded-xl border border-line bg-panel-2/30 p-4">
                <SectionTitle right={<Pill tone="fai">{preview.length} plays</Pill>}>5 · Review pairing</SectionTitle>
                <div className="max-h-[32rem] overflow-auto rounded-lg border border-line">
                  <table className="w-full min-w-[960px] text-left text-xs">
                    <thead className="sticky top-0 bg-panel text-muted">
                      <tr>
                        <th className="p-2">#</th><th className="p-2">Clip</th><th className="p-2">ODK</th>
                        <th className="p-2">Down</th><th className="p-2">Dist</th><th className="p-2">Formation</th>
                        <th className="p-2">Personnel</th><th className="p-2">Type</th><th className="p-2">Concept</th>
                        <th className="p-2">Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row) => (
                        <tr
                          key={row.index}
                          onClick={() => setSelectedRow(row.index)}
                          className={`cursor-pointer border-t border-line/70 ${selected?.index === row.index ? 'bg-fai/10' : 'hover:bg-panel/70'}`}
                        >
                          <td className="p-2 font-black text-chalk">{row.clipNumber ?? row.index + 1}</td>
                          <td className="max-w-48 truncate p-2 text-muted" title={row.clip?.name}>{row.clip?.name ?? '—'}</td>
                          <td className="p-2">
                            <select
                              value={row.play.side ?? ''}
                              onChange={(event) => updatePlay(row.index, 'side', (event.target.value || undefined) as PlaySide | undefined)}
                              className={inputClass + ' w-24 py-1 text-xs'}
                            >
                              <option value="">—</option><option value="offense">O</option><option value="defense">D</option><option value="special">K</option>
                            </select>
                          </td>
                          <td className="p-2"><input type="number" min="1" max="4" value={row.play.down ?? ''} onChange={(event) => updatePlay(row.index, 'down', event.target.value ? Number(event.target.value) : undefined)} className={inputClass + ' w-16 py-1 text-xs'} /></td>
                          <td className="p-2"><input type="number" min="0" max="99" value={row.play.distance ?? ''} onChange={(event) => updatePlay(row.index, 'distance', event.target.value ? Number(event.target.value) : undefined)} className={inputClass + ' w-16 py-1 text-xs'} /></td>
                          <td className="p-2">
                            <select value={row.play.formation ?? ''} onChange={(event) => updatePlay(row.index, 'formation', event.target.value || undefined)} className={inputClass + ' w-40 py-1 text-xs'}>
                              <option value="">—</option>{FORMATIONS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                            </select>
                          </td>
                          <td className="p-2">
                            <select value={row.play.personnel ?? ''} onChange={(event) => updatePlay(row.index, 'personnel', event.target.value || undefined)} className={inputClass + ' w-32 py-1 text-xs'}>
                              <option value="">—</option>{PERSONNEL.map((item) => <option key={item.key} value={item.key}>{item.key}</option>)}
                            </select>
                          </td>
                          <td className="p-2">
                            <select value={row.play.call ?? ''} onChange={(event) => updatePlay(row.index, 'call', (event.target.value || undefined) as PlayCall | undefined)} className={inputClass + ' w-28 py-1 text-xs'}>
                              <option value="">—</option>{PLAY_CALLS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                            </select>
                          </td>
                          <td className="max-w-40 truncate p-2 text-muted" title={row.play.concept}>{row.play.concept ?? '—'}</td>
                          <td className="p-2">{row.warnings.length ? <Pill tone="gold">{row.warnings.length}</Pill> : <span className="text-up">✓</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-line bg-panel-2/30 p-4">
                <SectionTitle>Formation preview</SectionTitle>
                {selected ? (
                  <>
                    <FormationBoard play={selected.play} />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-panel p-2"><span className="text-muted">Clip</span><div className="mt-1 truncate font-bold text-chalk">{selected.clip?.name ?? selected.clipNumber ?? 'Unpaired'}</div></div>
                      <div className="rounded-lg bg-panel p-2"><span className="text-muted">Call</span><div className="mt-1 font-bold text-chalk">{selected.play.call ? labelFor('call', selected.play.call) : 'Unrecognized'}</div></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadFile(`fai-formation-${selected.clipNumber ?? selected.index + 1}.svg`, formationSvg(selected.play), 'image/svg+xml')}
                      className="w-full rounded-lg border border-fai/40 px-4 py-2 text-sm font-black text-fai hover:bg-fai/10"
                    >
                      Export formation SVG
                    </button>
                  </>
                ) : <div className="text-sm text-muted">Select a play row.</div>}
              </div>
            </div>
          )}

          {preview.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button type="button" onClick={importGame} className="rounded-lg bg-fai px-5 py-2.5 text-sm font-black text-ink">
                Import {preview.length} plays
              </button>
              <button type="button" onClick={() => exportRows(preview)} className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-chalk hover:border-fai/40">
                Export cleaned CSV
              </button>
              <span className="text-xs text-muted">Video files stay on this device; FAI saves their clip names and breakdown records.</span>
            </div>
          )}

          {message && <div className="rounded-lg border border-fai/25 bg-fai/5 px-4 py-3 text-sm font-semibold text-chalk">{message}</div>}

          {imported.length > 0 && (
            <div>
              <SectionTitle>Recent Hudl imports</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {imported.map((play) => {
                  const source = hudlSourceFromNote(play.note)
                  return (
                    <div key={play.id} className="rounded-xl border border-line bg-panel-2/30 p-3">
                      <FormationBoard play={play} />
                      <div className="mt-2 truncate text-sm font-black text-chalk" title={play.filmLabel}>{play.filmLabel}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {play.personnel && <Pill>{play.personnel}</Pill>}
                        {play.call && <Pill tone={play.call === 'run' ? 'gold' : 'fai'}>{labelFor('call', play.call)}</Pill>}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => downloadFile(`fai-${play.id}.svg`, formationSvg(play), 'image/svg+xml')} className="text-xs font-bold text-fai hover:underline">Export SVG</button>
                        {source && <a href={source} target="_blank" rel="noreferrer" className="text-xs font-bold text-gold hover:underline">Open Hudl</a>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
