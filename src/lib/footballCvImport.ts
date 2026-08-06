import type {
  Athlete,
  FilmAnnotation,
  FilmAnnotationPoint,
  PlaySide,
  TrackingTeam,
} from '../types'
import { createPlayerTrack, isPlayerTrack, trackKeyframes } from './filmTracking'

export interface FootballCvMeta {
  source?: string
  fps?: number
  angle?: string
  createdWith?: string
}

export interface FootballCvPlayerSample {
  trackId: string
  team: string
  number?: string
  img: { x: number; y: number }
  field?: [number, number]
  box?: [number, number, number, number]
  confidence?: number
}

export interface FootballCvFrame {
  t: number
  players: FootballCvPlayerSample[]
}

export interface FootballCvTrackingData {
  meta: FootballCvMeta
  frames: FootballCvFrame[]
}

export interface FootballCvParseResult {
  data: FootballCvTrackingData
  warnings: string[]
  rejectedSamples: number
}

export interface FootballCvTrackSummary {
  key: string
  trackId: string
  team: string
  number?: string
  points: FilmAnnotationPoint[]
  pointCount: number
  firstTimeSec: number
  lastTimeSec: number
  durationSec: number
}

export interface FootballCvTeamMapping {
  trackingTeam: TrackingTeam
  side: PlaySide
}

export interface FootballCvTrackOption {
  selected: boolean
  athleteId?: string
  role?: string
  label?: string
}

export interface FootballCvAlignmentSuggestion {
  timeSec: number
  visibleTracks: number
  selectedTracks: number
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function finiteNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function optionalText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  return text || undefined
}

function cleanTrackToken(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const text = String(value).trim()
  return text || undefined
}

function cleanTeam(value: unknown): string | undefined {
  const text = optionalText(value)
  return text?.slice(0, 32)
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function footballCvTrackKey(team: string, trackId: string): string {
  return `${team}::${trackId}`
}

export function parseFootballCvTrackingJson(input: string | unknown): FootballCvParseResult {
  let raw: unknown
  try {
    raw = typeof input === 'string' ? JSON.parse(input) : input
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }

  const root = record(raw)
  if (!root || !Array.isArray(root.frames)) {
    throw new Error('This is not an FAI tracking export. Expected a root frames array.')
  }

  const metaRaw = record(root.meta) ?? {}
  const fps = finiteNumber(metaRaw.fps)
  const meta: FootballCvMeta = {
    source: optionalText(metaRaw.source),
    fps: fps && fps > 0 ? fps : undefined,
    angle: optionalText(metaRaw.angle),
    createdWith: optionalText(metaRaw.createdWith),
  }

  const warnings: string[] = []
  let rejectedSamples = 0
  const frames: FootballCvFrame[] = []

  root.frames.forEach((frameValue, frameIndex) => {
    const frameRaw = record(frameValue)
    const t = finiteNumber(frameRaw?.t)
    if (!frameRaw || t === undefined || t < 0 || !Array.isArray(frameRaw.players)) {
      warnings.push(`Skipped frame ${frameIndex + 1}: invalid timestamp or players array.`)
      return
    }

    const players: FootballCvPlayerSample[] = []
    frameRaw.players.forEach((playerValue) => {
      const playerRaw = record(playerValue)
      const imgRaw = record(playerRaw?.img)
      const trackId = cleanTrackToken(playerRaw?.trackId)
      const team = cleanTeam(playerRaw?.team)
      const x = finiteNumber(imgRaw?.x)
      const y = finiteNumber(imgRaw?.y)
      if (
        !playerRaw
        || !trackId
        || !team
        || x === undefined
        || y === undefined
        || x < 0
        || x > 1
        || y < 0
        || y > 1
      ) {
        rejectedSamples += 1
        return
      }

      const confidenceRaw = finiteNumber(playerRaw.confidence)
      const fieldRaw = Array.isArray(playerRaw.field) ? playerRaw.field : undefined
      const fieldX = finiteNumber(fieldRaw?.[0])
      const fieldY = finiteNumber(fieldRaw?.[1])
      const field = fieldX !== undefined && fieldY !== undefined
        ? [fieldX, fieldY] as [number, number]
        : undefined

      const boxRaw = Array.isArray(playerRaw.box) ? playerRaw.box : undefined
      const boxCoords = boxRaw && boxRaw.length >= 4
        ? boxRaw.slice(0, 4).map(finiteNumber)
        : undefined
      const box = boxCoords && boxCoords.every((value): value is number => value !== undefined)
        ? [
            clampUnit(Math.min(boxCoords[0], boxCoords[2])),
            clampUnit(Math.min(boxCoords[1], boxCoords[3])),
            clampUnit(Math.max(boxCoords[0], boxCoords[2])),
            clampUnit(Math.max(boxCoords[1], boxCoords[3])),
          ] as [number, number, number, number]
        : undefined

      players.push({
        trackId,
        team,
        number: optionalText(playerRaw.number),
        img: { x: clampUnit(x), y: clampUnit(y) },
        field,
        box,
        confidence: confidenceRaw === undefined ? undefined : clampUnit(confidenceRaw),
      })
    })

    if (players.length > 0) frames.push({ t: Math.round(t * 1000) / 1000, players })
  })

  if (frames.length === 0) {
    throw new Error('No valid player samples were found in this tracking export.')
  }

  frames.sort((left, right) => left.t - right.t)
  if (rejectedSamples > 0) {
    warnings.push(`${rejectedSamples} invalid player sample${rejectedSamples === 1 ? '' : 's'} were ignored.`)
  }

  return { data: { meta, frames }, warnings, rejectedSamples }
}

export function summarizeFootballCvTracks(data: FootballCvTrackingData): FootballCvTrackSummary[] {
  const groups = new Map<string, {
    trackId: string
    team: string
    number?: string
    points: FilmAnnotationPoint[]
  }>()

  for (const frame of data.frames) {
    for (const player of frame.players) {
      const key = footballCvTrackKey(player.team, player.trackId)
      const group = groups.get(key) ?? {
        trackId: player.trackId,
        team: player.team,
        number: player.number,
        points: [],
      }
      group.number = group.number ?? player.number
      group.points.push({
        x: player.img.x,
        y: player.img.y,
        t: frame.t,
        source: 'auto',
        confidence: player.confidence,
        field: player.field,
        box: player.box,
      })
      groups.set(key, group)
    }
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const points = trackKeyframes(group.points)
      const firstTimeSec = points[0]?.t ?? 0
      const lastTimeSec = points.at(-1)?.t ?? firstTimeSec
      return {
        key,
        trackId: group.trackId,
        team: group.team,
        number: group.number,
        points,
        pointCount: points.length,
        firstTimeSec,
        lastTimeSec,
        durationSec: Math.max(0, lastTimeSec - firstTimeSec),
      }
    })
    .sort((left, right) => (
      left.team.localeCompare(right.team)
      || right.pointCount - left.pointCount
      || left.trackId.localeCompare(right.trackId, undefined, { numeric: true })
    ))
}

/** Select the longest 11 identities from each color-cluster team by default. */
export function defaultFootballCvSelection(
  summaries: readonly FootballCvTrackSummary[],
  perTeamLimit = 11,
): Set<string> {
  const selected = new Set<string>()
  const byTeam = new Map<string, FootballCvTrackSummary[]>()
  for (const summary of summaries) {
    const group = byTeam.get(summary.team) ?? []
    group.push(summary)
    byTeam.set(summary.team, group)
  }
  for (const teamTracks of byTeam.values()) {
    [...teamTracks]
      .sort((left, right) => right.pointCount - left.pointCount || right.durationSec - left.durationSec)
      .slice(0, perTeamLimit)
      .forEach((track) => selected.add(track.key))
  }
  return selected
}

export function suggestFootballCvAlignmentFrame(
  data: FootballCvTrackingData,
  selectedKeys: ReadonlySet<string>,
): FootballCvAlignmentSuggestion | undefined {
  if (selectedKeys.size === 0) return undefined
  let best: FootballCvAlignmentSuggestion | undefined
  for (const frame of data.frames) {
    const visibleTracks = new Set(
      frame.players
        .map((player) => footballCvTrackKey(player.team, player.trackId))
        .filter((key) => selectedKeys.has(key)),
    ).size
    if (
      !best
      || visibleTracks > best.visibleTracks
      || (visibleTracks === best.visibleTracks && frame.t < best.timeSec)
    ) {
      best = { timeSec: frame.t, visibleTracks, selectedTracks: selectedKeys.size }
    }
  }
  return best
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'unknown'
}

export function buildFootballCvPlayerTracks(input: {
  summaries: readonly FootballCvTrackSummary[]
  teamMappings: Readonly<Record<string, FootballCvTeamMapping>>
  trackOptions: Readonly<Record<string, FootballCvTrackOption>>
  offsetSec?: number
  athletes?: readonly Athlete[]
}): FilmAnnotation[] {
  const offsetSec = Number.isFinite(input.offsetSec) ? Math.max(0, input.offsetSec ?? 0) : 0
  const athleteIds = new Set((input.athletes ?? []).map((athlete) => athlete.id))

  return input.summaries.flatMap((summary) => {
    const option = input.trackOptions[summary.key]
    if (!option?.selected) return []
    const mapping = input.teamMappings[summary.team]
    if (!mapping) return []

    const athleteId = mapping.trackingTeam === 'ours' && option.athleteId && athleteIds.has(option.athleteId)
      ? option.athleteId
      : undefined
    const defaultLabel = summary.number
      ? `#${summary.number}`
      : `Team ${summary.team} · Track ${summary.trackId}`
    const track = createPlayerTrack({
      id: `track-cv-${slug(summary.team)}-${slug(summary.trackId)}`,
      athleteId,
      label: option.label?.trim() || defaultLabel,
      side: mapping.side,
      team: mapping.trackingTeam,
      role: option.role,
    })

    return [{
      ...track,
      trackingComplete: true,
      points: summary.points.map((point) => ({
        ...point,
        t: typeof point.t === 'number' ? Math.round((point.t + offsetSec) * 1000) / 1000 : point.t,
      })),
    }]
  })
}

export function footballCvUnitLimitErrors(
  tracks: readonly FilmAnnotation[],
  maxPerUnit = 11,
): string[] {
  const counts = new Map<string, number>()
  for (const track of tracks.filter(isPlayerTrack)) {
    const team = track.trackingTeam ?? 'opponent'
    const side = track.trackingSide ?? 'offense'
    const key = `${team}:${side}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count > maxPerUnit)
    .map(([key, count]) => {
      const [team, side] = key.split(':')
      return `${team === 'ours' ? 'Our' : 'Opponent'} ${side} has ${count} selected tracks; the formation builder supports ${maxPerUnit}.`
    })
}

/** Re-importing the same CV identities replaces them without deleting manual drawings. */
export function mergeFootballCvPlayerTracks(
  current: readonly FilmAnnotation[],
  imported: readonly FilmAnnotation[],
): FilmAnnotation[] {
  const importedIds = new Set(imported.map((track) => track.id))
  return [...current.filter((annotation) => !importedIds.has(annotation.id)), ...imported]
}
