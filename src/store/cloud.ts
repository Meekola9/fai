import type {
  AppData,
  Athlete,
  PlayEvent,
  PositionGroup,
  TestSession,
  TestingEvent,
  TestingPhase,
} from '../types'
import { normalizeAppData } from '../lib/events'
import { consolidateAthleteAliases } from '../lib/athleteIdentity'
import { supabase } from '../lib/supabase'

interface TeamAccess {
  id: string
  name: string
  role: string
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured for this build.')
  return supabase
}

function requiredNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function throwIfError(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`${operation}: ${error.message}`)
}

export async function loadTeamAccess(userId: string): Promise<TeamAccess | null> {
  const db = client()
  const { data: membership, error: membershipError } = await db
    .from('team_members')
    .select('team_id, role, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  throwIfError(membershipError, 'Could not load team membership')
  if (!membership) return null

  const { data: team, error: teamError } = await db
    .from('teams')
    .select('id, name')
    .eq('id', membership.team_id)
    .single()

  throwIfError(teamError, 'Could not load team')
  if (!team) return null

  return {
    id: String(team.id),
    name: String(team.name),
    role: String(membership.role),
  }
}

export async function loadCloudData(teamId: string): Promise<Required<AppData>> {
  const db = client()
  const [athleteResult, eventResult, sessionResult, playResult] = await Promise.all([
    db.from('athletes').select('*').eq('team_id', teamId),
    db.from('testing_events').select('*').eq('team_id', teamId),
    db.from('test_sessions').select('*').eq('team_id', teamId),
    db.from('play_events').select('*').eq('team_id', teamId),
  ])

  throwIfError(athleteResult.error, 'Could not load athletes')
  throwIfError(eventResult.error, 'Could not load testing events')
  throwIfError(sessionResult.error, 'Could not load testing entries')
  // play_events is newer; if the migration has not run yet, treat it as empty
  // rather than failing the whole load.

  const athletes: Athlete[] = (athleteResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    grade: requiredNumber(row.grade),
    position: String(row.position),
    positionGroup: String(row.position_group) as PositionGroup,
    heightIn: requiredNumber(row.height_in),
    weightLbs: requiredNumber(row.weight_lbs),
    photoUrl: optionalText(row.photo_url),
    hudlUrl: optionalText(row.hudl_url),
  }))

  const events: TestingEvent[] = (eventResult.data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    phase: String(row.phase) as TestingPhase,
    startDate: String(row.start_date),
    endDate: optionalText(row.end_date),
    status: String(row.status ?? 'open') as 'open' | 'closed',
    createdAt: optionalText(row.created_at),
  }))

  const sessions: TestSession[] = (sessionResult.data ?? []).map((row) => ({
    id: String(row.id),
    athleteId: String(row.athlete_id),
    eventId: String(row.event_id),
    date: String(row.test_date),
    phase: String(row.phase) as TestingPhase,
    createdAt: optionalText(row.created_at),
    gradeSnapshot: optionalNumber(row.grade_snapshot),
    positionSnapshot: optionalText(row.position_snapshot),
    positionGroupSnapshot: optionalText(row.position_group_snapshot) as
      | PositionGroup
      | undefined,
    weightLbsSnapshot: optionalNumber(row.weight_lbs_snapshot),
    benchMax: optionalNumber(row.bench_max),
    dash40_1: optionalNumber(row.dash40_1),
    dash40_2: optionalNumber(row.dash40_2),
    dash10_1: optionalNumber(row.dash10_1),
    dash10_2: optionalNumber(row.dash10_2),
    fly10_1: optionalNumber(row.fly10_1),
    fly10_2: optionalNumber(row.fly10_2),
    hangCleanReps: optionalNumber(row.hang_clean_reps),
    shuttle20_1: optionalNumber(row.shuttle20_1),
    shuttle20_2: optionalNumber(row.shuttle20_2),
    latShuttle_1: optionalNumber(row.lat_shuttle_1),
    latShuttle_2: optionalNumber(row.lat_shuttle_2),
    illinois: optionalNumber(row.illinois),
    squatMax: optionalNumber(row.squat_max),
    broadJump: optionalNumber(row.broad_jump),
    verticalJump: optionalNumber(row.vertical_jump),
    cond51015: optionalNumber(row.cond51015),
  }))

  const plays: PlayEvent[] = playResult.error
    ? []
    : (playResult.data ?? []).map((row) => ({
        id: String(row.id),
        athleteId: String(row.athlete_id),
        type: String(row.type),
        date: String(row.play_date),
        opponent: optionalText(row.opponent),
        note: optionalText(row.note),
        createdAt: optionalText(row.created_at),
      }))

  return consolidateAthleteAliases(
    normalizeAppData({ athletes, events, sessions, plays }),
  )
}

function nullable(value: unknown): unknown {
  return value === undefined ? null : value
}

/**
 * The cloud enforces `grade_snapshot is null or between 1 and 12`. An athlete
 * with no grade recorded yields a 0 snapshot, which would reject the whole
 * batch save — so anything outside 1-12 is written as null instead.
 */
function gradeSnapshotValue(value: unknown): number | null {
  const parsed = Math.round(Number(value))
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : null
}

async function existingIds(table: string, teamId: string): Promise<string[]> {
  const db = client()
  const { data, error } = await db.from(table).select('id').eq('team_id', teamId)
  throwIfError(error, `Could not inspect ${table}`)
  return (data ?? []).map((row) => String(row.id))
}

async function deleteMissing(
  table: string,
  teamId: string,
  existing: string[],
  current: Set<string>,
) {
  const missing = existing.filter((id) => !current.has(id))
  if (missing.length === 0) return
  const { error } = await client()
    .from(table)
    .delete()
    .eq('team_id', teamId)
    .in('id', missing)
  throwIfError(error, `Could not remove old ${table} rows`)
}

export async function saveCloudData(teamId: string, input: AppData): Promise<void> {
  const db = client()
  const data = consolidateAthleteAliases(normalizeAppData(input))
  const now = new Date().toISOString()

  const athleteRows = data.athletes.map((athlete) => ({
    team_id: teamId,
    id: athlete.id,
    name: athlete.name,
    grade: athlete.grade,
    position: athlete.position,
    position_group: athlete.positionGroup,
    height_in: athlete.heightIn,
    weight_lbs: athlete.weightLbs,
    photo_url: nullable(athlete.photoUrl),
    hudl_url: nullable(athlete.hudlUrl),
  }))

  const eventRows = data.events.map((event) => ({
    team_id: teamId,
    id: event.id,
    name: event.name,
    phase: event.phase,
    start_date: event.startDate,
    end_date: nullable(event.endDate),
    status: event.status ?? 'open',
    created_at: event.createdAt ?? now,
  }))

  const sessionRows = data.sessions.map((session) => {
    if (!session.eventId) {
      throw new Error(`Testing entry ${session.id} is missing its testing event.`)
    }
    return {
      team_id: teamId,
      id: session.id,
      athlete_id: session.athleteId,
      event_id: session.eventId,
      test_date: session.date,
      phase: session.phase,
      grade_snapshot: gradeSnapshotValue(session.gradeSnapshot),
      position_snapshot: nullable(session.positionSnapshot),
      position_group_snapshot: nullable(session.positionGroupSnapshot),
      weight_lbs_snapshot: nullable(session.weightLbsSnapshot),
      bench_max: nullable(session.benchMax),
      dash40_1: nullable(session.dash40_1),
      dash40_2: nullable(session.dash40_2),
      dash10_1: nullable(session.dash10_1),
      dash10_2: nullable(session.dash10_2),
      fly10_1: nullable(session.fly10_1),
      fly10_2: nullable(session.fly10_2),
      hang_clean_reps: nullable(session.hangCleanReps),
      shuttle20_1: nullable(session.shuttle20_1),
      shuttle20_2: nullable(session.shuttle20_2),
      lat_shuttle_1: nullable(session.latShuttle_1),
      lat_shuttle_2: nullable(session.latShuttle_2),
      illinois: nullable(session.illinois),
      squat_max: nullable(session.squatMax),
      broad_jump: nullable(session.broadJump),
      vertical_jump: nullable(session.verticalJump),
      cond51015: nullable(session.cond51015),
      created_at: session.createdAt ?? now,
    }
  })

  const [oldAthletes, oldEvents, oldSessions] = await Promise.all([
    existingIds('athletes', teamId),
    existingIds('testing_events', teamId),
    existingIds('test_sessions', teamId),
  ])

  if (athleteRows.length > 0) {
    const { error } = await db
      .from('athletes')
      .upsert(athleteRows, { onConflict: 'team_id,id' })
    throwIfError(error, 'Could not save athletes')
  }

  if (eventRows.length > 0) {
    const { error } = await db
      .from('testing_events')
      .upsert(eventRows, { onConflict: 'team_id,id' })
    throwIfError(error, 'Could not save testing events')
  }

  if (sessionRows.length > 0) {
    const { error } = await db
      .from('test_sessions')
      .upsert(sessionRows, { onConflict: 'team_id,id' })
    throwIfError(error, 'Could not save testing entries')
  }

  await deleteMissing(
    'test_sessions',
    teamId,
    oldSessions,
    new Set(data.sessions.map((session) => session.id)),
  )
  await deleteMissing(
    'athletes',
    teamId,
    oldAthletes,
    new Set(data.athletes.map((athlete) => athlete.id)),
  )
  await deleteMissing(
    'testing_events',
    teamId,
    oldEvents,
    new Set(data.events.map((event) => event.id)),
  )

  // Playmaker/Havoc plays sync separately and non-fatally: a team that has not
  // yet run the play_events migration keeps saving athletes and testing data.
  try {
    const playRows = (data.plays ?? []).map((play) => ({
      team_id: teamId,
      id: play.id,
      athlete_id: play.athleteId,
      type: play.type,
      play_date: play.date,
      opponent: nullable(play.opponent),
      note: nullable(play.note),
      created_at: play.createdAt ?? now,
    }))
    const oldPlays = await existingIds('play_events', teamId)
    if (playRows.length > 0) {
      const { error } = await db
        .from('play_events')
        .upsert(playRows, { onConflict: 'team_id,id' })
      throwIfError(error, 'Could not save plays')
    }
    await deleteMissing('play_events', teamId, oldPlays, new Set((data.plays ?? []).map((play) => play.id)))
  } catch {
    // play_events table not provisioned yet — skip play sync this save.
  }
}

export interface PublicTeamData {
  teamId: string
  teamName: string
  data: Required<AppData>
}

/**
 * Anonymous read-only load of the team's data for signed-out visitors.
 * Requires the public-read RLS policies; returns null when they are absent
 * or no team exists, so callers can fall back to on-device data.
 */
export async function loadPublicTeamData(): Promise<PublicTeamData | null> {
  const db = client()
  const { data: teams, error } = await db.from('teams').select('id, name').limit(1)
  if (error || !teams || teams.length === 0) return null

  const team = teams[0]
  const data = await loadCloudData(String(team.id))
  return { teamId: String(team.id), teamName: String(team.name), data }
}

export function cloudDataIsEmpty(data: Required<AppData>): boolean {
  return (
    data.athletes.length === 0 &&
    data.events.length === 0 &&
    data.sessions.length === 0
  )
}
