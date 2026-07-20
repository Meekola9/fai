// ---------------------------------------------------------------------------
// Safe local persistence with bundled historical seed data.
//
// The local copy remains the recovery cache for installed/mobile use. When the
// production build has authenticated Supabase configuration, the app mirrors
// this data to the signed-in team database through the cloud adapter.
// ---------------------------------------------------------------------------

import type { AppData } from '../types'
import { historicalSeedData, mergeHistoricalData } from '../data/historicalSeed'
import { consolidateAthleteAliases } from '../lib/athleteIdentity'
import { isSupabaseConfigured } from '../lib/supabase'

export interface DataStore {
  load(): Promise<Required<AppData>>
  save(data: AppData): Promise<void>
  reset(): Promise<Required<AppData>>
}

const STORAGE_KEY = 'fai:data:v2'
const LEGACY_STORAGE_KEY = 'fai:data:v1'
const BACKUP_DB_NAME = 'fai-mobile-backup'
const BACKUP_DB_VERSION = 1
const BACKUP_STORE_NAME = 'snapshots'
const BACKUP_KEY = 'latest'

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

function openBackupDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(BACKUP_DB_NAME, BACKUP_DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
          db.createObjectStore(BACKUP_STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function readIndexedDbBackup(): Promise<AppData | null> {
  const db = await openBackupDb()
  if (!db) return null

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(BACKUP_STORE_NAME, 'readonly')
      const request = transaction.objectStore(BACKUP_STORE_NAME).get(BACKUP_KEY)
      request.onsuccess = () => resolve(isValid(request.result) ? request.result : null)
      request.onerror = () => resolve(null)
      transaction.oncomplete = () => db.close()
      transaction.onabort = () => {
        db.close()
        resolve(null)
      }
    } catch {
      db.close()
      resolve(null)
    }
  })
}

async function writeIndexedDbBackup(data: AppData): Promise<boolean> {
  const db = await openBackupDb()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(BACKUP_STORE_NAME, 'readwrite')
      transaction.objectStore(BACKUP_STORE_NAME).put(data, BACKUP_KEY)
      transaction.oncomplete = () => {
        db.close()
        resolve(true)
      }
      transaction.onerror = () => {
        db.close()
        resolve(false)
      }
      transaction.onabort = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
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
    const legacy = current ? null : readLocal(LEGACY_STORAGE_KEY)
    const indexedDbBackup = current || legacy ? null : await readIndexedDbBackup()
    const stored = current ?? legacy ?? indexedDbBackup

    if (stored) {
      const merged = isBundledDemo(stored) ? seed : mergeHistoricalData(seed, stored)
      await this.save(merged)
      return merged
    }

    await this.save(seed)
    return seed
  }

  async save(data: AppData): Promise<void> {
    const normalized = consolidateAthleteAliases(data)
    let localSaved = false

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      localSaved = true
    } catch {
      // Continue: an installed app may still preserve the snapshot in IndexedDB.
    }

    const backupSaved = await writeIndexedDbBackup(normalized)
    if (!localSaved && !backupSaved) {
      throw new Error(
        'FAI could not save data on this device. Export a backup and check browser storage settings.',
      )
    }
  }

  /** Reset restores the real cleaned historical baseline, never fake sample data. */
  async reset(): Promise<Required<AppData>> {
    const seed = await historicalSeedData()
    await this.save(seed)
    return seed
  }
}

// ---------------------------------------------------------------------------
// One-time local-to-cloud import support.
//
// When a signed-in team already has cloud data, the pre-cloud on-device
// dataset is preserved here so the coach can merge it into the team cloud
// exactly once from the Data page.
// ---------------------------------------------------------------------------

const IMPORT_SNAPSHOT_KEY = 'fai:cloud-import:snapshot'
const IMPORT_DONE_KEY_PREFIX = 'fai:cloud-import:done:'

export function preserveLocalImportSnapshot(data: AppData): void {
  try {
    localStorage.setItem(IMPORT_SNAPSHOT_KEY, JSON.stringify(data))
  } catch {
    // Storage may be full or unavailable; the import button simply stays hidden.
  }
}

export function readLocalImportSnapshot(): AppData | null {
  return readLocal(IMPORT_SNAPSHOT_KEY)
}

export function clearLocalImportSnapshot(): void {
  try {
    localStorage.removeItem(IMPORT_SNAPSHOT_KEY)
  } catch {
    // Ignore: a leftover snapshot is harmless once the done flag is set.
  }
}

export function localImportCompleted(teamId: string): boolean {
  try {
    return localStorage.getItem(`${IMPORT_DONE_KEY_PREFIX}${teamId}`) === 'true'
  } catch {
    return false
  }
}

export function markLocalImportCompleted(teamId: string): void {
  try {
    localStorage.setItem(`${IMPORT_DONE_KEY_PREFIX}${teamId}`, 'true')
  } catch {
    // Ignore: worst case the button reappears and re-running the merge is idempotent.
  }
}

export const store: DataStore = new LocalStorageStore()
export const isCloudConfigured = isSupabaseConfigured
export const TEAM_CODE = isSupabaseConfigured ? 'authenticated-team' : 'local-only'

export function newId(prefix = 'id'): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`
}
