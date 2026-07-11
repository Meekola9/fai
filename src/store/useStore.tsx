import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppData,
  Athlete,
  AthleteResult,
  ComputedSession,
  TestSession,
  TestingEvent,
} from '../types'
import { store, newId } from './storage'
import { importCsv } from '../data/csv'
import { computeAll } from '../lib/compute'
import { buildResults } from '../lib/progress'
import { normalizeAppData } from '../lib/events'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface StoreContextValue {
  data: Required<AppData>
  loading: boolean
  saveStatus: SaveStatus
  saveError?: string
  computed: ComputedSession[]
  results: AthleteResult[]
  resultsForEvent: (eventId: string) => AthleteResult[]
  resultByAthlete: Map<string, AthleteResult>
  addAthlete: (athlete: Omit<Athlete, 'id'>) => string
  updateAthlete: (athlete: Athlete) => void
  deleteAthlete: (id: string) => void
  addEvent: (event: Omit<TestingEvent, 'id' | 'createdAt'>) => string
  updateEvent: (event: TestingEvent) => void
  deleteEvent: (id: string) => void
  addSession: (session: Omit<TestSession, 'id' | 'createdAt'>) => string
  updateSession: (session: TestSession) => void
  deleteSession: (id: string) => void
  resetSample: () => void
  replaceAll: (data: AppData) => void
  importCsvText: (text: string, mode: 'merge' | 'replace') => void
}

const StoreContext = createContext<StoreContextValue | null>(null)
const EMPTY: Required<AppData> = { athletes: [], sessions: [], events: [] }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Required<AppData>>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string>()

  useEffect(() => {
    let alive = true
    store
      .load()
      .then((loaded) => {
        if (!alive) return
        setData(loaded)
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (!alive) return
        setSaveStatus('error')
        setSaveError(error instanceof Error ? error.message : 'Could not load saved data.')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  function persist(next: Required<AppData>) {
    setSaveStatus('saving')
    setSaveError(undefined)
    void store
      .save(next)
      .then(() => setSaveStatus('saved'))
      .catch((error: unknown) => {
        setSaveStatus('error')
        setSaveError(error instanceof Error ? error.message : 'Save failed.')
      })
  }

  function mutate(recipe: (current: Required<AppData>) => AppData) {
    setData((current) => {
      const next = normalizeAppData(recipe(current))
      persist(next)
      return next
    })
  }

  const computed = useMemo(() => computeAll(data), [data])
  const results = useMemo(() => buildResults(computed), [computed])
  const resultByAthlete = useMemo(
    () => new Map(results.map((result) => [result.athlete.id, result])),
    [results],
  )

  const value: StoreContextValue = {
    data,
    loading,
    saveStatus,
    saveError,
    computed,
    results,
    resultsForEvent(eventId) {
      return buildResults(computed, eventId)
    },
    resultByAthlete,

    addAthlete(athlete) {
      const id = newId('athlete')
      mutate((current) => ({ ...current, athletes: [...current.athletes, { ...athlete, id }] }))
      return id
    },
    updateAthlete(athlete) {
      mutate((current) => ({
        ...current,
        athletes: current.athletes.map((item) => (item.id === athlete.id ? athlete : item)),
      }))
    },
    deleteAthlete(id) {
      mutate((current) => ({
        ...current,
        athletes: current.athletes.filter((athlete) => athlete.id !== id),
        sessions: current.sessions.filter((session) => session.athleteId !== id),
      }))
    },

    addEvent(event) {
      const id = newId('event')
      const createdAt = new Date().toISOString()
      mutate((current) => ({
        ...current,
        events: [...current.events, { ...event, id, createdAt }],
      }))
      return id
    },
    updateEvent(event) {
      mutate((current) => ({
        ...current,
        events: current.events.map((item) => (item.id === event.id ? event : item)),
      }))
    },
    deleteEvent(id) {
      mutate((current) => ({
        ...current,
        events: current.events.filter((event) => event.id !== id),
        sessions: current.sessions.filter((session) => session.eventId !== id),
      }))
    },

    addSession(session) {
      const id = newId('session')
      const createdAt = new Date().toISOString()
      mutate((current) => ({
        ...current,
        sessions: [...current.sessions, { ...session, id, createdAt }],
      }))
      return id
    },
    updateSession(session) {
      mutate((current) => ({
        ...current,
        sessions: current.sessions.map((item) =>
          item.id === session.id
            ? { ...session, createdAt: session.createdAt ?? item.createdAt ?? new Date().toISOString() }
            : item,
        ),
      }))
    },
    deleteSession(id) {
      mutate((current) => ({
        ...current,
        sessions: current.sessions.filter((session) => session.id !== id),
      }))
    },

    resetSample() {
      setSaveStatus('saving')
      void store
        .reset()
        .then((next) => {
          setData(next)
          setSaveStatus('saved')
        })
        .catch((error: unknown) => {
          setSaveStatus('error')
          setSaveError(error instanceof Error ? error.message : 'Reset failed.')
        })
    },
    replaceAll(next) {
      const normalized = normalizeAppData(next)
      setData(normalized)
      persist(normalized)
    },
    importCsvText(text, mode) {
      const parsed = normalizeAppData(importCsv(text))
      if (parsed.athletes.length === 0) {
        throw new Error('The file did not contain any valid athletes.')
      }
      if (mode === 'replace') {
        this.replaceAll(parsed)
        return
      }

      mutate((current) => {
        const athleteIdMap = new Map<string, string>()
        const existingAthletes = [...current.athletes]
        for (const athlete of parsed.athletes) {
          const existing = existingAthletes.find(
            (item) =>
              item.id === athlete.id ||
              (item.name.trim().toLowerCase() === athlete.name.trim().toLowerCase() &&
                item.grade === athlete.grade),
          )
          if (existing) athleteIdMap.set(athlete.id, existing.id)
          else {
            existingAthletes.push(athlete)
            athleteIdMap.set(athlete.id, athlete.id)
          }
        }

        const eventIdMap = new Map<string, string>()
        const existingEvents = [...current.events]
        for (const event of parsed.events) {
          const existing = existingEvents.find(
            (item) =>
              item.id === event.id ||
              (item.name.trim().toLowerCase() === event.name.trim().toLowerCase() &&
                item.startDate === event.startDate),
          )
          if (existing) eventIdMap.set(event.id, existing.id)
          else {
            existingEvents.push(event)
            eventIdMap.set(event.id, event.id)
          }
        }

        const existingSessionKeys = new Set(
          current.sessions.map(
            (session) =>
              `${session.id}|${session.athleteId}|${session.eventId}|${session.date}`,
          ),
        )
        const incomingSessions = parsed.sessions
          .map((session) => ({
            ...session,
            athleteId: athleteIdMap.get(session.athleteId) ?? session.athleteId,
            eventId: session.eventId
              ? eventIdMap.get(session.eventId) ?? session.eventId
              : session.eventId,
          }))
          .filter(
            (session) =>
              !existingSessionKeys.has(
                `${session.id}|${session.athleteId}|${session.eventId}|${session.date}`,
              ),
          )

        return {
          athletes: existingAthletes,
          events: existingEvents,
          sessions: [...current.sessions, ...incomingSessions],
        }
      })
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used within StoreProvider')
  return context
}
