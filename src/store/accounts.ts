import { supabase } from '../lib/supabase'
import {
  COACH_OPERATIONAL_PERMISSIONS,
  normalizePermissions,
  normalizeRole,
  type TeamPermissions,
  type TeamRole,
} from '../lib/access'

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface AthleteClaim {
  id: string
  teamId: string
  athleteId: string
  userId: string
  email?: string
  status: ClaimStatus
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: string
  note?: string
}

export interface StaffMember {
  userId: string
  teamId: string
  role: TeamRole
  permissions: TeamPermissions
  createdAt?: string
  email?: string
  athleteId?: string
}

export interface TeamInvite {
  id: string
  teamId: string
  email: string
  role: Exclude<TeamRole, 'owner' | 'athlete'>
  permissions: TeamPermissions
  status: 'pending' | 'accepted' | 'revoked'
  createdAt: string
  acceptedAt?: string
}

function db() {
  if (!supabase) throw new Error('Supabase is not configured for this build.')
  return supabase
}

function throwIfError(error: { message: string } | null, operation: string) {
  if (error) throw new Error(`${operation}: ${error.message}`)
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function mapClaim(row: Record<string, unknown>): AthleteClaim {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    athleteId: String(row.athlete_id),
    userId: String(row.user_id),
    email: text(row.email),
    status: String(row.status) as ClaimStatus,
    requestedAt: String(row.requested_at),
    reviewedAt: text(row.reviewed_at),
    reviewedBy: text(row.reviewed_by),
    note: text(row.note),
  }
}

export async function signUpAccount(email: string, password: string): Promise<void> {
  const { error } = await db().auth.signUp({
    email: email.trim(),
    password,
  })
  throwIfError(error, 'Could not create account')
}

export async function requestAthleteClaim(athleteId: string): Promise<AthleteClaim> {
  const { data, error } = await db().rpc('request_athlete_claim', {
    p_athlete_id: athleteId,
  })
  throwIfError(error, 'Could not submit athlete claim')
  if (!data) throw new Error('The claim was not returned by Supabase.')
  return mapClaim(data as Record<string, unknown>)
}

export async function loadMyAthleteClaim(): Promise<AthleteClaim | null> {
  const { data, error } = await db()
    .from('athlete_claims')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  // Migration rollout is non-fatal: older databases simply have no claim support yet.
  if (error && /does not exist|schema cache/i.test(error.message)) return null
  throwIfError(error, 'Could not load athlete claim')
  return data ? mapClaim(data as Record<string, unknown>) : null
}

export async function loadTeamClaims(teamId: string): Promise<AthleteClaim[]> {
  const { data, error } = await db()
    .from('athlete_claims')
    .select('*')
    .eq('team_id', teamId)
    .order('requested_at', { ascending: false })
  throwIfError(error, 'Could not load athlete claims')
  return (data ?? []).map((row) => mapClaim(row as Record<string, unknown>))
}

export async function reviewAthleteClaim(
  claimId: string,
  approve: boolean,
  note?: string,
): Promise<AthleteClaim> {
  const { data, error } = await db().rpc('review_athlete_claim', {
    p_claim_id: claimId,
    p_approve: approve,
    p_note: note ?? null,
  })
  throwIfError(error, 'Could not review athlete claim')
  if (!data) throw new Error('The reviewed claim was not returned by Supabase.')
  return mapClaim(data as Record<string, unknown>)
}

export async function updateMyAthleteProfile(photoUrl?: string, hudlUrl?: string): Promise<void> {
  const { error } = await db().rpc('update_my_athlete_profile', {
    p_photo_url: photoUrl ?? '',
    p_hudl_url: hudlUrl ?? '',
  })
  throwIfError(error, 'Could not update athlete profile')
}

export async function createTeamInvite(input: {
  teamId: string
  email: string
  role: 'admin' | 'coach' | 'viewer'
  invitedBy: string
}): Promise<void> {
  const { error } = await db().from('team_invites').upsert({
    team_id: input.teamId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    permissions: input.role === 'coach' ? COACH_OPERATIONAL_PERMISSIONS : {},
    status: 'pending',
    invited_by: input.invitedBy,
    created_at: new Date().toISOString(),
    accepted_at: null,
  }, { onConflict: 'team_id,email' })
  throwIfError(error, 'Could not create staff invitation')
}

export async function acceptMyTeamInvite(): Promise<void> {
  const { error } = await db().rpc('accept_team_invite')
  throwIfError(error, 'Could not accept team invitation')
}

export async function loadTeamInvites(teamId: string): Promise<TeamInvite[]> {
  const { data, error } = await db()
    .from('team_invites')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
  throwIfError(error, 'Could not load staff invitations')
  return (data ?? []).map((row) => ({
    id: String(row.id),
    teamId: String(row.team_id),
    email: String(row.email),
    role: normalizeRole(row.role) as TeamInvite['role'],
    permissions: normalizePermissions(row.permissions),
    status: String(row.status) as TeamInvite['status'],
    createdAt: String(row.created_at),
    acceptedAt: text(row.accepted_at),
  }))
}

export async function revokeTeamInvite(inviteId: string): Promise<void> {
  const { error } = await db().from('team_invites').update({ status: 'revoked' }).eq('id', inviteId)
  throwIfError(error, 'Could not revoke staff invitation')
}
