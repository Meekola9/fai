import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { TeamRole } from '../store/cloudTypes'
import { Card, Pill, SectionTitle } from './ui'

const inputClass =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none placeholder:text-muted/60 focus:border-fai'

function statusTone(state: string): 'up' | 'down' | undefined {
  if (state === 'synced') return 'up'
  if (state === 'error' || state === 'conflict') return 'down'
  return undefined
}

export default function CloudPanel() {
  const { cloud } = useStore()
  const [email, setEmail] = useState('')
  const [teamName, setTeamName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [newInvite, setNewInvite] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<TeamRole, 'owner'>>('coach')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label)
    setError('')
    try {
      await action()
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Cloud action failed.')
    } finally {
      setBusy('')
    }
  }

  if (!cloud.configured) {
    return (
      <Card className="border-gold/30 p-5">
        <SectionTitle>Cloud Sync</SectionTitle>
        <div className="mt-2 text-sm text-muted">
          Cloud code is installed, but this deployment has no Supabase environment variables. The app remains fully usable in local mode.
        </div>
        <div className="mt-3 rounded-lg border border-line bg-panel-2/40 p-3 text-xs text-muted">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> after running the authenticated cloud migration.
        </div>
      </Card>
    )
  }

  if (!cloud.user) {
    return (
      <Card className="border-fai/30 p-5">
        <SectionTitle>Secure Cloud Sign-In</SectionTitle>
        <p className="mt-2 text-sm text-muted">
          Sign in by email. Supabase sends a one-time link; no password is stored in FAI.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className={inputClass}
            type="email"
            placeholder="coach@school.org"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            type="button"
            disabled={!email.trim() || Boolean(busy)}
            onClick={() => run('link', () => cloud.sendLink(email))}
            className="rounded-lg bg-fai px-5 py-2 text-sm font-black text-ink disabled:opacity-40"
          >
            {busy === 'link' ? 'Sending…' : 'Email Sign-In Link'}
          </button>
        </div>
        {cloud.authMessage && <div className="mt-3 text-sm font-semibold text-up">{cloud.authMessage}</div>}
        {error && <div className="mt-3 text-sm text-down">{error}</div>}
      </Card>
    )
  }

  const isAdmin = cloud.activeTeam?.role === 'owner' || cloud.activeTeam?.role === 'admin'

  return (
    <Card className="border-fai/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Authenticated Team Cloud</SectionTitle>
        <div className="flex items-center gap-2">
          <Pill tone={statusTone(cloud.status.state)}>
            {cloud.status.message}{cloud.status.pending ? ` · ${cloud.status.pending} queued` : ''}
          </Pill>
          <button
            type="button"
            onClick={() => run('signout', cloud.signOut)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted hover:text-chalk"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-1 text-xs text-muted">Signed in as {cloud.user.email}</div>
      {error && <div className="mt-3 rounded-lg border border-down/30 bg-down/5 p-3 text-sm text-down">{error}</div>}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-line bg-panel-2/30 p-4">
          <div className="text-sm font-black text-chalk">Your teams</div>
          {cloud.teams.length > 0 ? (
            <select
              className={inputClass}
              value={cloud.activeTeam?.id ?? ''}
              onChange={(event) => cloud.selectTeam(event.target.value)}
            >
              {cloud.teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name} · {team.role}</option>
              ))}
            </select>
          ) : (
            <div className="text-xs text-muted">Create a team or join with an invite token.</div>
          )}
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Team name"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
            />
            <button
              type="button"
              disabled={!teamName.trim() || Boolean(busy)}
              onClick={() => run('create', async () => { await cloud.createTeam(teamName); setTeamName('') })}
              className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink disabled:opacity-40"
            >
              Create
            </button>
          </div>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="Invite token"
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
            />
            <button
              type="button"
              disabled={!inviteToken.trim() || Boolean(busy)}
              onClick={() => run('join', async () => { await cloud.joinTeam(inviteToken); setInviteToken('') })}
              className="rounded-lg border border-fai/40 px-4 py-2 text-sm font-bold text-fai disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-panel-2/30 p-4">
          <div className="text-sm font-black text-chalk">Selected team</div>
          {cloud.activeTeam ? (
            <>
              <div>
                <div className="font-bold text-chalk">{cloud.activeTeam.name}</div>
                <div className="text-xs text-muted">Role: {cloud.activeTeam.role} · slug: {cloud.activeTeam.slug}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => run('refresh', cloud.refresh)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-chalk"
                >
                  Refresh cloud
                </button>
                {cloud.status.pending > 0 && (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => run('retry', cloud.flush)}
                    className="rounded-lg border border-fai/40 px-3 py-1.5 text-xs font-bold text-fai"
                  >
                    Retry queued changes
                  </button>
                )}
              </div>
              {!cloud.canEdit && (
                <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
                  Viewer access is read-only. Local editing controls are blocked while this team is selected.
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted">No team selected.</div>
          )}
        </div>
      </div>

      {isAdmin && cloud.activeTeam && (
        <div className="mt-4 rounded-xl border border-line bg-panel-2/30 p-4">
          <div className="text-sm font-black text-chalk">Invite staff</div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <select className={inputClass} value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Exclude<TeamRole, 'owner'>)}>
              <option value="coach">Coach — can edit</option>
              <option value="viewer">Viewer — read only</option>
              <option value="admin">Admin — manage team</option>
            </select>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => run('invite', async () => setNewInvite(await cloud.createInvite(inviteRole)))}
              className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink"
            >
              Generate Invite
            </button>
          </div>
          {newInvite && (
            <div className="mt-3 rounded-lg border border-up/30 bg-up/5 p-3 text-sm text-up">
              Share this token securely: <code className="select-all font-bold">{newInvite}</code>
            </div>
          )}
        </div>
      )}

      {cloud.conflicts.length > 0 && (
        <div className="mt-4 space-y-2 rounded-xl border border-down/40 bg-down/5 p-4">
          <div className="font-black text-down">Cloud conflicts require a decision</div>
          {cloud.conflicts.map((conflict) => (
            <div key={conflict.mutation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel p-3">
              <div className="text-sm text-chalk">
                {conflict.mutation.entity} <code>{conflict.mutation.recordId}</code> changed on another device.
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => cloud.keepMine(conflict.mutation.id)} className="rounded-lg border border-flame/40 px-3 py-1.5 text-xs font-bold text-flame">
                  Keep mine
                </button>
                <button type="button" onClick={() => run('cloud', () => cloud.useCloud(conflict.mutation.id))} className="rounded-lg border border-fai/40 px-3 py-1.5 text-xs font-bold text-fai">
                  Use cloud
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
