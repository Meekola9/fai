import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { consolidateAthleteAliases, normalizeAthleteName } from '../lib/athleteIdentity'
import { useCloudSync, type CloudSyncApi } from './useCloudSync'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface StoreContextValue {
  data: Required<AppData>
  loading: boolean
  saveStatus: SaveStatus
  saveError?: string
  cloud: CloudSyncApi
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
  const dataRef = useRef<Required<AppData>>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string>()

  const persist = useCallback((next: Required<AppData>) => {
    setSaveStatus('saving')
    setSaveError(undefined)
    void store
      .save(next)
      .then(() => setSaveStatus('saved'))
      .catch((error: unknown) => {
        setSaveStatus('error')
        setSaveError(error instanceof Error ? error.message : 'Save failed.')
      })
  }, [])

  const replaceLocalFromCloud = useCallback((next: Required<AppData>) => {
    const normalized = consolidateAthleteAliases(normalizeAppData(next))
    dataRef.current = normalized
    setData(normalized)
    persist(normalized)
  }, [persist])

  const cloud = useCloudSync(data, replaceLocalFromCloud, !loading)

  useEffect(() => {
    let alive = true
    store
      .load()
      .then((loaded) => {
        if (!alive) return
        dataRef.current = loaded
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

  useEffect(() => { dataRef.current = data }, [data])

  function ensureWritable(): boolean {
    if (cloud.activeTeam && !cloud.canEdit) {
      setSaveStatus('error')
      setSaveError('Your team role is read-only. Ask an owner or admin for coach access.')
      return false
    }
    return true
  }

  function mutate(recipe: (current: Required<AppData>) => AppData): Required<AppData> {
    const next = consolidateAthleteAliases(normalizeAppData(recipe(dataRef.current)))
    dataRef.current = next
    setData(next)
    persist(next)
    return next
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
    cloud,
    computed,
    results,
    resultsForEvent(eventId) {
      return buildResults(computed, eventId)
    },
    resultByAthlete,

    addAthlete(athlete) {
      if (!ensureWritable()) return ''
      const record: Athlete = { ...athlete, id: newId('athlete') }
      mutate((current) => ({ ...current, athletes: [...current.athletes, record] }))
      cloud.queueUpsert('athlete', record)
      return record.id
    },
    updateAthlete(athlete) {
      if (!ensureWritable()) return
      mutate((current) => ({
        ...current,
        athletes: current.athletes.map((item) => (item.id === athlete.id ? athlete : item)),
      }))
      cloud.queueUpsert('athlete', athlete)
    },
    deleteAthlete(id) {
      if (!ensureWritable()) return
      const related = dataRef.current.sessions.filter((session) => session.athleteId === id)
      mutate((current) => ({
        ...current,
        athletes: current.athletes.filter((athlete) => athlete.id !== id),
        sessions: current.sessions.filter((session) => session.athleteId !== id),
      }))
      for (const session of related) cloud.queueDelete('session', session.id)
      cloud.queueDelete('athlete', id)
    },

    addEvent(event) {
      if (!ensureWritable()) return ''
      const record: TestingEvent = { ...event, id: newId('event'), createdAt: new Date().toISOString() }
      mutate((current) => ({ ...current, events: [...current.events, record] }))
      cloud.queueUpsert('event', record)
      return record.id
    },
    updateEvent(event) {
      if (!ensureWritable()) return
      mutate((current) => ({
        ...current,
        events: current.events.map((item) => (item.id === event.id ? event : item)),
      }))
      cloud.queueUpsert('event', event)
    },
    deleteEvent(id) {
      if (!ensureWritable()) return
      const related = dataRef.current.sessions.filter((session) => session.eventId === id)
      mutate((current) => ({
        ...current,
        events: current.events.filter((event) => event.id !== id),
        sessions: current.sessions.filter((session) => session.eventId !== id),
      }))
      for (const session of related) cloud.queueDelete('session', session.id)
      cloud.queueDelete('event', id)
    },

    addSession(session) {
      if (!ensureWritable()) return ''
      const record: TestSession = { ...session, id: newId('session'), createdAt: new Date().toISOString() }
      mutate((current) => ({ ...current, sessions: [...current.sessions, record] }))
      cloud.queueUpsert('session', record)
      return record.id
    },
    updateSession(session) {
      if (!ensureWritable()) return
      const record: TestSession = {
        ...session,
        createdAt: session.createdAt ?? dataRef.current.sessions.find((item) => item.id === session.id)?.createdAt ?? new Date().toISOString(),
      }
      mutate((current) => ({
        ...current,
        sessions: current.sessions.map((item) => (item.id === record.id ? record : item)),
      }))
      cloud.queueUpsert('session', record)
    },
    deleteSession(id) {
      if (!ensureWritable()) return
      mutate((current) => ({
        ...current,
        sessions: current.sessions.filter((session) => session.id !== id),
      }))
      cloud.queueDelete('session', id)
    },

    resetSample() {
      if (!ensureWritable()) return
      setSaveStatus('saving')
      void store
        .reset()
        .then((next) => {
          dataRef.current = next
          setData(next)
          setSaveStatus('saved')
          cloud.queueDataset(next, true)
        })
        .catch((error: unknown) => {
          setSaveStatus('error')
          setSaveError(error instanceof Error ? error.message : 'Reset failed.')
        })
    },
    replaceAll(next) {
      if (!ensureWritable()) return
      const normalized = consolidateAthleteAliases(next)
      dataRef.current = normalized
      setData(normalized)
      persist(normalized)
      cloud.queueDataset(normalized, true)
    },
    importCsvText(text, mode) {
      if (!ensureWritable()) return
      const parsed = consolidateAthleteAliases(importCsv(text))
      if (parsed.athletes.length === 0) {
        throw new Error('The file did not contain any valid athletes.')
      }
      if (mode === 'replace') {
        dataRef.current = parsed
        setData(parsed)
        persist(parsed)
        cloud.queueDataset(parsed, true)
        return
      }

      const next = mutate((current) => {
        const athleteIdMap = new Map<string, string>()
        const existingAthletes = [...current.athletes]
        for (const athlete of parsed.athletes) {
          const incomingName = normalizeAthleteName(athlete.name)
          const existing = existingAthletes.find(
            (item) => item.id === athlete.id || normalizeAthleteName(item.name) === incomingName,
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
              (item.name.trim().toLowerCase() === event.name.trim().toLowerCase() && item.startDate === event.startDate),
          )
          if (existing) eventIdMap.set(event.id, existing.id)
          else {
            existingEvents.push(event)
            eventIdMap.set(event.id, event.id)
          }
        }

        const existingSessionKeys = new Set(
          current.sessions.map((session) => `${session.id}|${session.athleteId}|${session.eventId}|${session.date}`),
        )
        const incomingSessions = parsed.sessions
          .map((session) => ({
            ...session,
            athleteId: athleteIdMap.get(session.athleteId) ?? session.athleteId,
            eventId: session.eventId ? eventIdMap.get(session.eventId) ?? session.eventId : session.eventId,
          }))
          .filter(
            (session) => !existingSessionKeys.has(`${session.id}|${session.athleteId}|${session.eventId}|${session.date}`),
          )

        return consolidateAthleteAliases({
          athletes: existingAthletes,
          events: existingEvents,
          sessions: [...current.sessions, ...incomingSessions],
        })
      })
      cloud.queueDataset(next, false)
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreContextValue {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used within StoreProvider')
  return context
}
