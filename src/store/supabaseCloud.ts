import {
  createClient,
  type AuthChangeEvent,
  type RealtimeChannel,
  type Session,
  type SupabaseClient,
} from '@supabase/supabase-js'
import type { AppData, Athlete, PositionGroup, TestSession, TestingEvent, TestingPhase } from '../types'
import type {
  CloudMutation,
  CloudRecordVersion,
  CloudSnapshot,
  CloudTeam,
  CloudUser,
  MutationResult,
  TeamRole,
} from './cloudTypes'

const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const isCloudConfigured = Boolean(url && anonKey)

let instance: SupabaseClient | null = null

export function cloudClient(): SupabaseClient | null {
  if (!isCloudConfigured) return null
  if (!instance) {
    instance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return instance
}

function requireClient(): SupabaseClient {
  const client = cloudClient()
  if (!client) throw new Error('Cloud sync is not configured.')
  return client
}

function userFromSession(session: Session | null): CloudUser | null {
  const email = session?.user.email
  return session?.user && email ? { id: session.user.id, email } : null
}

export async function currentCloudUser(): Promise<CloudUser | null> {
  const client = cloudClient()
  if (!client) return null
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return userFromSession(data.session)
}

export function onCloudAuthChange(
  callback: (event: AuthChangeEvent, user: CloudUser | null) => void,
): () => void {
  const client = cloudClient()
  if (!client) return () => undefined
  const { data } = client.auth.onAuthStateChange((event, session) => callback(event, userFromSession(session)))
  return () => data.subscription.unsubscribe()
}

export async function sendMagicLink(email: string): Promise<void> {
  const client = requireClient()
  const redirectTo = typeof window === 'undefined' ? undefined : window.location.origin + window.location.pathname
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

export async function signOutCloud(): Promise<void> {
  const { error } = await requireClient().auth.signOut()
  if (error) throw error
}

interface MembershipRow {
  team_id: string
  role: TeamRole
  fai_teams: { id: string; name: string; slug: string; created_at: string } | Array<{ id: string; name: string; slug: string; created_at: string }>
}

export async function listCloudTeams(): Promise<CloudTeam[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('fai_team_members')
    .select('team_id,role,fai_teams!inner(id,name,slug,created_at)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as MembershipRow[]).map((row) => {
    const team = Array.isArray(row.fai_teams) ? row.fai_teams[0] : row.fai_teams
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      role: row.role,
      createdAt: team.created_at,
    }
  })
}

export async function createCloudTeam(name: string): Promise<string> {
  const { data, error } = await requireClient().rpc('create_fai_team', { p_name: name.trim() })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('Team creation did not return an id.')
  return data
}

export async function joinCloudTeam(token: string): Promise<string> {
  const { data, error } = await requireClient().rpc('join_fai_team', { p_token: token.trim() })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('Team join did not return an id.')
  return data
}

export async function createCloudInvite(
  teamId: string,
  role: Exclude<TeamRole, 'owner'> = 'coach',
): Promise<string> {
  const { data, error } = await requireClient().rpc('create_fai_invite', {
    p_team_id: teamId,
    p_role: role,
    p_expires_hours: 168,
    p_max_uses: 10,
  })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('Invite creation did not return a token.')
  return data
}

function numberOrZero(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

interface AthleteRow {
  id: string
  name: string
  grade: number
  position: string
  position_group: PositionGroup
  height_in: number | string
  weight_lbs: number | string
  photo_url: string | null
  version: number
  updated_at: string
}

interface EventRow {
  id: string
  name: string
  phase: TestingPhase
  start_date: string
  end_date: string | null
  status: 'open' | 'closed' | null
  source_created_at: string | null
  version: number
  updated_at: string
}

interface SessionRow {
  id: string
  athlete_id: string
  event_id: string
  test_date: string
  phase: TestingPhase
  source_created_at: string | null
  grade_snapshot: number | null
  position_snapshot: string | null
  position_group_snapshot: PositionGroup | null
  weight_lbs_snapshot: number | string | null
  bench_max: number | string | null
  dash40_1: number | string | null
  dash40_2: number | string | null
  fly10_1: number | string | null
  fly10_2: number | string | null
  hang_clean_reps: number | string | null
  shuttle20_1: number | string | null
  shuttle20_2: number | string | null
  lat_shuttle_1: number | string | null
  lat_shuttle_2: number | string | null
  illinois: number | string | null
  squat_max: number | string | null
  broad_jump: number | string | null
  vertical_jump: number | string | null
  cond51015: number | string | null
  version: number
  updated_at: string
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function athleteFromRow(row: AthleteRow): Athlete {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    position: row.position,
    positionGroup: row.position_group,
    heightIn: numberOrZero(row.height_in),
    weightLbs: numberOrZero(row.weight_lbs),
    photoUrl: row.photo_url ?? undefined,
  }
}

function eventFromRow(row: EventRow): TestingEvent {
  return {
    id: row.id,
    name: row.name,
    phase: row.phase,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    status: row.status ?? undefined,
    createdAt: row.source_created_at ?? undefined,
  }
}

function sessionFromRow(row: SessionRow): TestSession {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    eventId: row.event_id,
    date: row.test_date,
    phase: row.phase,
    createdAt: row.source_created_at ?? undefined,
    gradeSnapshot: row.grade_snapshot ?? undefined,
    positionSnapshot: row.position_snapshot ?? undefined,
    positionGroupSnapshot: row.position_group_snapshot ?? undefined,
    weightLbsSnapshot: optionalNumber(row.weight_lbs_snapshot),
    benchMax: optionalNumber(row.bench_max),
    dash40_1: optionalNumber(row.dash40_1),
    dash40_2: optionalNumber(row.dash40_2),
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
  }
}

export async function loadCloudSnapshot(teamId: string): Promise<CloudSnapshot> {
  const client = requireClient()
  const [athletesResult, eventsResult, sessionsResult] = await Promise.all([
    client.from('fai_athletes').select('*').eq('team_id', teamId).is('deleted_at', null),
    client.from('fai_testing_events').select('*').eq('team_id', teamId).is('deleted_at', null),
    client.from('fai_test_sessions').select('*').eq('team_id', teamId).is('deleted_at', null),
  ])
  if (athletesResult.error) throw athletesResult.error
  if (eventsResult.error) throw eventsResult.error
  if (sessionsResult.error) throw sessionsResult.error

  const athleteRows = (athletesResult.data ?? []) as unknown as AthleteRow[]
  const eventRows = (eventsResult.data ?? []) as unknown as EventRow[]
  const sessionRows = (sessionsResult.data ?? []) as unknown as SessionRow[]
  const versions: CloudRecordVersion[] = [
    ...athleteRows.map((row) => ({ entity: 'athlete' as const, id: row.id, version: row.version, updatedAt: row.updated_at })),
    ...eventRows.map((row) => ({ entity: 'event' as const, id: row.id, version: row.version, updatedAt: row.updated_at })),
    ...sessionRows.map((row) => ({ entity: 'session' as const, id: row.id, version: row.version, updatedAt: row.updated_at })),
  ]
  const data: Required<AppData> = {
    athletes: athleteRows.map(athleteFromRow),
    events: eventRows.map(eventFromRow),
    sessions: sessionRows.map(sessionFromRow),
  }
  return { data, versions }
}

export async function applyCloudMutation(mutation: CloudMutation): Promise<MutationResult> {
  const { data, error } = await requireClient().rpc('apply_fai_mutation', {
    p_team_id: mutation.teamId,
    p_entity: mutation.entity,
    p_operation: mutation.operation,
    p_record_id: mutation.recordId,
    p_payload: mutation.payload ?? {},
    p_expected_version: mutation.expectedVersion,
  })
  if (error) return { ok: false, error: error.message }
  if (!data || typeof data !== 'object') return { ok: false, error: 'Cloud mutation returned an invalid response.' }
  const result = data as Record<string, unknown>
  return {
    ok: result.ok === true,
    conflict: result.conflict === true,
    version: optionalNumber(result.version),
    updatedAt: typeof result.updatedAt === 'string' ? result.updatedAt : undefined,
    remoteVersion: result.remoteVersion === null ? null : optionalNumber(result.remoteVersion),
    remoteRecord: result.remoteRecord as MutationResult['remoteRecord'],
    error: typeof result.error === 'string' ? result.error : undefined,
  }
}

export function subscribeCloudTeam(teamId: string, onChange: () => void): RealtimeChannel | null {
  const client = cloudClient()
  if (!client) return null
  return client
    .channel(`fai-team-${teamId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fai_athletes', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fai_testing_events', filter: `team_id=eq.${teamId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fai_test_sessions', filter: `team_id=eq.${teamId}` }, onChange)
    .subscribe()
}
