// ---------------------------------------------------------------------------
// Persistence adapter. Two backends implement the same DataStore interface:
//   • LocalStorageStore — default; data lives in the browser only.
//   • SupabaseStore     — cloud; a whole staff shares one dataset and it syncs
//                         across devices. Enabled by setting the Supabase env
//                         vars (see supabase.ts / .env.example).
// The right one is chosen automatically at startup.
// ---------------------------------------------------------------------------

import type { AppData } from '../types'
import { sampleData } from '../data/sampleData'
import { getSupabase, isCloudConfigured, TEAM_CODE } from './supabase'

export interface DataStore {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  reset(): Promise<AppData> // restore sample data
}

const STORAGE_KEY = 'fai:data:v1'
const CLOUD_CACHE_KEY = 'fai:cloud-cache:v1'

function isValid(data: unknown): data is AppData {
  return (
    !!data &&
    typeof data === 'object' &&
    Array.isArray((data as AppData).athletes) &&
    Array.isArray((data as AppData).sessions)
  )
}

function readLocal(key: string): AppData | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export class LocalStorageStore implements DataStore {
  async load(): Promise<AppData> {
    const existing = readLocal(STORAGE_KEY)
    if (existing) return existing
    const seed = sampleData()
    await this.save(seed)
    return seed
  }

  async save(data: AppData): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  async reset(): Promise<AppData> {
    const seed = sampleData()
    await this.save(seed)
    return seed
  }
}

/**
 * Cloud-backed store: the entire AppData is stored as one JSONB row per team
 * code in the `fai_state` table. Every save also writes a local cache so the
 * app keeps working (read-only-ish) if the network drops. If Supabase is
 * unreachable, we fall back to that cache, then to sample data.
 */
export class SupabaseStore implements DataStore {
  private cache(data: AppData) {
    try {
      localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(data))
    } catch {
      /* ignore quota / private-mode errors */
    }
  }

  async load(): Promise<AppData> {
    const sb = await getSupabase()
    if (!sb) return new LocalStorageStore().load()
    try {
      const { data, error } = await sb
        .from('fai_state')
        .select('data')
        .eq('team_code', TEAM_CODE)
        .maybeSingle()
      if (error) throw error
      if (data?.data && isValid(data.data)) {
        this.cache(data.data as AppData)
        return data.data as AppData
      }
      // No row yet for this team — seed it.
      const seed = readLocal(CLOUD_CACHE_KEY) ?? sampleData()
      await this.save(seed)
      return seed
    } catch (err) {
      console.warn('[FAI] Supabase load failed, using local cache:', err)
      return readLocal(CLOUD_CACHE_KEY) ?? sampleData()
    }
  }

  async save(data: AppData): Promise<void> {
    this.cache(data)
    const sb = await getSupabase()
    if (!sb) return
    const { error } = await sb.from('fai_state').upsert({
      team_code: TEAM_CODE,
      data,
      updated_at: new Date().toISOString(),
    })
    if (error) console.warn('[FAI] Supabase save failed (kept local cache):', error)
  }

  async reset(): Promise<AppData> {
    const seed = sampleData()
    await this.save(seed)
    return seed
  }
}

// Swap the whole app's backend by flipping which store is constructed here.
export const store: DataStore = isCloudConfigured
  ? new SupabaseStore()
  : new LocalStorageStore()

/** Whether cloud sync is active — surfaced in the UI so coaches know. */
export { isCloudConfigured, TEAM_CODE }

export function newId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
