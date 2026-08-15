import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Card, SectionTitle } from './ui'
import {
  deriveGameImpactCandidates,
  type GameImpactCandidate,
  type GameImpactParseResult,
} from '../lib/gameImpactImport'

const inputClass =
  'rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function GameImpactImport() {
  const { data, addPlay, canEdit } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<GameImpactParseResult>()
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [included, setIncluded] = useState<Record<string, boolean>>({})
  const [opponent, setOpponent] = useState('')
  const [date, setDate] = useState(todayIso())
  const [message, setMessage] = useState<string>()

  const roster = useMemo(
    () => [...data.athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [data.athletes],
  )

  if (!canEdit) return null

  function parse(nextText = text) {
    const result = deriveGameImpactCandidates(nextText, data.athletes)
    if (result.candidates.length === 0) {
      setParsed(undefined)
      setMessage(
        result.playsScanned === 0
          ? 'No plays found. Paste the Hudl breakdown (with the ODK and RESULT columns) or upload the CSV.'
          : `Scanned ${result.playsScanned} plays but found no scorable events (TDs, explosions, turnovers, TFLs).`,
      )
      return
    }
    const nextAssignments: Record<string, string> = {}
    const nextIncluded: Record<string, boolean> = {}
    for (const candidate of result.candidates) {
      nextAssignments[candidate.id] = candidate.matchedAthleteId ?? ''
      nextIncluded[candidate.id] = true
    }
    setParsed(result)
    setAssignments(nextAssignments)
    setIncluded(nextIncluded)
    setMessage(
      `${result.candidates.length} events detected across ${result.playsScanned} plays · ${result.autoMatched} auto-matched to your roster.`,
    )
  }

  async function loadFile(file: File) {
    const content = await file.text()
    setText(content)
    parse(content)
  }

  function commit() {
    if (!parsed) return
    let added = 0
    let skipped = 0
    for (const candidate of parsed.candidates) {
      if (!included[candidate.id]) continue
      const athleteId = assignments[candidate.id]
      if (!athleteId) {
        skipped += 1
        continue
      }
      addPlay({
        athleteId,
        type: candidate.typeKey,
        date,
        opponent: opponent.trim() || undefined,
      })
      added += 1
    }
    setMessage(
      `Added ${added} impact event${added === 1 ? '' : 's'}.` +
        (skipped > 0 ? ` ${skipped} skipped — assign a player to include them.` : ''),
    )
    setParsed(undefined)
    setText('')
  }

  const readyCount = parsed
    ? parsed.candidates.filter((c) => included[c.id] && assignments[c.id]).length
    : 0

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Import Game from Hudl → Impact</SectionTitle>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-black text-chalk hover:border-fai/50"
        >
          {expanded ? 'Hide' : 'Open importer'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          <p className="text-[12px] leading-relaxed text-muted">
            Upload or paste your Hudl game breakdown. FAI reads each play&apos;s result and gain to detect
            scorable events — touchdowns, explosions (20+), turnovers, TFLs — and, when your export tags the
            ball carrier / passer / receiver, matches them to your roster. Unmatched plays wait for you to pick
            the player. Nothing is saved until you press add, and FAI never invents or merges a player.
          </p>

          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-bold text-chalk hover:border-fai/50">
              Upload CSV / TSV
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void loadFile(file)
                  event.target.value = ''
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => parse()}
              className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink disabled:opacity-40"
              disabled={!text.trim()}
            >
              Detect events from paste
            </button>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste the Hudl breakdown table here (include the ODK and RESULT columns)…"
            className={inputClass + ' min-h-28 w-full resize-y font-mono text-xs'}
          />

          {message && <div className="rounded-lg border border-line bg-panel-2/40 p-2 text-xs font-bold text-chalk">{message}</div>}

          {parsed && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={opponent}
                  onChange={(event) => setOpponent(event.target.value)}
                  placeholder="Opponent (applied to all events)"
                  className={inputClass}
                />
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value || todayIso())}
                  className={inputClass}
                />
              </div>

              <div className="overflow-hidden rounded-xl border border-line">
                <div className="max-h-[26rem] divide-y divide-line overflow-y-auto">
                  {parsed.candidates.map((candidate) => (
                    <CandidateRow
                      key={candidate.id}
                      candidate={candidate}
                      roster={roster}
                      included={included[candidate.id] ?? false}
                      athleteId={assignments[candidate.id] ?? ''}
                      onToggle={(value) => setIncluded((current) => ({ ...current, [candidate.id]: value }))}
                      onAssign={(value) => setAssignments((current) => ({ ...current, [candidate.id]: value }))}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-muted">
                  Havoc goes to defenders, Playmaker to offense. Points follow your impact catalog.
                </div>
                <button
                  type="button"
                  onClick={commit}
                  disabled={readyCount === 0}
                  className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Add {readyCount} impact event{readyCount === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function CandidateRow({
  candidate,
  roster,
  included,
  athleteId,
  onToggle,
  onAssign,
}: {
  candidate: GameImpactCandidate
  roster: { id: string; name: string }[]
  included: boolean
  athleteId: string
  onToggle: (value: boolean) => void
  onAssign: (value: string) => void
}) {
  const pointsTone = candidate.points < 0 ? 'text-down' : candidate.category === 'havoc' ? 'text-fai' : 'text-up'
  return (
    <div className={`grid gap-2 p-2 lg:grid-cols-[auto_1.4fr_1.4fr] lg:items-center ${included ? '' : 'opacity-50'}`}>
      <label className="flex items-center gap-2 text-xs font-black text-chalk">
        <input type="checkbox" checked={included} onChange={(event) => onToggle(event.target.checked)} className="accent-fai" />
        <span className="w-8 text-muted nums">#{candidate.playNumber}</span>
      </label>
      <div className="flex items-center gap-2 text-xs">
        <span>{candidate.emoji}</span>
        <span className="font-black text-chalk">{candidate.label}</span>
        <span className={`font-black nums ${pointsTone}`}>{candidate.points > 0 ? `+${candidate.points}` : candidate.points}</span>
        <span className="truncate text-[10px] uppercase tracking-wide text-muted">
          {candidate.unit} · {candidate.resultText}{candidate.gain !== undefined ? ` · ${candidate.gain} yd` : ''}
        </span>
      </div>
      <select
        value={athleteId}
        onChange={(event) => onAssign(event.target.value)}
        className={inputClass + ' w-full py-1.5 text-xs' + (candidate.ambiguous && !athleteId ? ' border-gold/60' : '')}
        aria-label={`Assign player for play ${candidate.playNumber} ${candidate.label}`}
      >
        <option value="">
          {candidate.playerName
            ? candidate.ambiguous
              ? `Tagged "${candidate.playerName}" — pick player`
              : `Unmatched "${candidate.playerName}" — pick player`
            : 'Assign player…'}
        </option>
        {roster.map((athlete) => (
          <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
        ))}
      </select>
    </div>
  )
}
