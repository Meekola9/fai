import type { AppData } from '../types'
import { importCsv } from './csv'
import { consolidateAthleteAliases } from '../lib/athleteIdentity'
import { normalizeAppData } from '../lib/events'
import chunk0 from './historicalSeedPayload/0.csv?raw'
import chunk1 from './historicalSeedPayload/1.csv?raw'
import chunk2 from './historicalSeedPayload/2a.csv?raw'
import chunk3 from './historicalSeedPayload/2b.csv?raw'
import chunk4 from './historicalSeedPayload/2c.csv?raw'
import chunk5 from './historicalSeedPayload/3a.csv?raw'
import chunk6 from './historicalSeedPayload/3b.csv?raw'
import chunk7 from './historicalSeedPayload/3c.csv?raw'
import chunk8 from './historicalSeedPayload/4a.csv?raw'
import chunk9 from './historicalSeedPayload/4b.csv?raw'
import chunk10 from './historicalSeedPayload/4c.csv?raw'
import chunk11 from './historicalSeedPayload/5a.csv?raw'
import chunk12 from './historicalSeedPayload/5b.csv?raw'
import chunk13 from './historicalSeedPayload/5c.csv?raw'
import chunk14 from './historicalSeedPayload/6a.csv?raw'
import chunk15 from './historicalSeedPayload/6b.csv?raw'
import chunk16 from './historicalSeedPayload/6c.csv?raw'
import chunk17 from './historicalSeedPayload/7a.csv?raw'
import chunk18 from './historicalSeedPayload/7b.csv?raw'

const HISTORICAL_CSV = [
  chunk0,
  chunk1,
  chunk2,
  chunk3,
  chunk4,
  chunk5,
  chunk6,
  chunk7,
  chunk8,
  chunk9,
  chunk10,
  chunk11,
  chunk12,
  chunk13,
  chunk14,
  chunk15,
  chunk16,
  chunk17,
  chunk18,
].join('')

let seedCache: Required<AppData> | null = null

export async function historicalSeedData(): Promise<Required<AppData>> {
  if (!seedCache) {
    seedCache = consolidateAthleteAliases(importCsv(HISTORICAL_CSV))
  }
  return seedCache
}

function upsertById<T extends { id: string }>(seed: T[], current: T[]): T[] {
  const records = new Map(seed.map((item) => [item.id, item]))
  for (const item of current) records.set(item.id, item)
  return [...records.values()]
}

/** Seed first, then overlay coach-entered/current records so local edits win. */
export function mergeHistoricalData(
  seed: Required<AppData>,
  current: AppData,
): Required<AppData> {
  const normalizedCurrent = consolidateAthleteAliases(current)
  return consolidateAthleteAliases(
    normalizeAppData({
      athletes: upsertById(seed.athletes, normalizedCurrent.athletes),
      events: upsertById(seed.events, normalizedCurrent.events),
      sessions: upsertById(seed.sessions, normalizedCurrent.sessions),
    }),
  )
}

export const HISTORICAL_SEED_SUMMARY = {
  firstYear: 2020,
  lastYear: 2026,
  eventCount: 20,
  athleteCount: 158,
  sessionCount: 670,
  mergedAliasCount: 26,
} as const

/**
 * Bump whenever the bundled archive gains records, so signed-in teams get the
 * new baseline merged into their cloud data exactly once per version.
 */
export const SEED_VERSION = '2026-07-sum26-fly10'
