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
import chunk19 from './historicalSeedPayload/8.csv?raw'

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
  chunk19,
].join('')

/**
 * The first Summer 2026 jump/squat import generated temporary athlete IDs for
 * spreadsheet names that already existed in the FAI roster under canonical
 * names. Devices that loaded that version can still contain those stale IDs.
 * Repair them before any seed/current merge so the existing on-device testing
 * rows attach to their real roster athletes and satisfy the cloud foreign key.
 */
const HISTORICAL_ATHLETE_ID_REMAP: Readonly<Record<string, string>> = {
  'athlete-14721a441f4e09': 'athlete-31f3ca620f838f',
  'athlete-0a9f00fa9304aa': 'athlete-630fa34536b5c2',
  'athlete-7046a239a60aeb': 'athlete-4e97754ff37349',
  'athlete-339a08a59dac8f': 'athlete-beac86d113fc89',
  'athlete-4cb9f29b79dceb': 'athlete-711f53afaf29fd',
  'athlete-bf5059c05b9426': 'athlete-dede9e9140f24a',
  'athlete-1214e821164708': 'athlete-4d3c0b86b98ad1',
  'athlete-4c592997d8effd': 'athlete-72ffee60f2cb22',
  'athlete-ef984a6d34bd77': 'athlete-7d1472cc4e4c65',
  'athlete-0b56bb636fd2dc': 'athlete-9cc68151773a49',
  'athlete-344c1a838b858e': 'athlete-29e023b3b4b44a',
  'athlete-0124bf4f965de6': 'athlete-f9137f9be1ee0e',
  'athlete-bbfdd92328bfe7': 'athlete-3fc48ace96e453',
  'athlete-461009c4d3e399': 'athlete-ebc4ff6e48b081',
  'athlete-9dfab31b251c32': 'athlete-c6115d4f450846',
  'athlete-5a27116d3286a1': 'athlete-b69a34d6b2bb0c',
  'athlete-61b986f2c62201': 'athlete-50d0052ab1074b',
  'athlete-6fd720fe5585b9': 'athlete-ff5c943a094b1f',
  'athlete-62b47f9fb80dee': 'athlete-fa3f0675bb7b9c',
  'athlete-98a1831be0604f': 'athlete-85113fa5e3a2b8',
  'athlete-250a6f1e22afac': 'athlete-2099d51a2a4968',
  'athlete-f692dfb0e7799c': 'athlete-5a4cb2f30070cd',
  'athlete-4d681f082d6c74': 'athlete-c5b67de3b7a0e8',
  'athlete-751a316788a8a8': 'athlete-23d5bd150a3665',
  'athlete-4a1a01e47bf900': 'athlete-95c1e1a3e70a70',
  'athlete-f92a28038665f2': 'athlete-6d478d4ea42976',
  'athlete-6ef9234612e230': 'athlete-7c3feab319124b',
  'athlete-fecd654a3aea88': 'athlete-5c57345c07f1f3',
  'athlete-ddefae980061fa': 'athlete-18357eff701e60',
}

function remapHistoricalAthleteId(id?: string): string | undefined {
  return id ? HISTORICAL_ATHLETE_ID_REMAP[id] ?? id : id
}

function repairHistoricalReferences(input: AppData): AppData {
  return {
    ...input,
    sessions: (input.sessions ?? []).map((session) => ({
      ...session,
      athleteId: remapHistoricalAthleteId(session.athleteId) ?? session.athleteId,
    })),
    plays: (input.plays ?? []).map((play) => ({
      ...play,
      athleteId: remapHistoricalAthleteId(play.athleteId) ?? play.athleteId,
    })),
    filmPlays: (input.filmPlays ?? []).map((film) => ({
      ...film,
      ballCarrierId: remapHistoricalAthleteId(film.ballCarrierId),
      targetId: remapHistoricalAthleteId(film.targetId),
      annotations: film.annotations?.map((annotation) => ({
        ...annotation,
        athleteId: remapHistoricalAthleteId(annotation.athleteId),
      })),
    })),
  }
}

let seedCache: Required<AppData> | null = null

export async function historicalSeedData(): Promise<Required<AppData>> {
  if (!seedCache) {
    seedCache = consolidateAthleteAliases(
      repairHistoricalReferences(importCsv(HISTORICAL_CSV)),
    )
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
  const repairedSeed = consolidateAthleteAliases(repairHistoricalReferences(seed))
  const normalizedCurrent = consolidateAthleteAliases(repairHistoricalReferences(current))
  return consolidateAthleteAliases(
    normalizeAppData({
      athletes: upsertById(repairedSeed.athletes, normalizedCurrent.athletes),
      events: upsertById(repairedSeed.events, normalizedCurrent.events),
      sessions: upsertById(repairedSeed.sessions, normalizedCurrent.sessions),
      plays: upsertById(repairedSeed.plays, normalizedCurrent.plays),
      filmPlays: upsertById(repairedSeed.filmPlays, normalizedCurrent.filmPlays),
    }),
  )
}

export const HISTORICAL_SEED_SUMMARY = {
  firstYear: 2020,
  lastYear: 2026,
  eventCount: 20,
  athleteCount: 159,
  sessionCount: 762,
  mergedAliasCount: 26,
} as const

/**
 * Bump whenever the bundled archive gains records, so signed-in teams get the
 * new baseline merged into their cloud data exactly once per version.
 */
export const SEED_VERSION = '2026-07-sum26-roster-integrity'
