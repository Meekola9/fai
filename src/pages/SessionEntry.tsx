import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Card, Pill } from '../components/ui'
import { RAW_FIELDS_BY_DAY, TESTING_DAYS, DAY_TITLE } from '../data/fields'
import { TESTING_PHASES } from '../data/constants'
import { validateSession } from '../lib/events'
import type { TestSession, TestingPhase } from '../types'

const inputClass =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 text-base font-semibold text-chalk outline-none placeholder:text-muted/60 focus:border-fai'
const labelClass = 'text-xs font-semibold text-muted'
type Draft = Record<string, string>

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function SessionEntry() {
  const {
    data,
    addEvent,
    addSession,
    updateSession,
    deleteSession,
    saveStatus,
    saveError,
  } = useStore()
  const [params] = useSearchParams()

  const athletes = useMemo(
    () => [...data.athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [data.athletes],
  )
  const events = useMemo(
    () => [...data.events].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [data.events],
  )

  const [athleteId, setAthleteId] = useState(params.get('athlete') ?? athletes[0]?.id ?? '')
  const [eventId, setEventId] = useState(params.get('event') ?? events[0]?.id ?? '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [date, setDate] = useState(today())
  const [draft, setDraft] = useState<Draft>({})
  const [errors, setErrors] = useState<string[]>([])
  const [showNewEvent, setShowNewEvent] = useState(events.length === 0)
  const [eventName, setEventName] = useState('')
  const [eventPhase, setEventPhase] = useState<TestingPhase>('Baseline')
  const [eventStart, setEventStart] = useState(today())

  const selectedEvent = data.events.find((event) => event.id === eventId)
  const athlete = data.athletes.find((item) => item.id === athleteId)
  const athleteSessions = useMemo(
    () =>
      data.sessions
        .filter(
          (session) =>
            session.athleteId === athleteId && (!eventId || session.eventId === eventId),
        )
        .sort((a, b) =>
          `${b.date}|${b.createdAt ?? ''}`.localeCompare(`${a.date}|${a.createdAt ?? ''}`),
        ),
    [data.sessions, athleteId, eventId],
  )

  function resetForm() {
    setEditingId(null)
    setDate(today())
    setDraft({})
    setErrors([])
  }

  function createEvent() {
    const name = eventName.trim()
    if (!name) {
      setErrors(['Enter a name for the testing event.'])
      return
    }
    const id = addEvent({
      name,
      phase: eventPhase,
      startDate: eventStart,
      status: 'open',
    })
    setEventId(id)
    setDate(eventStart)
    setEventName('')
    setShowNewEvent(false)
    setErrors([])
  }

  function loadSession(session: TestSession) {
    setEditingId(session.id)
    setEventId(session.eventId ?? '')
    setDate(session.date)
    const nextDraft: Draft = {}
    for (const day of TESTING_DAYS) {
      for (const field of RAW_FIELDS_BY_DAY(day)) {
        const value = session[field.key]
        if (typeof value === 'number') nextDraft[field.key] = String(value)
      }
    }
    setDraft(nextDraft)
    setErrors([])
  }

  function save() {
    if (!athlete || !selectedEvent) {
      setErrors(['Select an athlete and a testing event.'])
      return
    }

    const payload: Omit<TestSession, 'id'> = {
      athleteId,
      eventId,
      date,
      phase: selectedEvent.phase,
      createdAt: editingId
        ? data.sessions.find((session) => session.id === editingId)?.createdAt
        : new Date().toISOString(),
      gradeSnapshot: athlete.grade,
      positionSnapshot: athlete.position,
      positionGroupSnapshot: athlete.positionGroup,
      weightLbsSnapshot: athlete.weightLbs,
    }

    for (const day of TESTING_DAYS) {
      for (const field of RAW_FIELDS_BY_DAY(day)) {
        const raw = draft[field.key]
        if (raw !== undefined && raw.trim() !== '') {
          const numeric = Number(raw)
          if (Number.isFinite(numeric)) {
            ;(payload as unknown as Record<string, unknown>)[field.key] = numeric
          }
        }
      }
    }

    const validation = validateSession(payload)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    if (editingId) updateSession({ ...payload, id: editingId })
    else addSession(payload)
    resetForm()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black tracking-tight">Enter Testing Data</h1>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <Pill>Saving…</Pill>}
          {saveStatus === 'saved' && <Pill tone="up">✓ Saved locally</Pill>}
          {saveStatus === 'error' && <Pill tone="down">Save failed</Pill>}
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
          {saveError}
        </div>
      )}

      {errors.length > 0 && (
        <Card className="border-down/40 bg-down/5 p-4">
          <div className="font-bold text-down">Fix before saving</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-chalk">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </Card>
      )}

      {!athletes.length ? (
        <Card className="p-8 text-center text-muted">
          No athletes yet.{' '}
          <Link to="/athletes/new" className="font-semibold text-fai">Add one first →</Link>
        </Card>
      ) : (
        <>
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm font-black uppercase tracking-wide text-chalk">Testing Event</div>
                <div className="text-xs text-muted">Use one event for Monday, Tuesday, and Wednesday.</div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewEvent((current) => !current)}
                className="rounded-lg border border-fai/40 px-3 py-1.5 text-sm font-bold text-fai hover:bg-fai/10"
              >
                {showNewEvent ? 'Cancel' : '+ New Event'}
              </button>
            </div>

            {showNewEvent ? (
              <div className="grid gap-3 rounded-xl border border-line bg-panel-2/40 p-4 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label className={labelClass}>Event Name</label>
                  <input
                    className={inputClass}
                    value={eventName}
                    onChange={(event) => setEventName(event.target.value)}
                    placeholder="Summer Combine 2026"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phase</label>
                  <select
                    className={inputClass}
                    value={eventPhase}
                    onChange={(event) => setEventPhase(event.target.value as TestingPhase)}
                  >
                    {TESTING_PHASES.map((phase) => <option key={phase}>{phase}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input className={inputClass} type="date" value={eventStart} onChange={(event) => setEventStart(event.target.value)} />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={createEvent} className="w-full rounded-lg bg-fai px-4 py-2 font-bold text-ink">
                    Create Event
                  </button>
                </div>
              </div>
            ) : (
              <select
                className={inputClass}
                value={eventId}
                onChange={(event) => {
                  setEventId(event.target.value)
                  resetForm()
                }}
              >
                <option value="">Select an event…</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} · {event.phase} · {event.startDate}
                  </option>
                ))}
              </select>
            )}
          </Card>

          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Athlete</label>
                <select
                  className={inputClass}
                  value={athleteId}
                  onChange={(event) => {
                    setAthleteId(event.target.value)
                    resetForm()
                  }}
                >
                  {athletes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Entry Date</label>
                <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
            </div>
            {athlete && (
              <div className="text-xs text-muted">
                Snapshot: {athlete.position} · {athlete.positionGroup} · Grade {athlete.grade} · {athlete.weightLbs} lbs
                {editingId && <span className="ml-2 text-flame">· editing saved entry</span>}
              </div>
            )}
          </Card>

          {TESTING_DAYS.map((day) => (
            <Card key={day} className="p-5">
              <div className="mb-3 text-sm font-black uppercase tracking-wide text-chalk">{DAY_TITLE[day]}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {RAW_FIELDS_BY_DAY(day).map((field) => (
                  <div key={field.key}>
                    <label className={labelClass}>
                      {field.label} <span className="text-muted/60">({field.unit})</span>
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      inputMode="decimal"
                      step={field.step}
                      placeholder={field.placeholder}
                      value={draft[field.key] ?? ''}
                      onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <div className="sticky bottom-4 flex gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-xl bg-fai px-6 py-3 text-base font-black text-ink shadow-lg hover:bg-fai/90"
            >
              {editingId ? 'Update Entry' : 'Save Event Entry'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-muted hover:text-chalk">
                Cancel
              </button>
            )}
          </div>

          {athleteSessions.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
                Entries in this event ({athleteSessions.length})
              </div>
              <div className="space-y-1.5">
                {athleteSessions.map((session) => (
                  <div key={session.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${editingId === session.id ? 'border-fai/40 bg-fai/5' : 'border-line bg-panel-2/40'}`}>
                    <div className="flex-1">
                      <span className="font-bold text-chalk">{session.date}</span>
                      <span className="ml-2 text-sm text-muted">{selectedEvent?.name}</span>
                    </div>
                    <button type="button" onClick={() => loadSession(session)} className="text-sm font-semibold text-fai hover:underline">Edit</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete this testing entry from ${session.date}?`)) {
                          deleteSession(session.id)
                          if (editingId === session.id) resetForm()
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
