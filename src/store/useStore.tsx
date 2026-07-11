// ---------------------------------------------------------------------------
// App-wide data context. Holds AppData + derived computations (memoized) and
// exposes CRUD mutations. All mutations persist through the DataStore adapter.
// ---------------------------------------------------------------------------

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
} from '../types'
import { store, newId } from './storage'
import { importCsv } from '../data/csv'
import { computeAll } from '../lib/compute'
import { buildResults } from '../lib/progress'

interface StoreContextValue {
  data: AppData
  loading: boolean
  computed: ComputedSession[]
  results: AthleteResult[]
  resultByAthlete: Map<string, AthleteResult>
  // athlete CRUD
  addAthlete: (a: Omit<Athlete, 'id'>) => string
  updateAthlete: (a: Athlete) => void
  deleteAthlete: (id: string) => void
  // session CRUD (never overwrites — each testing date is its own record)
  addSession: (s: Omit<TestSession, 'id'>) => string
  updateSession: (s: TestSession) => void
  deleteSession: (id: string) => void
  // data ops
  resetSample: () => void
  replaceAll: (data: AppData) => void
  importCsvText: (text: string, mode: 'merge' | 'replace') => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

const EMPTY: AppData = { athletes: [], sessions: [] }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    store.load().then((d) => {
      if (alive) {
        setData(d)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  // Persist + update state together.
  function commit(next: AppData) {
    setData(next)
    void store.save(next)
  }

  const computed = useMemo(() => computeAll(data), [data])
  const results = useMemo(() => buildResults(computed), [computed])
  const resultByAthlete = useMemo(
    () => new Map(results.map((r) => [r.athlete.id, r])),
    [results],
  )

  const value: StoreContextValue = {
    data,
    loading,
    computed,
    results,
    resultByAthlete,

    addAthlete(a) {
      const id = newId('a')
      commit({ ...data, athletes: [...data.athletes, { ...a, id }] })
      return id
    },
    updateAthlete(a) {
      commit({
        ...data,
        athletes: data.athletes.map((x) => (x.id === a.id ? a : x)),
      })
    },
    deleteAthlete(id) {
      commit({
        athletes: data.athletes.filter((x) => x.id !== id),
        sessions: data.sessions.filter((s) => s.athleteId !== id),
      })
    },

    addSession(s) {
      const id = newId('s')
      commit({ ...data, sessions: [...data.sessions, { ...s, id }] })
      return id
    },
    updateSession(s) {
      commit({
        ...data,
        sessions: data.sessions.map((x) => (x.id === s.id ? s : x)),
      })
    },
    deleteSession(id) {
      commit({ ...data, sessions: data.sessions.filter((s) => s.id !== id) })
    },

    resetSample() {
      void store.reset().then((d) => setData(d))
    },
    replaceAll(next) {
      commit(next)
    },
    importCsvText(text, mode) {
      const parsed = importCsv(text)
      if (mode === 'replace') {
        commit(parsed)
        return
      }
      // merge: append athletes (dedupe by name+grade) and their sessions
      const existingKeys = new Map(
        data.athletes.map((a) => [`${a.name}|${a.grade}`, a.id]),
      )
      const idRemap = new Map<string, string>()
      const mergedAthletes = [...data.athletes]
      for (const a of parsed.athletes) {
        const key = `${a.name}|${a.grade}`
        const existingId = existingKeys.get(key)
        if (existingId) {
          idRemap.set(a.id, existingId)
        } else {
          const id = newId('a')
          idRemap.set(a.id, id)
          mergedAthletes.push({ ...a, id })
          existingKeys.set(key, id)
        }
      }
      const mergedSessions = [
        ...data.sessions,
        ...parsed.sessions.map((s) => ({
          ...s,
          id: newId('s'),
          athleteId: idRemap.get(s.athleteId) ?? s.athleteId,
        })),
      ]
      commit({ athletes: mergedAthletes, sessions: mergedSessions })
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
