import type { AppData, Athlete, TestSession } from '../types'
import { normalizeAppData } from './events'

/**
 * Known aliases found in the historical testing workbooks. The display name on
 * the right is the canonical roster identity. These are deliberately explicit
 * where spelling changed, so we never merge two athletes merely because their
 * names look similar.
 */
export const HISTORICAL_NAME_ALIASES: Record<string, string> = {
  'j nelson': 'Jude Nelson',
  'd evans': 'Dillion Evans',
  'lu cross': 'Logan Cross',
  'lo cross': 'Logan Cross',
  'l kendall': 'Levi Kendall',
  's parr': 'Sawyer Parr',
  'b evans': 'Bristol Evans',
  's crews': 'Sean Crews',
  'c paschal': 'Chad Paschal',
  'k griffey': 'Kelsey Griffey',
  'k durden': 'Kam Durden',
  'j crutchfield': 'Jay Crutchfield',
  'j ethridge': 'Jaxon Ethridge',
  'p baynes': 'Phillip Baynes',
  'm riley': 'Matt Riley',
  'w atha': 'Will Atha',
  'b ross': 'Bryan Ross',
  'd hyman': 'DaShon Hyman',
  'h williams': 'Hunter Williams',
  'm moore': 'Mason Moore',
  'm butts': 'Mekhi Butts',
  'g jenkins': 'Grayson Jenkins',
  'a vinson': 'AJ Vinson',
  'c colclough': 'CJ Colclough',
  'j duval': 'JD Duvall',
  'z stewart': 'Z Stewart',
  'd bolden': 'Damasio Boldon',
}

export function normalizeAthleteName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function nameParts(value: string): string[] {
  return normalizeAthleteName(value).split(' ').filter(Boolean)
}

function isInitialStyle(value: string): boolean {
  const [first] = nameParts(value)
  return Boolean(first && first.length <= 2)
}

function canonicalNameFor(name: string, fullNames: string[]): string {
  const normalized = normalizeAthleteName(name)
  const explicit = HISTORICAL_NAME_ALIASES[normalized]
  if (explicit) return explicit

  if (!isInitialStyle(name)) return name.trim()
  const parts = nameParts(name)
  const first = parts[0]
  const last = parts.at(-1)
  if (!first || !last) return name.trim()

  const candidates = fullNames.filter((candidate) => {
    const candidateParts = nameParts(candidate)
    const candidateFirst = candidateParts[0]
    const candidateLast = candidateParts.at(-1)
    return Boolean(
      candidateFirst &&
        candidateLast === last &&
        candidateFirst.startsWith(first[0]),
    )
  })
  return candidates.length === 1 ? candidates[0] : name.trim()
}

function mostRecentSession(sessions: TestSession[]): TestSession | undefined {
  return [...sessions].sort((a, b) =>
    `${b.date}|${b.createdAt ?? ''}`.localeCompare(`${a.date}|${a.createdAt ?? ''}`),
  )[0]
}

function mergeAthleteProfile(
  canonicalName: string,
  members: Athlete[],
  sessions: TestSession[],
): Athlete {
  const exact = members.find(
    (athlete) => normalizeAthleteName(athlete.name) === normalizeAthleteName(canonicalName),
  )
  const base = exact ?? members[0]
  const memberIds = new Set(members.map((athlete) => athlete.id))
  const latest = mostRecentSession(sessions.filter((session) => memberIds.has(session.athleteId)))
  const specific = members.find(
    (athlete) => athlete.position && athlete.position.toUpperCase() !== 'ATH',
  )
  const newestBio = [...members]
    .filter((athlete) => athlete.heightIn > 0 || athlete.weightLbs > 0)
    .sort((a, b) => b.grade - a.grade)[0]

  // The coach-maintained roster record wins. Alias members and historical
  // session snapshots only fill fields the canonical record is missing —
  // otherwise every roster edit would be reverted on the next save.
  const baseHasPosition = Boolean(
    base.position && base.position.toUpperCase() !== 'ATH',
  )
  return {
    ...base,
    name: canonicalName,
    grade: Math.max(
      9,
      Math.min(
        12,
        Math.round(base.grade || latest?.gradeSnapshot || newestBio?.grade || 9),
      ),
    ),
    position: baseHasPosition ? base.position : specific?.position ?? base.position ?? 'ATH',
    positionGroup: baseHasPosition
      ? base.positionGroup
      : specific?.positionGroup ?? base.positionGroup,
    heightIn: base.heightIn || newestBio?.heightIn || 0,
    weightLbs: base.weightLbs || latest?.weightLbsSnapshot || newestBio?.weightLbs || 0,
    photoUrl: base.photoUrl ?? members.find((athlete) => athlete.photoUrl)?.photoUrl,
  }
}

/**
 * Collapse initial/last-name rows into one canonical athlete and move every
 * historical session onto that athlete. Unambiguous initial matches are merged;
 * ambiguous names remain separate instead of risking a false identity merge.
 */
export function consolidateAthleteAliases(input: AppData): Required<AppData> {
  const data = normalizeAppData(input)
  const fullNames = data.athletes
    .map((athlete) => athlete.name)
    .filter((name) => !isInitialStyle(name))

  const groups = new Map<string, Athlete[]>()
  for (const athlete of data.athletes) {
    const canonical = canonicalNameFor(athlete.name, fullNames)
    const key = normalizeAthleteName(canonical)
    groups.set(key, [...(groups.get(key) ?? []), athlete])
  }

  const idMap = new Map<string, string>()
  const athletes: Athlete[] = []
  for (const members of groups.values()) {
    const canonicalName = canonicalNameFor(members[0].name, fullNames)
    const exact = members.find(
      (athlete) => normalizeAthleteName(athlete.name) === normalizeAthleteName(canonicalName),
    )
    const canonicalId = exact?.id ?? members[0].id
    for (const member of members) idMap.set(member.id, canonicalId)
    athletes.push(mergeAthleteProfile(canonicalName, members, data.sessions))
    athletes[athletes.length - 1].id = canonicalId
  }

  const sessionById = new Map<string, TestSession>()
  for (const session of data.sessions) {
    const remapped = {
      ...session,
      athleteId: idMap.get(session.athleteId) ?? session.athleteId,
    }
    sessionById.set(remapped.id, remapped)
  }

  return normalizeAppData({
    athletes: athletes.sort((a, b) => a.name.localeCompare(b.name)),
    events: data.events,
    sessions: [...sessionById.values()],
  })
}
