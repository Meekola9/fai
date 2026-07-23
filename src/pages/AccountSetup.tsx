import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Card } from '../components/ui'
import { supabase } from '../lib/supabase'
import {
  acceptMyTeamInvite,
  loadMyAthleteClaim,
  requestAthleteClaim,
  type AthleteClaim,
} from '../store/accounts'

interface PublicAthlete {
  id: string
  teamId: string
  teamName: string
  name: string
  grade: number
  position: string
}

export default function AccountSetup() {
  const { userEmail, signOut } = useStore()
  const [athletes, setAthletes] = useState<PublicAthlete[]>([])
  const [query, setQuery] = useState('')
  const [claim, setClaim] = useState<AthleteClaim | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    void (async () => {
      try {
        const existing = await loadMyAthleteClaim()
        setClaim(existing)
        if (!supabase) return
        const [athleteResult, teamResult] = await Promise.all([
          supabase.from('athletes').select('id,team_id,name,grade,position').order('name'),
          supabase.from('teams').select('id,name'),
        ])
        if (athleteResult.error) throw athleteResult.error
        if (teamResult.error) throw teamResult.error
        const teamById = new Map((teamResult.data ?? []).map((team) => [String(team.id), String(team.name)]))
        setAthletes((athleteResult.data ?? []).map((athlete) => ({
          id: String(athlete.id),
          teamId: String(athlete.team_id),
          teamName: teamById.get(String(athlete.team_id)) ?? 'FAI Team',
          name: String(athlete.name),
          grade: Number(athlete.grade),
          position: String(athlete.position).split('||')[0],
        })))
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : 'Could not load account setup.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return athletes.slice(0, 30)
    return athletes.filter((athlete) =>
      `${athlete.name} ${athlete.teamName} ${athlete.position}`.toLowerCase().includes(term),
    ).slice(0, 30)
  }, [athletes, query])

  async function submitClaim(athleteId: string) {
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    try {
      const next = await requestAthleteClaim(athleteId)
      setClaim(next)
      setMessage('Claim submitted. An FAI owner or administrator must approve it.')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not submit claim.')
    } finally {
      setBusy(false)
    }
  }

  async function acceptInvite() {
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    try {
      await acceptMyTeamInvite()
      setMessage('Invitation accepted. Reloading your team access…')
      window.setTimeout(() => window.location.reload(), 700)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No invitation could be accepted.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-ink text-sm font-bold text-muted">Loading account setup…</div>
  }

  return (
    <div className="min-h-screen bg-ink px-4 py-8 text-chalk">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-fai">FAI Account Setup</div>
            <h1 className="mt-1 text-3xl font-black">Join your team</h1>
            <p className="mt-2 text-sm text-muted">Signed in as {userEmail ?? 'your Supabase account'}.</p>
          </div>
          <button type="button" onClick={() => void signOut()} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted">Sign out</button>
        </div>

        {(error || message) && (
          <div className={`rounded-xl border p-3 text-sm ${error ? 'border-down/40 bg-down/5 text-down' : 'border-fai/30 bg-fai/5 text-fai'}`}>
            {error ?? message}
          </div>
        )}

        <Card className="p-5">
          <h2 className="text-lg font-black">Coach or staff invitation</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Your owner can invite this email as an administrator, coach, or viewer. Accepting applies the assigned duties automatically.
          </p>
          <button type="button" disabled={busy} onClick={() => void acceptInvite()} className="mt-4 rounded-xl bg-fai px-5 py-2.5 text-sm font-black text-ink disabled:opacity-50">
            Accept invitation for {userEmail ?? 'this email'}
          </button>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Claim an athlete profile</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Select only your own roster profile. Approval lets you update your photo and Hudl link—not testing scores, positions, badges, or film grades.
              </p>
            </div>
            {claim && (
              <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${claim.status === 'approved' ? 'border-fai/30 text-fai' : claim.status === 'rejected' ? 'border-down/30 text-down' : 'border-gold/30 text-gold'}`}>
                Claim {claim.status}
              </span>
            )}
          </div>

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your name, team, or position…"
            className="mt-4 w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-fai"
          />

          <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((athlete) => (
              <div key={`${athlete.teamId}-${athlete.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel-2/35 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">{athlete.name}</div>
                  <div className="text-xs text-muted">{athlete.teamName} · Grade {athlete.grade} · {athlete.position}</div>
                </div>
                <button
                  type="button"
                  disabled={busy || claim?.status === 'approved'}
                  onClick={() => void submitClaim(athlete.id)}
                  className="shrink-0 rounded-lg border border-fai/35 px-3 py-1.5 text-xs font-black text-fai disabled:opacity-40"
                >
                  Claim profile
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div className="p-5 text-center text-sm text-muted">No athlete matches that search.</div>}
          </div>
        </Card>
      </div>
    </div>
  )
}
