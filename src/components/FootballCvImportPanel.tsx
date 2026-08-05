import { useMemo, useState } from 'react'
import type { Athlete, FilmAnnotation, PlaySide, TrackingTeam } from '../types'
import { Card, Pill } from './ui'
import { formatTrackTime } from '../lib/filmTracking'
import {
  buildFootballCvPlayerTracks,
  defaultFootballCvSelection,
  footballCvUnitLimitErrors,
  parseFootballCvTrackingJson,
  suggestFootballCvAlignmentFrame,
  summarizeFootballCvTracks,
  type FootballCvParseResult,
  type FootballCvTeamMapping,
  type FootballCvTrackOption,
} from '../lib/footballCvImport'

interface FootballCvImportResult {
  tracks: FilmAnnotation[]
  formationStartTime?: number
  source?: string
  createdWith?: string
}

interface Props {
  athletes: readonly Athlete[]
  currentVideoTime: number
  onImport: (result: FootballCvImportResult) => void
}

const selectClass =
  'rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none focus:border-fai'
const inputClass = selectClass + ' placeholder:text-muted'

function defaultTeamMapping(index: number): FootballCvTeamMapping {
  if (index === 0) return { trackingTeam: 'opponent', side: 'offense' }
  if (index === 1) return { trackingTeam: 'ours', side: 'defense' }
  return { trackingTeam: 'opponent', side: 'defense' }
}

function plural(count: number, singular: string): string {
  const noun = count === 1
    ? singular
    : singular === 'identity'
      ? 'identities'
      : `${singular}s`
  return `${count} ${noun}`
}

export default function FootballCvImportPanel({ athletes, currentVideoTime, onImport }: Props) {
  const [parsed, setParsed] = useState<FootballCvParseResult>()
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [offsetSec, setOffsetSec] = useState(0)
  const [teamMappings, setTeamMappings] = useState<Record<string, FootballCvTeamMapping>>({})
  const [trackOptions, setTrackOptions] = useState<Record<string, FootballCvTrackOption>>({})

  const summaries = useMemo(
    () => parsed ? summarizeFootballCvTracks(parsed.data) : [],
    [parsed],
  )
  const teams = useMemo(
    () => [...new Set(summaries.map((summary) => summary.team))].sort(),
    [summaries],
  )
  const selectedKeys = useMemo(
    () => new Set(Object.entries(trackOptions).filter(([, option]) => option.selected).map(([key]) => key)),
    [trackOptions],
  )
  const alignment = useMemo(
    () => parsed ? suggestFootballCvAlignmentFrame(parsed.data, selectedKeys) : undefined,
    [parsed, selectedKeys],
  )
  const previewTracks = useMemo(
    () => buildFootballCvPlayerTracks({
      summaries,
      teamMappings,
      trackOptions,
      offsetSec,
      athletes,
    }),
    [athletes, offsetSec, summaries, teamMappings, trackOptions],
  )
  const unitErrors = useMemo(() => footballCvUnitLimitErrors(previewTracks), [previewTracks])

  function initializeImport(next: FootballCvParseResult, nextFileName: string) {
    const nextSummaries = summarizeFootballCvTracks(next.data)
    const selected = defaultFootballCvSelection(nextSummaries)
    const nextTeams = [...new Set(nextSummaries.map((summary) => summary.team))].sort()
    const mappings: Record<string, FootballCvTeamMapping> = {}
    nextTeams.forEach((team, index) => { mappings[team] = defaultTeamMapping(index) })
    const options: Record<string, FootballCvTrackOption> = {}
    nextSummaries.forEach((summary) => {
      options[summary.key] = {
        selected: selected.has(summary.key),
        label: summary.number ? `#${summary.number}` : undefined,
      }
    })
    setParsed(next)
    setFileName(nextFileName)
    setTeamMappings(mappings)
    setTrackOptions(options)
    setOffsetSec(0)
    setError(undefined)
    setMessage(undefined)
  }

  async function loadJson(file: File) {
    try {
      const text = await file.text()
      initializeImport(parseFootballCvTrackingJson(text), file.name)
    } catch (cause: unknown) {
      setParsed(undefined)
      setFileName(file.name)
      setError(cause instanceof Error ? cause.message : 'Could not read this tracking export.')
      setMessage(undefined)
    }
  }

  function updateTeamMapping(team: string, patch: Partial<FootballCvTeamMapping>) {
    setTeamMappings((current) => {
      const next = { ...current, [team]: { ...current[team], ...patch } }
      if (next[team].trackingTeam === 'opponent') {
        setTrackOptions((options) => Object.fromEntries(
          Object.entries(options).map(([key, option]) => [
            key,
            key.startsWith(`${team}::`) ? { ...option, athleteId: undefined } : option,
          ]),
        ))
      }
      return next
    })
  }

  function updateTrackOption(key: string, patch: Partial<FootballCvTrackOption>) {
    setTrackOptions((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }))
  }

  function chooseTopEleven(team: string) {
    const teamTracks = summaries
      .filter((summary) => summary.team === team)
      .sort((left, right) => right.pointCount - left.pointCount || right.durationSec - left.durationSec)
    const keep = new Set(teamTracks.slice(0, 11).map((summary) => summary.key))
    setTrackOptions((current) => Object.fromEntries(
      Object.entries(current).map(([key, option]) => [
        key,
        key.startsWith(`${team}::`) ? { ...option, selected: keep.has(key) } : option,
      ]),
    ))
  }

  function importTracks() {
    if (!parsed || previewTracks.length === 0) {
      setError('Select at least one valid player track before importing.')
      return
    }
    if (unitErrors.length > 0) {
      setError(unitErrors.join(' '))
      return
    }
    const formationStartTime = alignment
      ? Math.round((alignment.timeSec + offsetSec) * 1000) / 1000
      : undefined
    onImport({
      tracks: previewTracks,
      formationStartTime,
      source: parsed.data.meta.source,
      createdWith: parsed.data.meta.createdWith,
    })
    setMessage(`Imported ${plural(previewTracks.length, 'CV track')} into this unsaved play.`)
    setError(undefined)
  }

  return (
    <Card className="border-fai/25 bg-panel/70 p-4" data-testid="football-cv-importer">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-black text-chalk">Football CV tracking import</div>
          <div className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted">
            Load Claude&apos;s <code className="text-fai">fai_tracking.json</code>. FAI validates the normalized points, lets you identify each color-cluster team, maps known players only when you choose them, and builds editable Film Room trails.
          </div>
        </div>
        <label className="cursor-pointer rounded-lg border border-fai/40 bg-fai/10 px-3 py-2 text-xs font-black text-fai hover:bg-fai/15">
          Choose tracking JSON
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Choose Football CV tracking JSON"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void loadJson(file)
              event.target.value = ''
            }}
          />
        </label>
      </div>

      {error && <div className="mt-3 rounded-lg border border-down/40 bg-down/5 p-2 text-xs font-bold text-down">{error}</div>}
      {message && <div className="mt-3 rounded-lg border border-up/40 bg-up/5 p-2 text-xs font-bold text-up">{message}</div>}

      {parsed && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="fai">{fileName}</Pill>
            <Pill>{plural(parsed.data.frames.length, 'frame')}</Pill>
            <Pill>{plural(summaries.length, 'identity')}</Pill>
            {parsed.data.meta.fps && <Pill>{parsed.data.meta.fps.toFixed(1)} fps</Pill>}
            {parsed.data.meta.angle && <Pill>{parsed.data.meta.angle}</Pill>}
            {parsed.data.meta.createdWith && <Pill tone="gold">{parsed.data.meta.createdWith}</Pill>}
          </div>

          {parsed.warnings.length > 0 && (
            <div className="rounded-lg border border-gold/35 bg-gold/5 p-2 text-[11px] leading-relaxed text-gold">
              {parsed.warnings.join(' ')}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {teams.map((team) => {
              const mapping = teamMappings[team]
              const teamTracks = summaries.filter((summary) => summary.team === team)
              const selectedCount = teamTracks.filter((summary) => trackOptions[summary.key]?.selected).length
              return (
                <div key={team} className="rounded-xl border border-line bg-panel-2/35 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-black text-chalk">Color team {team}</div>
                    <button type="button" onClick={() => chooseTopEleven(team)} className="rounded border border-line px-2 py-1 text-[10px] font-black text-muted hover:text-chalk">
                      Select longest 11
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <select
                      value={mapping?.trackingTeam ?? 'opponent'}
                      onChange={(event) => updateTeamMapping(team, { trackingTeam: event.target.value as TrackingTeam })}
                      className={selectClass}
                      aria-label={`Team ${team} ownership`}
                    >
                      <option value="opponent">Opponent</option>
                      <option value="ours">Our team</option>
                    </select>
                    <select
                      value={mapping?.side ?? 'offense'}
                      onChange={(event) => updateTeamMapping(team, { side: event.target.value as PlaySide })}
                      className={selectClass}
                      aria-label={`Team ${team} unit`}
                    >
                      <option value="offense">Offense</option>
                      <option value="defense">Defense</option>
                      <option value="special">Special teams</option>
                    </select>
                  </div>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted">{selectedCount}/{teamTracks.length} selected</div>
                </div>
              )
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="text-[11px] font-bold text-muted">
              Timeline offset in the loaded video (seconds)
              <input
                type="number"
                min="0"
                step="0.01"
                value={offsetSec}
                onChange={(event) => setOffsetSec(Math.max(0, Number(event.target.value) || 0))}
                className={`${inputClass} mt-1 w-full`}
                aria-label="Football CV timeline offset"
              />
            </label>
            <button type="button" onClick={() => setOffsetSec(Math.max(0, Math.round(currentVideoTime * 1000) / 1000))} className="rounded-lg border border-line px-3 py-2 text-xs font-black text-chalk">
              Use current video time
            </button>
          </div>

          {alignment && (
            <div className="rounded-lg border border-fai/25 bg-fai/5 p-3 text-[11px] leading-relaxed text-muted">
              Suggested formation frame: <strong className="text-fai nums">{formatTrackTime(alignment.timeSec + offsetSec)}</strong> — the earliest frame with {alignment.visibleTracks}/{alignment.selectedTracks} selected identities visible. This selects an alignment frame; it does not invent a formation name.
            </div>
          )}

          <details className="rounded-xl border border-line bg-panel-2/25" open>
            <summary className="cursor-pointer px-3 py-2 text-xs font-black text-chalk">Review and identify tracks</summary>
            <div className="max-h-[28rem] space-y-2 overflow-y-auto border-t border-line p-3">
              {summaries.map((summary) => {
                const option = trackOptions[summary.key] ?? { selected: false }
                const mapping = teamMappings[summary.team]
                return (
                  <div key={summary.key} className={`grid gap-2 rounded-lg border p-2 lg:grid-cols-[auto_1fr_1fr_1.2fr] ${option.selected ? 'border-fai/35 bg-fai/5' : 'border-line bg-panel/40 opacity-70'}`}>
                    <label className="flex min-w-32 items-center gap-2 text-xs font-black text-chalk">
                      <input
                        type="checkbox"
                        checked={option.selected}
                        onChange={(event) => updateTrackOption(summary.key, { selected: event.target.checked })}
                        aria-label={`Import team ${summary.team} track ${summary.trackId}`}
                        className="accent-fai"
                      />
                      {summary.number ? `#${summary.number}` : `Track ${summary.trackId}`}
                    </label>
                    <input
                      value={option.label ?? ''}
                      onChange={(event) => updateTrackOption(summary.key, { label: event.target.value })}
                      placeholder={`Team ${summary.team} · Track ${summary.trackId}`}
                      className={inputClass}
                      aria-label={`Label team ${summary.team} track ${summary.trackId}`}
                    />
                    <input
                      value={option.role ?? ''}
                      onChange={(event) => updateTrackOption(summary.key, { role: event.target.value })}
                      placeholder="Role: X, Mike, LT…"
                      className={inputClass}
                      aria-label={`Role team ${summary.team} track ${summary.trackId}`}
                    />
                    {mapping?.trackingTeam === 'ours' ? (
                      <select
                        value={option.athleteId ?? ''}
                        onChange={(event) => updateTrackOption(summary.key, { athleteId: event.target.value || undefined })}
                        className={selectClass}
                        aria-label={`Roster athlete team ${summary.team} track ${summary.trackId}`}
                      >
                        <option value="">Unassigned roster athlete</option>
                        {athletes.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.name}</option>)}
                      </select>
                    ) : (
                      <div className="flex items-center text-[11px] text-muted">
                        {plural(summary.pointCount, 'point')} · {formatTrackTime(summary.durationSec)} tracked
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </details>

          {unitErrors.length > 0 && (
            <div className="rounded-lg border border-down/40 bg-down/5 p-2 text-xs font-bold text-down">{unitErrors.join(' ')}</div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-muted">
              Imported identities remain editable. FAI never assigns a rostered athlete from color or track ID alone.
            </div>
            <button
              type="button"
              onClick={importTracks}
              disabled={previewTracks.length === 0 || unitErrors.length > 0}
              className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Import {previewTracks.length} selected tracks
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
