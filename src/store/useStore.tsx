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
import {
  clearLocalImportSnapshot,
  localImportCompleted,
  markLocalImportCompleted,
  preserveLocalImportSnapshot,
  readLocalImportSnapshot,
  store as localStore,
  newId,
} from './storage'
import {
  cloudDataIsEmpty,
  loadCloudData,
  loadTeamAccess,
  saveCloudData,
} from './cloud'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { importCsv } from '../data/csv'
import { mergeHistoricalData } from '../data/historicalSeed'
import { computeAll } from '../lib/compute'
import { buildResults } from '../lib/progress'
import { normalizeAppData } from '../lib/events'
import {
  consolidateAthleteAliases,
  normalizeAthleteName,
} from '../lib/athleteIdentity'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type StorageMode = 'local' | 'cloud'

interface ActiveTeam {
  id: string
  name: string
  role: string
}

interface StoreContextValue {
  data: Required<AppData>
  loading: boolean
  saveStatus: SaveStatus
  saveError?: string
  authError?: string
  cloudConfigured: boolean
  signedIn: boolean
  userEmail?: string
  teamName?: string
  teamRole?: string
  storageMode: StorageMode
  lastSyncedAt?: string
  localImportAvailable: boolean
  computed: ComputedSession[]
  results: AthleteResult[]
  resultsForEvent: (eventId: string) => AthleteResult[]
  resultByAthlete: Map<string, AthleteResult>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  importLocalToCloud: () => Promise<void>
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

interface AuthUserLike {
  id: string
  email?: string | null
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Required<AppData>>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string>()
  const [authError, setAuthError] = useState<string>()
  const [userId, setUserId] = useState<string>()
  const [userEmail, setUserEmail] = useState<string>()
  const [team, setTeam] = useState<ActiveTeam | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>()
  const [localImportAvailable, setLocalImportAvailable] = useState(false)

  useEffect(() => {
    let alive = true
    let activationNumber = 0

    async function showSignedOut() {
      const request = ++activationNumber
      const local = await localStore.load()
      if (!alive || request !== activationNumber) return
      setData(local)
      setUserId(undefined)
      setUserEmail(undefined)
      setTeam(null)
      setAuthError(undefined)
      setLastSyncedAt(undefined)
      setLocalImportAvailable(false)
      setSaveStatus('idle')
      setLoading(false)
    }

    async function activateUser(user: AuthUserLike) {
      const request = ++activationNumber
      setLoading(true)
      setAuthError(undefined)

      const local = await localStore.load()
      const access = await loadTeamAccess(user.id)
      if (!alive || request !== activationNumber) return

      setUserId(user.id)
      setUserEmail(user.email ?? undefined)

      if (!access) {
        setData(local)
        setTeam(null)
        setAuthError(
          'This login is valid, but it is not assigned to an FAI team. Add the user to team_members before continuing.',
        )
        setLoading(false)
        return
      }

      const cloud = await loadCloudData(access.id)
      if (!alive || request !== activationNumber) return

      let next = cloud
      if (cloudDataIsEmpty(cloud) && !cloudDataIsEmpty(local)) {
        await saveCloudData(access.id, local)
        next = local
        // The whole device dataset just became the team cloud, so the
        // one-time import has effectively already happened.
        markLocalImportCompleted(access.id)
        clearLocalImportSnapshot()
      } else if (
        !cloudDataIsEmpty(local) &&
        !localImportCompleted(access.id) &&
        !readLocalImportSnapshot()
      ) {
        // Preserve the pre-cloud device dataset before the cloud mirror
        // overwrites it, so it can be imported once from the Data page.
        preserveLocalImportSnapshot(local)
      }

      await localStore.save(next)
      if (!alive || request !== activationNumber) return

      setData(next)
      setTeam(access)
      setLocalImportAvailable(
        !localImportCompleted(access.id) && readLocalImportSnapshot() !== null,
      )
      setLastSyncedAt(new Date().toISOString())
      setSaveStatus('saved')
      setSaveError(undefined)
      setLoading(false)
    }

    async function initialize() {
      if (!isSupabaseConfigured || !supabase) {
        await showSignedOut()
        return
      }

      const { data: sessionData, error } = await supabase.auth.getSession()
      if (error) throw error

      if (sessionData.session?.user) {
        await activateUser(sessionData.session.user)
      } else {
        await showSignedOut()
      }
    }

    void initialize().catch((error: unknown) => {
      if (!alive) return
      setAuthError(
        error instanceof Error ? error.message : 'Could not initialize cloud storage.',
      )
      setLoading(false)
    })

    const authSubscription = supabase?.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!alive) return
        if (session?.user) {
          void activateUser(session.user).catch((error: unknown) => {
            if (!alive) return
            setAuthError(
              error instanceof Error ? error.message : 'Could not load the FAI team.',
            )
            setLoading(false)
          })
        } else {
          void showSignedOut().catch((error: unknown) => {
            if (!alive) return
            setAuthError(
              error instanceof Error ? error.message : 'Could not load local backup data.',
            )
            setLoading(false)
          })
        }
      }, 0)
    })

    return () => {
      alive = false
      authSubscription?.data.subscription.unsubscribe()
    }
  }, [])

  function persist(next: Required<AppData>) {
    setSaveStatus('saving')
    setSaveError(undefined)
    const activeTeam = team

    void (async () => {
      await localStore.save(next)
      if (activeTeam) {
        await saveCloudData(activeTeam.id, next)
        setLastSyncedAt(new Date().toISOString())
      }
      setSaveStatus('saved')
    })().catch((error: unknown) => {
      setSaveStatus('error')
      const message = error instanceof Error ? error.message : 'Save failed.'
      setSaveError(
        activeTeam
          ? `Saved to this device, but cloud synchronization failed: ${message}`
          : message,
      )
    })
  }

  function mutate(recipe: (current: Required<AppData>) => AppData) {
    setData((current) => {
      const next = consolidateAthleteAliases(normalizeAppData(recipe(current)))
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
    authError,
    cloudConfigured: isSupabaseConfigured,
    signedIn: Boolean(userId),
    userEmail,
    teamName: team?.name,
    teamRole: team?.role,
    storageMode: team ? 'cloud' : 'local',
    lastSyncedAt,
    localImportAvailable: Boolean(team) && localImportAvailable,
    computed,
    results,
    resultsForEvent(eventId) {
      return buildResults(computed, eventId)
    },
    resultByAthlete,

    async signIn(email, password) {
      if (!supabase) throw new Error('Supabase is not configured for this build.')
      setAuthError(undefined)
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        setLoading(false)
        setAuthError(error.message)
        throw error
      }
    },

    async signOut() {
      if (!supabase) return
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },

    async syncNow() {
      if (!team) return
      setSaveStatus('saving')
      setSaveError(undefined)
      try {
        const cloud = await loadCloudData(team.id)
        const next = cloudDataIsEmpty(cloud) ? data : cloud
        if (cloudDataIsEmpty(cloud) && !cloudDataIsEmpty(data)) {
          await saveCloudData(team.id, data)
        }
        await localStore.save(next)
        setData(next)
        setLastSyncedAt(new Date().toISOString())
        setSaveStatus('saved')
      } catch (error: unknown) {
        setSaveStatus('error')
        setSaveError(error instanceof Error ? error.message : 'Cloud sync failed.')
        throw error
      }
    },

    async importLocalToCloud() {
      if (!team) return
      const snapshot = readLocalImportSnapshot()
      if (!snapshot) {
        markLocalImportCompleted(team.id)
        setLocalImportAvailable(false)
        return
      }
      setSaveStatus('saving')
      setSaveError(undefined)
      try {
        const preserved = consolidateAthleteAliases(normalizeAppData(snapshot))
        // Cloud rows win on matching ids; device-only records are added.
        const merged = mergeHistoricalData(preserved, data)
        await saveCloudData(team.id, merged)
        await localStore.save(merged)
        markLocalImportCompleted(team.id)
        clearLocalImportSnapshot()
        setData(merged)
        setLocalImportAvailable(false)
        setLastSyncedAt(new Date().toISOString())
        setSaveStatus('saved')
      } catch (error: unknown) {
        setSaveStatus('error')
        setSaveError(
          error instanceof Error ? error.message : 'Local data import failed.',
        )
        throw error
      }
    },

    addAthlete(athlete) {
      const id = newId('athlete')
      mutate((current) => ({
        ...current,
        athletes: [...current.athletes, { ...athlete, id }],
      }))
      return id
    },
    updateAthlete(athlete) {
      mutate((current) => ({
        ...current,
        athletes: current.athletes.map((item) =>
          item.id === athlete.id ? athlete : item,
        ),
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
            ? {
                ...session,
                createdAt:
                  session.createdAt ?? item.createdAt ?? new Date().toISOString(),
              }
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
      void localStore
        .reset()
        .then(async (next) => {
          if (team) {
            await saveCloudData(team.id, next)
            setLastSyncedAt(new Date().toISOString())
          }
          setData(next)
          setSaveStatus('saved')
        })
        .catch((error: unknown) => {
          setSaveStatus('error')
          setSaveError(error instanceof Error ? error.message : 'Reset failed.')
        })
    },
    replaceAll(next) {
      const normalized = consolidateAthleteAliases(normalizeAppData(next))
      setData(normalized)
      persist(normalized)
    },
    importCsvText(text, mode) {
      const parsed = consolidateAthleteAliases(importCsv(text))
      if (parsed.athletes.length === 0) {
        throw new Error('The file did not contain any valid athletes.')
      }
      if (mode === 'replace') {
        setData(parsed)
        persist(parsed)
        return
      }

      mutate((current) => {
        const athleteIdMap = new Map<string, string>()
        const existingAthletes = [...current.athletes]
        for (const athlete of parsed.athletes) {
          const incomingName = normalizeAthleteName(athlete.name)
          const existing = existingAthletes.find(
            (item) =>
              item.id === athlete.id ||
              normalizeAthleteName(item.name) === incomingName,
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

        return consolidateAthleteAliases({
          athletes: existingAthletes,
          events: existingEvents,
          sessions: [...current.sessions, ...incomingSessions],
        })
      })
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
