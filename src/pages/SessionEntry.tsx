import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Card, Pill } from '../components/ui'
import { RAW_FIELDS_BY_DAY, TESTING_DAYS, DAY_TITLE } from '../data/fields'
import { TESTING_PHASES } from '../data/constants'
import type { TestSession, TestingPhase } from '../types'

const inputCls =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 text-base font-semibold text-chalk outline-none placeholder:text-muted/60 focus:border-fai'
const labelCls = 'text-xs font-semibold text-muted'

type Draft = Record<string, string>

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function SessionEntry() {
  const { data, addSession, updateSession, deleteSession } = useStore()
  const [params] = useSearchParams()

  const athletes = useMemo(
    () => [...data.athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [data.athletes],
  )
  const [athleteId, setAthleteId] = useState(params.get('athlete') ?? athletes[0]?.id ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [date, setDate] = useState(today())
  const [phase, setPhase] = useState<TestingPhase>('Baseline')
  const [draft, setDraft] = useState<Draft>({})
  const [savedFlash, setSavedFlash] = useState(false)

  const athleteSessions = useMemo(
    () =>
      data.sessions
        .filter((s) => s.athleteId === athleteId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.sessions, athleteId],
  )

  function resetForm() {
    setEditingId(null)
    setDate(today())
    setPhase('Baseline')
    setDraft({})
  }

  function loadSession(s: TestSession) {
    setEditingId(s.id)
    setDate(s.date)
    setPhase(s.phase)
    const d: Draft = {}
    for (const day of TESTING_DAYS) {
      for (const f of RAW_FIELDS_BY_DAY(day)) {
        const v = s[f.key]
        if (typeof v === 'number') d[f.key] = String(v)
      }
    }
    setDraft(d)
  }

  function save() {
    if (!athleteId) return
    const payload: Omit<TestSession, 'id'> = {
      athleteId,
      date,
      phase,
    }
    for (const day of TESTING_DAYS) {
      for (const f of RAW_FIELDS_BY_DAY(day)) {
        const raw = draft[f.key]
        if (raw !== undefined && raw.trim() !== '') {
          const n = Number(raw)
          if (Number.isFinite(n)) (payload as Record<string, unknown>)[f.key] = n
        }
      }
    }
    if (editingId) updateSession({ ...payload, id: editingId })
    else addSession(payload)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
    resetForm()
  }

  const athlete = data.athletes.find((a) => a.id === athleteId)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Enter Testing Data</h1>
        {savedFlash && <Pill tone="up">✓ Saved</Pill>}
      </div>

      {!athletes.length ? (
        <Card className="p-8 text-center text-muted">
          No athletes yet.{' '}
          <Link to="/athletes/new" className="font-semibold text-fai">
            Add one first →
          </Link>
        </Card>
      ) : (
        <>
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className={labelCls}>Athlete</label>
                <select
                  className={inputCls}
                  value={athleteId}
                  onChange={(e) => {
                    setAthleteId(e.target.value)
                    resetForm()
                  }}
                >
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Testing Date</label>
                <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Testing Phase</label>
                <select className={inputCls} value={phase} onChange={(e) => setPhase(e.target.value as TestingPhase)}>
                  {TESTING_PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {athlete && (
              <div className="text-xs text-muted">
                {athlete.position} · {athlete.positionGroup} · Grade {athlete.grade}
                {editingId && <span className="ml-2 text-flame">· editing existing session</span>}
              </div>
            )}
          </Card>

          {/* Day-by-day inputs */}
          {TESTING_DAYS.map((day) => (
            <Card key={day} className="p-5">
              <div className="mb-3 text-sm font-black uppercase tracking-wide text-chalk">
                {DAY_TITLE[day]}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {RAW_FIELDS_BY_DAY(day).map((f) => (
                  <div key={f.key}>
                    <label className={labelCls}>
                      {f.label} <span className="text-muted/60">({f.unit})</span>
                    </label>
                    <input
                      className={inputCls}
                      type="number"
                      inputMode="decimal"
                      step={f.step}
                      placeholder={f.placeholder}
                      value={draft[f.key] ?? ''}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <div className="sticky bottom-4 flex gap-2">
            <button
              onClick={save}
              className="flex-1 rounded-xl bg-fai px-6 py-3 text-base font-black text-ink shadow-lg hover:bg-fai/90"
            >
              {editingId ? 'Update Session' : 'Save Testing Session'}
            </button>
            {editingId && (
              <button onClick={resetForm} className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-muted hover:text-chalk">
                Cancel
              </button>
            )}
          </div>

          {/* Existing sessions */}
          {athleteSessions.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
                Saved Sessions ({athleteSessions.length})
              </div>
              <div className="space-y-1.5">
                {athleteSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                      editingId === s.id ? 'border-fai/40 bg-fai/5' : 'border-line bg-panel-2/40'
                    }`}
                  >
                    <div className="flex-1">
                      <span className="font-bold text-chalk">{s.date}</span>
                      <span className="ml-2 text-sm text-muted">{s.phase}</span>
                    </div>
                    <button onClick={() => loadSession(s)} className="text-sm font-semibold text-fai hover:underline">
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete the ${s.phase} session from ${s.date}?`)) {
                          deleteSession(s.id)
                          if (editingId === s.id) resetForm()
                        }
                      }}
                      className="text-sm font-semibold text-down hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
