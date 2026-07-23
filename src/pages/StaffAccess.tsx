import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Card } from '../components/ui'
import {
  COACH_DUTIES,
  normalizeRole,
  roleLabel,
  type TeamRole,
} from '../lib/access'
import { supabase } from '../lib/supabase'
import {
  createTeamInvite,
  loadTeamClaims,
  loadTeamInvites,
  reviewAthleteClaim,
  revokeTeamInvite,
  type AthleteClaim,
  type TeamInvite,
} from '../store/accounts'

interface StaffContext {
  teamId: string
  userId: string
  role: TeamRole
}

const inputClass = 'w-full rounded-xl border border-line bg-ink px-3 py-2.5 text-sm text-chalk outline-none placeholder:text-muted focus:border-fai'

export default function StaffAccess() {
  const { data, teamName, teamRole } = useStore()
  const [context, setContext] = useState<StaffContext>()
  const [claims, setClaims] = useState<AthleteClaim[]>([])
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'coach' | 'viewer'>('coach')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  const athleteById = useMemo(() => new Map(data.athletes.map((athlete) => [athlete.id, athlete])), [data.athletes])

  async function refresh(teamId: string) {
    const [nextClaims, nextInvites] = await Promise.all([
      loadTeamClaims(teamId),
      loadTeamInvites(teamId),
    ])
    setClaims(nextClaims)
    setInvites(nextInvites)
  }

  useEffect(() => {
    void (async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        const user = sessionData.session?.user
        if (!user) throw new Error('Sign in before managing staff.')
        const { data: membership, error: memberError } = await supabase
          .from('team_members')
          .select('team_id,role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single()
        if (memberError) throw memberError
        const memberRole = normalizeRole(membership.role)
        if (memberRole !== 'owner' && memberRole !== 'admin') {
          throw new Error('Only an owner or administrator can manage claims and staff access.')
        }
        const next = { teamId: String(membership.team_id), userId: user.id, role: memberRole }
        setContext(next)
        await refresh(next.teamId)
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : 'Could not load staff access.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function invite() {
    if (!context || !email.trim()) return
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    try {
      await createTeamInvite({
        teamId: context.teamId,
        email,
        role,
        invitedBy: context.userId,
      })
      setEmail('')
      setMessage('Invitation created. The staff member can sign up with that email and press Accept invitation.')
      await refresh(context.teamId)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not create invitation.')
    } finally {
      setBusy(false)
    }
  }

  async function review(claim: AthleteClaim, approve: boolean) {
    if (!context) return
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    try {
      await reviewAthleteClaim(claim.id, approve)
      setMessage(approve ? 'Athlete account approved.' : 'Athlete claim rejected.')
      await refresh(context.teamId)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not review claim.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(inviteId: string) {
    if (!context) return
    setBusy(true)
    try {
      await revokeTeamInvite(inviteId)
      await refresh(context.teamId)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not revoke invitation.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-10 text-center text-sm font-bold text-muted">Loading staff access…</div>

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.2em] text-fai">Access Control</div>
        <h1 className="mt-1 text-3xl font-black">Staff & athlete claims</h1>
        <p className="mt-2 text-sm text-muted">{teamName ?? 'FAI Team'} · signed in as {roleLabel(normalizeRole(teamRole))}</p>
      </div>

      {(error || message) && (
        <div className={`rounded-xl border p-3 text-sm ${error ? 'border-down/40 bg-down/5 text-down' : 'border-fai/30 bg-fai/5 text-fai'}`}>
          {error ?? message}
        </div>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Athlete profile claims</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">Approve only after confirming the account belongs to that athlete. Approval grants photo and Hudl editing only.</p>
          </div>
          <span className="rounded-full border border-gold/30 px-3 py-1 text-xs font-black text-gold">{claims.filter((claim) => claim.status === 'pending').length} pending</span>
        </div>

        <div className="mt-4 space-y-2">
          {claims.length === 0 && <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">No athlete claims yet.</div>}
          {claims.map((claim) => {
            const athlete = athleteById.get(claim.athleteId)
            return (
              <div key={claim.id} className="flex flex-col gap-3 rounded-xl border border-line bg-panel-2/35 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="font-black text-chalk">{athlete?.name ?? claim.athleteId}</div>
                  <div className="text-xs text-muted">{claim.email ?? 'No email'} · requested {claim.requestedAt.slice(0, 10)}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-gold">{claim.status}</div>
                </div>
                {claim.status === 'pending' && (
                  <div className="flex gap-2">
                    <button type="button" disabled={busy} onClick={() => void review(claim, true)} className="rounded-lg bg-fai px-3 py-1.5 text-xs font-black text-ink disabled:opacity-50">Approve</button>
                    <button type="button" disabled={busy} onClick={() => void review(claim, false)} className="rounded-lg border border-down/40 px-3 py-1.5 text-xs font-black text-down disabled:opacity-50">Reject</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">Invite staff</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">Invite the exact email the staff member will use to create or sign into FAI.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="coach@example.com" className={inputClass} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className={inputClass}>
              <option value="coach">Coach</option>
              <option value="admin">Administrator</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
        </div>

        {role === 'coach' && (
          <div className="mt-4 rounded-xl border border-fai/20 bg-fai/5 p-4">
            <div className="text-sm font-black">Coach operating duties</div>
            <p className="mt-1 text-xs leading-relaxed text-muted">Coaches can assist with the complete football workflow but cannot manage staff accounts or use destructive data-administration tools.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {COACH_DUTIES.map((duty) => (
                <div key={duty.key} className="rounded-lg border border-line bg-panel/50 p-3">
                  <div className="text-sm font-black text-chalk">{duty.label}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted">{duty.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {role === 'admin' && (
          <div className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-4 text-xs leading-relaxed text-muted">
            Administrators receive every coach duty plus athlete-claim approval, staff invitations, imports, exports, backups, and team data administration.
          </div>
        )}

        {role === 'viewer' && (
          <div className="mt-4 rounded-xl border border-line bg-panel-2/35 p-4 text-xs leading-relaxed text-muted">Viewers can open team pages but cannot change team information.</div>
        )}

        <button type="button" disabled={busy || !email.trim()} onClick={() => void invite()} className="mt-4 rounded-xl bg-fai px-5 py-2.5 text-sm font-black text-ink disabled:opacity-50">Create invitation</button>
      </Card>

      <Card className="p-5">
        <h2 className="text-xl font-black">Invitations</h2>
        <div className="mt-3 space-y-2">
          {invites.length === 0 && <div className="text-sm text-muted">No staff invitations.</div>}
          {invites.map((invite) => (
            <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel-2/35 p-3">
              <div>
                <div className="text-sm font-black text-chalk">{invite.email}</div>
                <div className="text-xs text-muted">{roleLabel(invite.role)} · {invite.status}</div>
                {invite.role === 'coach' && <div className="mt-1 text-[10px] uppercase tracking-wider text-fai">Roster · testing · film · awards · reports</div>}
              </div>
              {invite.status === 'pending' && (
                <button type="button" disabled={busy} onClick={() => void revoke(invite.id)} className="rounded-lg border border-down/35 px-3 py-1.5 text-xs font-black text-down">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
