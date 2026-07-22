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
  PlayEvent,
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
  loadPublicTeamData,
  loadTeamAccess,
  saveCloudData,
} from './cloud'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { importCsv } from '../data/csv'
import {
  historicalSeedData,
  mergeHistoricalData,
  SEED_VERSION,
} from '../data/historicalSeed'
import { gradeLabel } from '../lib/alumni'
import { computeAll } from '../lib/compute'
import { buildResults } from '../lib/progress'
import { buildImpact } from '../lib/impact'
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
  publicTeamName?: string
  viewerMode: boolean
  canEdit: boolean
  storageMode: StorageMode
  lastSyncedAt?: string
  localImportAvailable: boolean
  computed: ComputedSession[]
  results: AthleteResult[]
  resultsForEvent: (eventId: string) => AthleteResult[]
  resultByAthlete: Map<string, AthleteResult>
  gradeLabelFor: (athlete: Athlete, style?: 'short' | 'long') => string
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
  addPlay: (play: Omit<PlayEvent, 'id' | 'createdAt'>) => string
  deletePlay: (id: string) => void
  resetSample: () => void
  replaceAll: (data: AppData) => void
  importCsvText: (text: string, mode: 'merge' | 'replace') => void
}

const StoreContext = createContext<StoreContextValue | null>(null)
const EMPTY: Required<AppData> = { athletes: [], sessions: [], events: [], plays: [] }

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
  const [viewerMode, setViewerMode] = useState(false)
  const [publicTeamName, setPublicTeamName] = useState<string>()

  useEffect(() => {
    let alive = true
    let activationNumber = 0

    async function showSignedOut() {
      const request = ++activationNumber
      const local = await localStore.load()

      // Signed-out visitors get a read-only live view of the team cloud when
      // the public-read policies allow it. The public data is deliberately
      // NOT written to local storage so a coach's pre-login on-device
      // dataset (and its one-time import snapshot) is never overwritten.
      let next = local
      let viewer = false
      let publicName: string | undefined
      if (isSupabaseConfigured && supabase) {
        try {
          const pub = await loadPublicTeamData()
          if (pub && !cloudDataIsEmpty(pub.data)) {
            next = pub.data
            viewer = true
            publicName = pub.teamName
          }
        } catch {
          // Anonymous read unavailable (policies missing or offline);
          // fall back to the on-device copy.
        }
      }

      if (!alive || request !== activationNumber) return
      setData(next)
      setUserId(undefined)
      setUserEmail(undefined)
      setTeam(null)
      setViewerMode(viewer)
      setPublicTeamName(publicName)
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
      setViewerMode(false)
      setPublicTeamName(undefined)

      if (!access) {
        setData(local)
        setTeam(null)
        setAuthError(
          'This login is valid, but it is not assigned to an FAI team. Add the user to team_members before continuing.',
        )
        setLoading(false)
        return
      }

      // A cloud failure past this point must not lock the coach out: the
      // on-device copy is the offline cache, so fall back to it and surface
      // the sync error instead of blocking the whole app.
      let cloud: Required<AppData> | null = null
      let cloudError: string | undefined
      try {
        cloud = await loadCloudData(access.id)
      } catch (error: unknown) {
        cloudError =
          error instanceof Error ? error.message : 'Could not load cloud data.'
      }
      if (!alive || request !== activationNumber) return

      let next = cloud ?? local
      if (cloud && cloudDataIsEmpty(cloud) && !cloudDataIsEmpty(local)) {
        next = local
        try {
          await saveCloudData(access.id, local)
          // The whole device dataset just became the team cloud, so the
          // one-time import has effectively already happened.
          markLocalImportCompleted(access.id)
          clearLocalImportSnapshot()
        } catch (error: unknown) {
          cloudError =
            error instanceof Error ? error.message : 'First cloud upload failed.'
        }
      } else if (
        cloud &&
        !cloudDataIsEmpty(local) &&
        !localImportCompleted(access.id) &&
        !readLocalImportSnapshot()
      ) {
        // Preserve the pre-cloud device dataset before the cloud mirror
        // overwrites it, so it can be imported once from the Data page.
        preserveLocalImportSnapshot(local)
      }

      // When the bundled historical archive gains records (new season upload),
      // merge them into the team cloud exactly once per seed version. Cloud
      // rows win on matching ids, so coach edits are never overwritten.
      if (cloud && !cloudDataIsEmpty(cloud)) {
        const seedSyncFlag = `fai:seed-sync:${SEED_VERSION}:${access.id}`
        let seedSynced = true
        try {
          seedSynced = localStorage.getItem(seedSyncFlag) === 'true'
        } catch {
          // Storage unavailable: keep true and skip the sync this session.
        }
        if (!seedSynced) {
          try {
            const seed = await historicalSeedData()
            const merged = mergeHistoricalData(seed, next)
            if (
              merged.athletes.length !== next.athletes.length ||
              merged.events.length !== next.events.length ||
              merged.sessions.length !== next.sessions.length
            ) {
              await saveCloudData(access.id, merged)
              next = merged
            }
            try {
              localStorage.setItem(seedSyncFlag, 'true')
            } catch {
              // Storage unavailable; worst case the merge re-runs and no-ops.
            }
          } catch (error: unknown) {
            cloudError =
              cloudError ??
              (error instanceof Error
                ? error.message
                : 'Could not sync the bundled historical baseline.')
          }
        }
      }
      if (!alive || request !== activationNumber) return

      await localStore.save(next)
      if (!alive || request !== activationNumber) return

      setData(next)
      setTeam(access)
      setLocalImportAvailable(
        !localImportCompleted(access.id) && readLocalImportSnapshot() !== null,
      )
      if (cloudError) {
        setSaveStatus('error')
        setSaveError(
          `Working from the on-device copy. Cloud sync failed: ${cloudError}`,
        )
      } else {
        setLastSyncedAt(new Date().toISOString())
        setSaveStatus('saved')
        setSaveError(undefined)
      }
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
    // Read-only public view: never mutate or persist over the team data.
    if (viewerMode) return
    setData((current) => {
      const next = consolidateAthleteAliases(normalizeAppData(recipe(current)))
      persist(next)
      return next
    })
  }

  const computed = useMemo(() => computeAll(data), [data])
  const impactBoost = useMemo(
    () => buildImpact(data.plays, data.athletes).boostByAthlete,
    [data.plays, data.athletes],
  )
  const results = useMemo(() => buildResults(computed, undefined, impactBoost), [computed, impactBoost])
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
    publicTeamName,
    viewerMode,
    canEdit: !viewerMode,
    storageMode: team ? 'cloud' : 'local',
    lastSyncedAt,
    localImportAvailable: Boolean(team) && localImportAvailable,
    computed,
    results,
    resultsForEvent(eventId) {
      return buildResults(computed, eventId, impactBoost)
    },
    resultByAthlete,
    gradeLabelFor(athlete, style = 'short') {
      return gradeLabel(athlete, data.sessions, style)
    },

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
        plays: current.plays.filter((play) => play.athleteId !== id),
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

    addPlay(play) {
      const id = newId('play')
      const createdAt = new Date().toISOString()
      mutate((current) => ({
        ...current,
        plays: [...current.plays, { ...play, id, createdAt }],
      }))
      return id
    },
    deletePlay(id) {
      mutate((current) => ({
        ...current,
        plays: current.plays.filter((play) => play.id !== id),
      }))
    },

    resetSample() {
      if (viewerMode) return
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
      if (viewerMode) return
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
