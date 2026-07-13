// ---------------------------------------------------------------------------
// Safe local persistence with bundled historical seed data.
//
// The previous anonymous Supabase adapter allowed unrestricted cross-team access
// and last-write-wins roster replacement. Cloud sync stays disabled until an
// authenticated, team-scoped store is implemented. Meanwhile the complete
// cleaned history is bundled with the app and merged underneath local edits.
// ---------------------------------------------------------------------------

import type { AppData } from '../types'
import { historicalSeedData, mergeHistoricalData } from '../data/historicalSeed'
import { consolidateAthleteAliases } from '../lib/athleteIdentity'

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

/** The original demo ids are deterministic; do not merge fake athletes into history. */
function isBundledDemo(data: AppData): boolean {
  return Boolean(
    data.athletes.length > 0 &&
      data.athletes.every((athlete) => athlete.id.startsWith('a-')) &&
      data.sessions.every((session) => session.id.startsWith('s-')),
  )
}

export class LocalStorageStore implements DataStore {
  async load(): Promise<Required<AppData>> {
    const seed = await historicalSeedData()
    const current = readLocal(STORAGE_KEY)
    if (current) {
      const merged = isBundledDemo(current) ? seed : mergeHistoricalData(seed, current)
      await this.save(merged)
      return merged
    }

    const legacy = readLocal(LEGACY_STORAGE_KEY)
    if (legacy) {
      const migrated = isBundledDemo(legacy) ? seed : mergeHistoricalData(seed, legacy)
      await this.save(migrated)
      return migrated
    }

    await this.save(seed)
    return seed
  }

  async save(data: AppData): Promise<void> {
    const normalized = consolidateAthleteAliases(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  }

  /** Reset restores the real cleaned historical baseline, never fake sample data. */
  async reset(): Promise<Required<AppData>> {
    const seed = await historicalSeedData()
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
