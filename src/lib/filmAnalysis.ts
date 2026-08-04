// ---------------------------------------------------------------------------
// Film analysis catalogs + the opponent tendency engine.
//
// The catalogs are the vocabulary a coach tags with (and that auto-detection
// will later choose from). The tendency engine turns tagged snaps into the
// scouting report that actually wins games: given a down, distance, formation,
// or personnel grouping, what does this opponent tend to do?
// ---------------------------------------------------------------------------

import type {
  FilmAnnotation,
  FilmAnnotationPoint,
  FilmCatalogEntry,
  FilmCatalogKind,
  FilmPlay,
  PlayCall,
} from '../types'

export interface CatalogItem {
  key: string
  label: string
}

/** Offensive formations (personnel-agnostic looks). Edit freely. */
export const FORMATIONS: CatalogItem[] = [
  { key: 'trips', label: 'Trips (3x1)' },
  { key: 'doubles', label: 'Doubles (2x2)' },
  { key: 'trey', label: 'Trey' },
  { key: 'bunch', label: 'Bunch' },
  { key: 'empty', label: 'Empty (0 back)' },
  { key: 'singleback', label: 'Singleback' },
  { key: 'ace', label: 'Ace (2 TE)' },
  { key: 'i_form', label: 'I-Formation' },
  { key: 'offset_i', label: 'Offset I' },
  { key: 'pistol', label: 'Pistol' },
  { key: 'shotgun', label: 'Shotgun' },
  { key: 'wing_t', label: 'Wing-T' },
  { key: 'wildcat', label: 'Wildcat' },
  { key: 'goal_line', label: 'Goal Line / Heavy' },
]

/** Skill personnel groupings (RB count + TE count). */
export const PERSONNEL: CatalogItem[] = [
  { key: '10', label: '10 (1 RB, 0 TE)' },
  { key: '11', label: '11 (1 RB, 1 TE)' },
  { key: '12', label: '12 (1 RB, 2 TE)' },
  { key: '13', label: '13 (1 RB, 3 TE)' },
  { key: '20', label: '20 (2 RB, 0 TE)' },
  { key: '21', label: '21 (2 RB, 1 TE)' },
  { key: '22', label: '22 (2 RB, 2 TE)' },
  { key: '00', label: '00 (Empty)' },
]

export const PLAY_CALLS: { key: PlayCall; label: string }[] = [
  { key: 'run', label: 'Run' },
  { key: 'pass', label: 'Pass' },
  { key: 'rpo', label: 'RPO' },
  { key: 'screen', label: 'Screen' },
  { key: 'special', label: 'Special Teams' },
]

export const RUN_CONCEPTS: CatalogItem[] = [
  { key: 'inside_zone', label: 'Inside Zone' },
  { key: 'outside_zone', label: 'Outside Zone' },
  { key: 'power', label: 'Power' },
  { key: 'counter', label: 'Counter' },
  { key: 'trap', label: 'Trap' },
  { key: 'iso', label: 'Iso / Lead' },
  { key: 'toss', label: 'Toss / Pitch' },
  { key: 'sweep', label: 'Sweep' },
  { key: 'jet', label: 'Jet Sweep' },
  { key: 'draw', label: 'Draw' },
  { key: 'qb_run', label: 'QB Run / Keep' },
  { key: 'dive', label: 'Dive' },
]

export const PASS_CONCEPTS: CatalogItem[] = [
  { key: 'four_verts', label: 'Four Verticals' },
  { key: 'mesh', label: 'Mesh' },
  { key: 'smash', label: 'Smash' },
  { key: 'flood', label: 'Flood / Sail' },
  { key: 'y_cross', label: 'Y-Cross' },
  { key: 'stick', label: 'Stick' },
  { key: 'slant_flat', label: 'Slant-Flat' },
  { key: 'curl_flat', label: 'Curl-Flat' },
  { key: 'dagger', label: 'Dagger' },
  { key: 'pa_boot', label: 'Play-Action Boot' },
  { key: 'screen', label: 'Screen' },
  { key: 'hitch', label: 'Hitch / Quick Game' },
]

/** The route tree — labels for drawn receiver routes. */
export const ROUTE_TREE: CatalogItem[] = [
  { key: 'flat', label: '0 · Flat' },
  { key: 'slant', label: '1 · Slant' },
  { key: 'hitch', label: '2 · Hitch' },
  { key: 'out', label: '3 · Out' },
  { key: 'curl', label: '4 · Curl' },
  { key: 'comeback', label: '5 · Comeback' },
  { key: 'dig', label: '6 · Dig' },
  { key: 'corner', label: '7 · Corner' },
  { key: 'post', label: '8 · Post' },
  { key: 'go', label: '9 · Go / Fade' },
  { key: 'wheel', label: 'Wheel' },
  { key: 'drag', label: 'Drag / Shallow' },
  { key: 'screen', label: 'Screen' },
]

export const CONCEPTS_BY_CALL: Partial<Record<PlayCall, CatalogItem[]>> = {
  run: RUN_CONCEPTS,
  pass: PASS_CONCEPTS,
  rpo: [...RUN_CONCEPTS, ...PASS_CONCEPTS],
  screen: PASS_CONCEPTS.filter((c) => c.key === 'screen'),
}

// ---------------------------------------------------------------------------
// Coach-defined catalog merge. The lists above are the built-in vocabulary; a
// staff can add their own formations, personnel groupings, and concepts
// (persisted as FilmCatalogEntry). These helpers merge the two so tagging menus
// and the scouting report speak the same language. Built-ins always come first;
// a custom entry that reuses a built-in key just overrides its label.
// ---------------------------------------------------------------------------

function customItems(custom: readonly FilmCatalogEntry[], kind: FilmCatalogKind): CatalogItem[] {
  return custom
    .filter((entry) => entry.kind === kind && entry.key.trim() && entry.label.trim())
    .map((entry) => ({ key: entry.key, label: entry.label }))
}

/** Built-ins + custom entries of one list, de-duplicated by key (custom wins on label). */
function mergeItems(builtin: readonly CatalogItem[], additions: readonly CatalogItem[]): CatalogItem[] {
  const byKey = new Map<string, CatalogItem>()
  for (const item of builtin) byKey.set(item.key, item)
  for (const item of additions) byKey.set(item.key, item)
  return [...byKey.values()]
}

export function formationOptions(custom: readonly FilmCatalogEntry[] = []): CatalogItem[] {
  return mergeItems(FORMATIONS, customItems(custom, 'formation'))
}

export function personnelOptions(custom: readonly FilmCatalogEntry[] = []): CatalogItem[] {
  return mergeItems(PERSONNEL, customItems(custom, 'personnel'))
}

/** Concepts available for a play call, including any coach-defined concepts. */
export function conceptOptionsForCall(
  call: PlayCall | undefined,
  custom: readonly FilmCatalogEntry[] = [],
): CatalogItem[] {
  if (!call) return []
  const customRun = customItems(custom, 'run_concept')
  const customPass = customItems(custom, 'pass_concept')
  switch (call) {
    case 'run':
      return mergeItems(RUN_CONCEPTS, customRun)
    case 'pass':
      return mergeItems(PASS_CONCEPTS, customPass)
    case 'rpo':
      return mergeItems([...RUN_CONCEPTS, ...PASS_CONCEPTS], [...customRun, ...customPass])
    case 'screen':
      return mergeItems(CONCEPTS_BY_CALL.screen ?? [], customPass)
    default:
      return CONCEPTS_BY_CALL[call] ?? []
  }
}

type LabelKind = keyof typeof LABEL_MAPS

/**
 * A label resolver that knows the coach's custom entries in addition to the
 * built-ins. Used by the tendency report so custom formations/concepts show
 * their real names rather than raw keys. Falls back to labelFor.
 */
export function catalogLabelResolver(
  custom: readonly FilmCatalogEntry[] = [],
): (kind: LabelKind, key?: string) => string {
  const overrides: Record<string, Map<string, string>> = {
    formation: new Map(),
    personnel: new Map(),
    concept: new Map(),
  }
  for (const entry of custom) {
    if (!entry.key.trim() || !entry.label.trim()) continue
    const target =
      entry.kind === 'formation'
        ? overrides.formation
        : entry.kind === 'personnel'
          ? overrides.personnel
          : overrides.concept // run_concept + pass_concept both resolve as concepts
    target.set(entry.key, entry.label)
  }
  return (kind, key) => {
    if (!key) return '—'
    return overrides[kind]?.get(key) ?? labelFor(kind, key)
  }
}

const LABEL_MAPS: Record<string, Map<string, string>> = {
  formation: new Map(FORMATIONS.map((f) => [f.key, f.label])),
  personnel: new Map(PERSONNEL.map((p) => [p.key, p.label])),
  call: new Map(PLAY_CALLS.map((c) => [c.key, c.label])),
  concept: new Map([...RUN_CONCEPTS, ...PASS_CONCEPTS].map((c) => [c.key, c.label])),
  route: new Map(ROUTE_TREE.map((r) => [r.key, r.label])),
}

export function labelFor(kind: keyof typeof LABEL_MAPS, key?: string): string {
  if (!key) return '—'
  return LABEL_MAPS[kind]?.get(key) ?? key
}

// ---------------------------------------------------------------------------
// Tendency engine
// ---------------------------------------------------------------------------

export type DistanceBucket = 'short' | 'medium' | 'long'

export function distanceBucket(distance?: number): DistanceBucket | undefined {
  if (typeof distance !== 'number' || !Number.isFinite(distance)) return undefined
  if (distance <= 3) return 'short'
  if (distance <= 6) return 'medium'
  return 'long'
}

export const DISTANCE_BUCKET_LABEL: Record<DistanceBucket, string> = {
  short: 'Short (1–3)',
  medium: 'Medium (4–6)',
  long: 'Long (7+)',
}

/** Where on the field the play started, from the scouted offense's view. */
export type FieldZone = 'backed-up' | 'own' | 'opp' | 'red-zone'

/** yardLine is 1–99 (own 1 … opponent 1); 80+ is inside the opponent 20. */
export function fieldZone(yardLine?: number): FieldZone | undefined {
  if (typeof yardLine !== 'number' || !Number.isFinite(yardLine)) return undefined
  if (yardLine <= 20) return 'backed-up'
  if (yardLine <= 50) return 'own'
  if (yardLine < 80) return 'opp'
  return 'red-zone'
}

export const FIELD_ZONE_LABEL: Record<FieldZone, string> = {
  'backed-up': 'Backed up (own 1–20)',
  own: 'Own territory (own 21–50)',
  opp: 'Opponent territory (opp 49–21)',
  'red-zone': 'Red zone (opp 20–1)',
}

const FIELD_ZONE_ORDER: FieldZone[] = ['backed-up', 'own', 'opp', 'red-zone']

/** True for plays that move the chains — passes, runs, RPOs, screens. */
function isScrimmagePlay(play: FilmPlay): boolean {
  return play.call !== undefined && play.call !== 'special'
}

/** A pass-family call (pass / screen, and RPOs that ended as a throw). */
function isPassFamily(call?: PlayCall): boolean {
  return call === 'pass' || call === 'screen'
}

export interface CountShare {
  key: string
  label: string
  count: number
  share: number // 0-1 of the group
}

export interface TendencyGroup {
  key: string
  label: string
  plays: number
  runCount: number
  passCount: number
  runShare: number // 0-1
  passShare: number // 0-1
  avgGain: number
  topFormations: CountShare[]
  topConcepts: CountShare[]
}

function topCounts(
  plays: FilmPlay[],
  pick: (play: FilmPlay) => string | undefined,
  label: (key: string) => string,
  limit = 3,
): CountShare[] {
  const counts = new Map<string, number>()
  let total = 0
  for (const play of plays) {
    const key = pick(play)
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
    total += 1
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: label(key), count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}

type LabelResolver = (kind: LabelKind, key?: string) => string

function summarizeGroup(
  key: string,
  label: string,
  plays: FilmPlay[],
  resolve: LabelResolver = labelFor,
): TendencyGroup {
  const scrimmage = plays.filter(isScrimmagePlay)
  const runCount = scrimmage.filter((p) => !isPassFamily(p.call) && p.call !== 'special').length
  const passCount = scrimmage.filter((p) => isPassFamily(p.call)).length
  const rated = runCount + passCount
  const gains = scrimmage
    .map((p) => p.gain)
    .filter((g): g is number => typeof g === 'number' && Number.isFinite(g))
  const avgGain = gains.length ? gains.reduce((sum, g) => sum + g, 0) / gains.length : 0
  return {
    key,
    label,
    plays: scrimmage.length,
    runCount,
    passCount,
    runShare: rated ? runCount / rated : 0,
    passShare: rated ? passCount / rated : 0,
    avgGain: Math.round(avgGain * 10) / 10,
    topFormations: topCounts(scrimmage, (p) => p.formation, (k) => resolve('formation', k)),
    topConcepts: topCounts(scrimmage, (p) => p.concept, (k) => resolve('concept', k)),
  }
}

export interface TendencyReport {
  totalPlays: number
  runShare: number
  passShare: number
  byDownDistance: TendencyGroup[]
  byFieldZone: TendencyGroup[]
  byFormation: TendencyGroup[]
  byPersonnel: TendencyGroup[]
}

export interface TendencyFilter {
  opponent?: string
}

/** Build the full scouting report from tagged film, optionally for one opponent. */
export function buildTendencyReport(
  filmPlays: FilmPlay[],
  filter: TendencyFilter = {},
  custom: readonly FilmCatalogEntry[] = [],
): TendencyReport {
  const resolve = catalogLabelResolver(custom)
  const plays = filmPlays.filter((play) => {
    if (filter.opponent && (play.opponent ?? '') !== filter.opponent) return false
    return isScrimmagePlay(play)
  })

  const runCount = plays.filter((p) => !isPassFamily(p.call)).length
  const passCount = plays.filter((p) => isPassFamily(p.call)).length
  const rated = runCount + passCount

  // Down & distance groups, ordered 1st→4th then short→long.
  const ddGroups = new Map<string, FilmPlay[]>()
  for (const play of plays) {
    if (!play.down) continue
    const bucket = distanceBucket(play.distance)
    const key = `${play.down}:${bucket ?? 'any'}`
    ddGroups.set(key, [...(ddGroups.get(key) ?? []), play])
  }
  const bucketOrder: Record<string, number> = { short: 0, medium: 1, long: 2, any: 3 }
  const byDownDistance = [...ddGroups.entries()]
    .map(([key, group]) => {
      const [down, bucket] = key.split(':')
      const label = `${ordinal(Number(down))} & ${
        bucket === 'any' ? '?' : DISTANCE_BUCKET_LABEL[bucket as DistanceBucket]
      }`
      return summarizeGroup(key, label, group, resolve)
    })
    .sort((a, b) => {
      const [da, ba] = a.key.split(':')
      const [db, bb] = b.key.split(':')
      return Number(da) - Number(db) || (bucketOrder[ba] ?? 9) - (bucketOrder[bb] ?? 9)
    })

  // Field-zone groups, ordered from backed-up to the red zone.
  const zoneGroups = new Map<FieldZone, FilmPlay[]>()
  for (const play of plays) {
    const zone = fieldZone(play.yardLine)
    if (!zone) continue
    zoneGroups.set(zone, [...(zoneGroups.get(zone) ?? []), play])
  }
  const byFieldZone = FIELD_ZONE_ORDER
    .filter((zone) => zoneGroups.has(zone))
    .map((zone) => summarizeGroup(zone, FIELD_ZONE_LABEL[zone], zoneGroups.get(zone)!, resolve))

  const byFormation = groupBy(plays, (p) => p.formation, (k) => resolve('formation', k), resolve)
  const byPersonnel = groupBy(plays, (p) => p.personnel, (k) => resolve('personnel', k), resolve)

  return {
    totalPlays: plays.length,
    runShare: rated ? runCount / rated : 0,
    passShare: rated ? passCount / rated : 0,
    byDownDistance,
    byFieldZone,
    byFormation,
    byPersonnel,
  }
}

function groupBy(
  plays: FilmPlay[],
  pick: (play: FilmPlay) => string | undefined,
  label: (key: string) => string,
  resolve: LabelResolver = labelFor,
): TendencyGroup[] {
  const groups = new Map<string, FilmPlay[]>()
  for (const play of plays) {
    const key = pick(play)
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), play])
  }
  return [...groups.entries()]
    .map(([key, group]) => summarizeGroup(key, label(key), group, resolve))
    .sort((a, b) => b.plays - a.plays || a.label.localeCompare(b.label))
}

export function opponentsFromFilm(filmPlays: FilmPlay[]): string[] {
  const set = new Set<string>()
  for (const play of filmPlays) {
    const opp = (play.opponent ?? '').trim()
    if (opp) set.add(opp)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

function ordinal(n: number): string {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  if (n === 4) return '4th'
  return `${n}th`
}

// ---------------------------------------------------------------------------
// Geometry helpers for drawn overlays (routes / trails).
//
// Points are normalized 0-1 to the video frame. Without field calibration we
// cannot report real yards, so path length is expressed in frame-relative
// units — good enough to compare routes and drive the AI-assist layer later.
// ---------------------------------------------------------------------------

export function pathLength(points: FilmAnnotationPoint[]): number {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    total += Math.hypot(dx, dy)
  }
  return total
}

/** Net downfield break of a route as a fraction of frame height (up = negative y). */
export function routeDepth(points: FilmAnnotationPoint[]): number {
  if (points.length < 2) return 0
  return points[0].y - points[points.length - 1].y
}

export function annotationSummary(annotation: FilmAnnotation): string {
  const len = pathLength(annotation.points)
  return `${annotation.kind} · ${(len * 100).toFixed(0)} units`
}
