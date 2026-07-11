// ---------------------------------------------------------------------------
// Safe local persistence.
//
// The previous anonymous Supabase adapter allowed unrestricted cross-team access
// and last-write-wins roster replacement. Cloud sync is intentionally disabled
// until authenticated, relational storage is implemented.
// ---------------------------------------------------------------------------

import type { AppData } from '../types'
import { sampleData } from '../data/sampleData'
import { normalizeAppData } from '../lib/events'

export interface DataStore {
  load(): Promise<Required<AppData>>
  save(data: AppData): Promise<void>
  reset(): Promise<Required<AppData>>
}

const STORAGE_KEY = 'fai:data:v2'
const LEGACY_STORAGE_KEY = 'fai:data:v1'

function isValid(data: unknown): data is AppData {
  return Boolean(
    data &&
      typeof data === 'object' &&
      Array.isArray((data as AppData).athletes) &&
      Array.isArray((data as AppData).sessions),
  )
}

function readLocal(key: string): AppData | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export class LocalStorageStore implements DataStore {
  async load(): Promise<Required<AppData>> {
    const current = readLocal(STORAGE_KEY)
    if (current) return normalizeAppData(current)

    const legacy = readLocal(LEGACY_STORAGE_KEY)
    if (legacy) {
      const migrated = normalizeAppData(legacy)
      await this.save(migrated)
      return migrated
    }

    const seed = normalizeAppData(sampleData())
    await this.save(seed)
    return seed
  }

  async save(data: AppData): Promise<void> {
    const normalized = normalizeAppData(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  }

  async reset(): Promise<Required<AppData>> {
    const seed = normalizeAppData(sampleData())
    await this.save(seed)
    return seed
  }
}

export const store: DataStore = new LocalStorageStore()

/** Cloud sync is intentionally unavailable until authenticated storage ships. */
export const isCloudConfigured = false
export const TEAM_CODE = 'local-only'

export function newId(prefix = 'id'): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}
