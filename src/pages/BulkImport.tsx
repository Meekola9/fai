import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, type BulkImportPlan, type BulkImportResult } from '../store/useStore'
import { Card, Pill, SectionTitle, StatTile } from '../components/ui'
import { downloadCsv } from '../data/csv'
import { TESTING_PHASES } from '../data/constants'
import { positionGroupFor } from '../data/positions'
import { normalizeAthleteName } from '../lib/athleteIdentity'
import {
  loadTeamAthleteAliases,
  saveTeamAthleteAlias,
} from '../store/accounts'
import type { Athlete, TestSession, TestingPhase } from '../types'
import {
  IMPORT_FIELDS,
  autoMapColumns,
  isAutoIncluded,
  parseDelimited,
  resolveRows,
  resultsTemplateCsv,
  rosterTemplateCsv,
  type ColumnMapping,
  type ImportMode,
  type ParsedTable,
  type ResolvedRow,
  type RosterAthlete,
  type RosterDraft,
  type RowStatus,
  type SessionDraft,
} from '../lib/bulkImport'

const MODES: { key: ImportMode; label: string; help: string }[] = [
  { key: 'combined', label: 'Roster + Results', help: 'Create missing athletes and import their results together.' },
  { key: 'roster', label: 'Roster only', help: 'Create or update athlete profiles. Measured results are ignored.' },
  { key: 'results', label: 'Results only', help: 'Add results to athletes who already exist. Unknown names need review.' },
]

const STATUS_TONE: Record<RowStatus, 'up' | 'gold' | 'down' | 'fai' | 'default'> = {
  ready: 'up',
  warning: 'gold',
  'needs-review': 'gold',
  duplicate: 'default',
  error: 'down',
}

const STATUS_LABEL: Record<RowStatus, string> = {
  ready: 'Ready',
  warning: 'Warning',
  'needs-review': 'Needs review',
  duplicate: 'Duplicate',
  error: 'Error',
}

const inputClass = 'w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-chalk outline-none placeholder:text-muted focus:border-fai'

function clampGrade(grade: number | undefined): number {
  if (typeof grade !== 'number' || !Number.isFinite(grade)) return 9
  return grade
}

function matchChoices(row: ResolvedRow, roster: readonly RosterAthlete[]): RosterAthlete[] {
  const suggestedIds = new Set(row.match.candidates.map((athlete) => athlete.id))
  return [
    ...row.match.candidates,
    ...roster.filter((athlete) => !suggestedIds.has(athlete.id)),
  ]
}

function toNewAthlete(draft: RosterDraft): Omit<Athlete, 'id'> {
  const position = draft.position || 'ATH'
  return {
    name: draft.fullName || [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Unnamed Athlete',
    grade: clampGrade(draft.grade),
    position,
    positionGroup: draft.positionGroup ?? positionGroupFor(position, 'ATH'),
    secondaryPosition: draft.secondaryPosition,
    heightIn: draft.heightIn ?? 0,
    weightLbs: draft.weightLbs ?? 0,
  }
}

export default function BulkImport() {
  const { data, teamId, commitBulkImport, canEdit } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ImportMode>('combined')
  const [rawText, setRawText] = useState('')
  const [table, setTable] = useState<ParsedTable | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [parseError, setParseError] = useState<string>()
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [includeOverrides, setIncludeOverrides] = useState<Set<number>>(new Set())
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [aliasMap, setAliasMap] = useState<Map<string, string>>(new Map())
  const [manualMatches, setManualMatches] = useState<Map<number, string>>(new Map())
  const [matchNotice, setMatchNotice] = useState<string>()
  const [matchError, setMatchError] = useState<string>()
  const [savingMatchRow, setSavingMatchRow] = useState<number>()

  const [newEventName, setNewEventName] = useState('')
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [newEventPhase, setNewEventPhase] = useState<TestingPhase>('Summer')
  const [existingEventId, setExistingEventId] = useState('')

  useEffect(() => {
    let active = true
    if (!teamId) return () => { active = false }

    void loadTeamAthleteAliases(teamId)
      .then((aliases) => {
        if (!active) return
        setAliasMap(new Map(aliases.map((alias) => [alias.normalizedAlias, alias.athleteId])))
      })
      .catch((cause: unknown) => {
        if (!active) return
        setMatchError(cause instanceof Error ? cause.message : 'Could not load saved athlete aliases.')
      })

    return () => { active = false }
  }, [teamId])

  const roster: RosterAthlete[] = useMemo(
    () => data.athletes.map((athlete) => ({ id: athlete.id, name: athlete.name, grade: athlete.grade })),
    [data.athletes],
  )
  const athleteById = useMemo(() => new Map(data.athletes.map((a) => [a.id, a])), [data.athletes])

  const resolved = useMemo(
    () => (table ? resolveRows(table.rows, mapping, mode, roster, aliasMap, manualMatches) : []),
    [table, mapping, mode, roster, aliasMap, manualMatches],
  )

  const counts = useMemo(() => {
    const c = { total: resolved.length, ready: 0, warning: 0, review: 0, duplicate: 0, error: 0, newAthletes: 0, matched: 0 }
    for (const row of resolved) {
      if (row.status === 'ready') c.ready += 1
      else if (row.status === 'warning') c.warning += 1
      else if (row.status === 'needs-review') c.review += 1
      else if (row.status === 'duplicate') c.duplicate += 1
      else if (row.status === 'error') c.error += 1
      if (row.match.athleteId) c.matched += 1
      else if (mode !== 'results') c.newAthletes += 1
    }
    return c
  }, [resolved, mode])

  function isIncluded(row: ResolvedRow): boolean {
    if (excluded.has(row.index)) return false
    if (row.status === 'error') return false
    if (mode === 'results' && !row.match.athleteId) return false
    // Ambiguous / review / duplicate rows are opt-in.
    if (!isAutoIncluded(row)) return includeOverrides.has(row.index)
    return true
  }

  function toggleRow(row: ResolvedRow) {
    if (isAutoIncluded(row)) {
      setExcluded((prev) => {
        const next = new Set(prev)
        if (next.has(row.index)) next.delete(row.index)
        else next.add(row.index)
        return next
      })
    } else {
      setIncludeOverrides((prev) => {
        const next = new Set(prev)
        if (next.has(row.index)) next.delete(row.index)
        else next.add(row.index)
        return next
      })
    }
  }

  async function assignMatch(row: ResolvedRow, athleteId: string) {
    setMatchNotice(undefined)
    setMatchError(undefined)
    setManualMatches((current) => {
      const next = new Map(current)
      if (athleteId) next.set(row.index, athleteId)
      else next.delete(row.index)
      return next
    })
    if (!athleteId) return

    setExcluded((current) => {
      const next = new Set(current)
      next.delete(row.index)
      return next
    })

    const cleanAlias = row.displayName.trim()
    if (!teamId || !cleanAlias) {
      setMatchNotice('Match applied to this import. Sign in to remember this alias for future files.')
      return
    }

    setSavingMatchRow(row.index)
    try {
      const saved = await saveTeamAthleteAlias(teamId, cleanAlias, athleteId)
      setAliasMap((current) => {
        const next = new Map(current)
        next.set(saved.normalizedAlias, saved.athleteId)
        return next
      })
      const athleteName = athleteById.get(athleteId)?.name ?? 'the selected athlete'
      setMatchNotice(`Saved “${cleanAlias}” as an alias for ${athleteName}. Future imports will match automatically.`)
    } catch (cause: unknown) {
      setMatchError(
        `Match applied to this import, but the alias was not saved: ${cause instanceof Error ? cause.message : 'Unknown error.'}`,
      )
    } finally {
      setSavingMatchRow(undefined)
    }
  }

  const includedRows = resolved.filter(isIncluded)
  const needsEvent = mode !== 'roster'

  function parse() {
    setParseError(undefined)
    setResult(null)
    setExcluded(new Set())
    setIncludeOverrides(new Set())
    setManualMatches(new Map())
    setMatchNotice(undefined)
    setMatchError(undefined)
    try {
      const parsed = parseDelimited(rawText)
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setParseError('No data rows found. Paste a header row plus at least one athlete row.')
        return
      }
      setTable(parsed)
      setMapping(autoMapColumns(parsed.headers).mapping)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Could not parse the data.')
    }
  }

  function loadFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      setRawText(String(reader.result ?? ''))
    }
    reader.readAsText(file)
  }

  function remap(fieldKey: string, columnIndex: number) {
    setManualMatches(new Map())
    setMatchNotice(undefined)
    setMapping((prev) => {
      const next: ColumnMapping = {}
      // Clear any field currently on this column, and this field's old column.
      for (const [key, index] of Object.entries(prev)) {
        if (index === columnIndex || key === fieldKey) continue
        next[key] = index
      }
      if (columnIndex >= 0) next[fieldKey] = columnIndex
      return next
    })
  }

  function buildPlan(): BulkImportPlan {
    const newAthletes: Omit<Athlete, 'id'>[] = []
    const newIndexByKey = new Map<string, number>()
    const sessions: BulkImportPlan['sessions'] = []

    const eventStartDate = needsEvent
      ? existingEventId
        ? athleteEventDate(existingEventId)
        : newEventDate
      : ''
    const eventPhase: TestingPhase = needsEvent
      ? existingEventId
        ? (data.events.find((e) => e.id === existingEventId)?.phase ?? newEventPhase)
        : newEventPhase
      : 'Summer'

    for (const row of includedRows) {
      let athleteRef: { existingId: string } | { newIndex: number }
      if (row.match.athleteId) {
        athleteRef = { existingId: row.match.athleteId }
      } else if (mode !== 'results') {
        const key = normalizeAthleteName(row.displayName)
        let index = newIndexByKey.get(key)
        if (index === undefined) {
          index = newAthletes.length
          newAthletes.push(toNewAthlete(row.roster))
          newIndexByKey.set(key, index)
        }
        athleteRef = { newIndex: index }
      } else {
        continue
      }

      if (mode !== 'roster' && row.hasMetrics) {
        const existing = row.match.athleteId ? athleteById.get(row.match.athleteId) : undefined
        sessions.push({
          athlete: athleteRef,
          session: toSessionPayload(row.session, row.roster, existing, eventStartDate, eventPhase),
        })
      }
    }

    const event: BulkImportPlan['event'] = !needsEvent
      ? null
      : existingEventId
        ? { existingId: existingEventId }
        : { create: { name: newEventName.trim() || 'Imported Testing', phase: newEventPhase, startDate: newEventDate } }

    return { newAthletes, event, sessions }
  }

  function athleteEventDate(eventId: string): string {
    return data.events.find((e) => e.id === eventId)?.startDate ?? newEventDate
  }

  function commit() {
    const plan = buildPlan()
    const summary = commitBulkImport(plan)
    setResult(summary)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setTable(null)
    setRawText('')
    setMapping({})
    setResult(null)
    setExcluded(new Set())
    setIncludeOverrides(new Set())
    setManualMatches(new Map())
    setMatchNotice(undefined)
    setMatchError(undefined)
  }

  if (!canEdit) {
    return <Card className="p-8 text-center text-sm text-muted">You do not have permission to import data.</Card>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-fai">Admin · Coaches</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-chalk">Bulk Import</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Paste from a spreadsheet or upload a CSV to add a whole roster and testing session at once.
            Nothing is saved until you review and confirm — existing athletes and past results are never overwritten.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadCsv('fai-roster-template.csv', rosterTemplateCsv())} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted hover:text-fai">Roster template</button>
          <button type="button" onClick={() => downloadCsv('fai-results-template.csv', resultsTemplateCsv())} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted hover:text-fai">Results template</button>
        </div>
      </div>

      {result ? (
        <Card className="p-6">
          <SectionTitle>Import complete</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Athletes created" value={result.athletesCreated} accent="fai" />
            <StatTile label="Results added" value={result.sessionsCreated} accent="up" />
            <StatTile label="Rows skipped" value={counts.total - includedRows.length} accent="gold" />
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={reset} className="rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink">Import another file</button>
            <Link to="/athletes" className="rounded-lg border border-line px-5 py-2 text-sm font-bold text-chalk">View athletes</Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Step 1 — source */}
          <Card className="p-5">
            <SectionTitle>1 · Choose data</SectionTitle>
            <div className="mb-4 flex flex-wrap gap-2">
              {MODES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setMode(option.key)
                    setManualMatches(new Map())
                    setExcluded(new Set())
                    setIncludeOverrides(new Set())
                    setMatchNotice(undefined)
                  }}
                  className={`rounded-lg border px-3 py-2 text-left transition ${mode === option.key ? 'border-fai bg-fai/10' : 'border-line hover:border-fai/40'}`}
                >
                  <div className="text-sm font-bold text-chalk">{option.label}</div>
                  <div className="text-[11px] text-muted">{option.help}</div>
                </button>
              ))}
            </div>
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Paste rows from Google Sheets or Excel here (headers in the first row)…"
              rows={6}
              className={inputClass + ' font-mono text-xs'}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={parse} disabled={!rawText.trim()} className="rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink disabled:opacity-40">Parse data</button>
              <label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-bold text-chalk hover:border-fai/40">
                Upload CSV
                <input ref={fileRef} type="file" accept=".csv,text/csv,.tsv,text/plain" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) loadFile(file) }} />
              </label>
              {parseError && <span className="text-xs text-down">{parseError}</span>}
            </div>
          </Card>

          {/* Step 2 — mapping */}
          {table && (
            <Card className="p-5">
              <SectionTitle right={<span className="text-xs text-muted">{table.rows.length} rows · {table.headers.length} columns</span>}>2 · Map columns</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {table.headers.map((header, columnIndex) => {
                  const fieldKey = Object.entries(mapping).find(([, index]) => index === columnIndex)?.[0] ?? ''
                  return (
                    <label key={columnIndex} className="rounded-lg border border-line bg-panel-2/30 p-2">
                      <div className="truncate text-[11px] font-bold text-muted" title={header}>{header || `Column ${columnIndex + 1}`}</div>
                      <select
                        value={fieldKey}
                        onChange={(event) => remap(event.target.value, event.target.value ? columnIndex : -1)}
                        className={inputClass + ' mt-1'}
                      >
                        <option value="">— ignore —</option>
                        {IMPORT_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </select>
                    </label>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Step 3 — review + commit */}
          {table && (
            <Card className="p-5">
              <SectionTitle>3 · Review &amp; import</SectionTitle>
              {matchNotice && (
                <div className="mb-4 rounded-xl border border-up/35 bg-up/5 p-3 text-xs font-bold text-up">{matchNotice}</div>
              )}
              {matchError && (
                <div className="mb-4 rounded-xl border border-down/35 bg-down/5 p-3 text-xs font-bold text-down">{matchError}</div>
              )}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                <StatTile label="Rows" value={counts.total} />
                <StatTile label="Ready" value={counts.ready + counts.warning} accent="up" />
                <StatTile label="Review" value={counts.review} accent="gold" />
                <StatTile label="Duplicates" value={counts.duplicate} />
                <StatTile label="Errors" value={counts.error} accent="flame" />
                <StatTile label={mode === 'results' ? 'Matched' : 'New athletes'} value={mode === 'results' ? counts.matched : counts.newAthletes} accent="fai" />
              </div>

              {needsEvent && (
                <div className="mb-4 rounded-xl border border-line bg-panel-2/30 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Testing session</div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <select value={existingEventId} onChange={(event) => setExistingEventId(event.target.value)} className={inputClass + ' sm:col-span-2'}>
                      <option value="">+ New testing event</option>
                      {data.events.map((event) => (
                        <option key={event.id} value={event.id}>{event.name} · {event.startDate}</option>
                      ))}
                    </select>
                    {!existingEventId && (
                      <>
                        <input value={newEventName} onChange={(event) => setNewEventName(event.target.value)} placeholder="Event name (e.g. 2026 Summer Testing)" className={inputClass} />
                        <input type="date" value={newEventDate} onChange={(event) => setNewEventDate(event.target.value)} className={inputClass} />
                        <select value={newEventPhase} onChange={(event) => setNewEventPhase(event.target.value as TestingPhase)} className={inputClass}>
                          {TESTING_PHASES.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                        </select>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                      <th className="px-2 py-2">Import</th>
                      <th className="px-2 py-2">Athlete</th>
                      <th className="px-2 py-2">Match</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolved.map((row) => {
                      const included = isIncluded(row)
                      const disabled = row.status === 'error' || (mode === 'results' && !row.match.athleteId)
                      const showResolver = row.match.confidence === 'ambiguous'
                        || (mode === 'results' && row.match.confidence === 'none')
                        || manualMatches.has(row.index)
                      const choices = showResolver ? matchChoices(row, roster) : []
                      return (
                        <tr key={row.index} className="border-b border-line/50 align-top">
                          <td className="px-2 py-2">
                            <input type="checkbox" checked={included} disabled={disabled} onChange={() => toggleRow(row)} aria-label={`Include ${row.displayName}`} />
                          </td>
                          <td className="px-2 py-2 font-bold text-chalk">{row.displayName || <span className="text-muted">—</span>}</td>
                          <td className="min-w-64 px-2 py-2">
                            {showResolver ? (
                              <div className="space-y-1.5">
                                <select
                                  aria-label={`Match ${row.displayName}`}
                                  value={row.match.athleteId ?? ''}
                                  disabled={savingMatchRow === row.index}
                                  onChange={(event) => void assignMatch(row, event.target.value)}
                                  className={inputClass + ' min-w-56 py-1.5 text-xs'}
                                >
                                  <option value="">Choose athlete…</option>
                                  {choices.map((athlete, choiceIndex) => (
                                    <option key={athlete.id} value={athlete.id}>
                                      {choiceIndex < row.match.candidates.length ? 'Suggested · ' : ''}{athlete.name}{athlete.grade ? ` · Grade ${athlete.grade}` : ''}
                                    </option>
                                  ))}
                                </select>
                                <div className="text-[10px] leading-relaxed text-muted">
                                  {savingMatchRow === row.index
                                    ? 'Saving match…'
                                    : teamId
                                      ? 'Choose once to remember this imported name for future files.'
                                      : 'Choose an athlete for this import.'}
                                </div>
                              </div>
                            ) : row.match.athleteId ? (
                              <span className="text-xs text-up">{row.match.confidence === 'exact' ? 'Matched' : 'Likely'} · {athleteById.get(row.match.athleteId)?.name}</span>
                            ) : mode === 'results' ? (
                              <span className="text-xs text-down">No match</span>
                            ) : (
                              <span className="text-xs text-fai">New athlete</span>
                            )}
                          </td>
                          <td className="px-2 py-2"><Pill tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Pill></td>
                          <td className="px-2 py-2 text-[11px] text-muted">{row.issues.map((issue) => issue.message).join(' ') || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={commit}
                  disabled={includedRows.length === 0 || (needsEvent && !existingEventId && !newEventName.trim())}
                  className="rounded-lg bg-fai px-6 py-2.5 text-sm font-black text-ink disabled:opacity-40"
                >
                  Import {includedRows.length} {includedRows.length === 1 ? 'row' : 'rows'}
                </button>
                {needsEvent && !existingEventId && !newEventName.trim() && (
                  <span className="text-xs text-gold">Name the testing event to continue.</span>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function toSessionPayload(
  draft: SessionDraft,
  roster: RosterDraft,
  existing: Athlete | undefined,
  eventStartDate: string,
  eventPhase: TestingPhase,
): Omit<TestSession, 'id' | 'createdAt' | 'athleteId' | 'eventId'> {
  return {
    date: draft.date || eventStartDate,
    phase: draft.phase ?? eventPhase,
    gradeSnapshot: roster.grade ?? existing?.grade,
    positionSnapshot: roster.position ?? existing?.position,
    positionGroupSnapshot: roster.positionGroup ?? existing?.positionGroup,
    weightLbsSnapshot: draft.bodyWeight ?? roster.weightLbs ?? existing?.weightLbs,
    ...draft.metrics,
  }
}
