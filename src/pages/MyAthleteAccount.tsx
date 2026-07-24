import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card, Pill } from '../components/ui'
import { loadMyAthleteClaim, updateMyAthleteProfile, type AthleteClaim } from '../store/accounts'
import { awarenessBoostForScore, awarenessLevel, latestAwarenessFor } from '../lib/awarenessQuiz'

const AWARENESS_TONE: Record<string, 'up' | 'fai' | 'gold' | 'down'> = {
  'Elite IQ': 'up',
  Sharp: 'fai',
  Developing: 'gold',
  'Needs Study': 'down',
}

const inputClass = 'w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm text-chalk outline-none placeholder:text-muted focus:border-fai'

function formatQuizDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function AwarenessMeter({ score }: { score?: number }) {
  const safeScore = Math.max(0, Math.min(100, score ?? 0))
  const hasScore = typeof score === 'number'

  return (
    <div className="mt-5" data-testid="awareness-meter">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Awareness meter</div>
        <div className="nums text-xs font-black text-chalk">{hasScore ? `${safeScore}/100` : 'Not scored'}</div>
      </div>

      <div className="relative pt-4">
        {hasScore && (
          <div
            className="absolute top-0 z-10 -translate-x-1/2"
            style={{ left: `${safeScore}%` }}
            aria-label={`Awareness score marker: ${safeScore}`}
          >
            <div className="mx-auto h-3 w-3 rotate-45 rounded-[2px] border border-chalk/70 bg-chalk shadow-[0_0_14px_rgba(255,255,255,0.45)]" />
          </div>
        )}

        <div className="grid h-4 overflow-hidden rounded-full border border-line bg-panel-2 grid-cols-[60fr_15fr_15fr_10fr]">
          <div className={safeScore > 0 ? 'bg-down/70' : 'bg-down/25'} />
          <div className={safeScore >= 60 ? 'bg-gold/80' : 'bg-gold/25'} />
          <div className={safeScore >= 75 ? 'bg-fai/80' : 'bg-fai/20'} />
          <div className={safeScore >= 90 ? 'bg-up/80' : 'bg-up/20'} />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-down">Needs Study</div>
          <div className="nums text-[9px] text-muted">0–59</div>
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-gold">Developing</div>
          <div className="nums text-[9px] text-muted">60–74</div>
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-fai">Sharp</div>
          <div className="nums text-[9px] text-muted">75–89</div>
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-up">Elite IQ</div>
          <div className="nums text-[9px] text-muted">90–100</div>
        </div>
      </div>
    </div>
  )
}

function AwarenessQuizCard({ athleteId }: { athleteId: string }) {
  const { data } = useStore()
  const latest = latestAwarenessFor(data.awarenessResults, athleteId)
  const boost = latest ? awarenessBoostForScore(latest.score) : 0
  const level = latest ? awarenessLevel(latest.score) : undefined

  return (
    <Card className="overflow-hidden border-fai/35 bg-gradient-to-br from-fai/10 via-panel to-panel p-0">
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-fai">Football IQ</div>
            <h2 className="mt-1 text-2xl font-black text-chalk">Awareness Quiz</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Complete the 15-question football knowledge check. Your latest score becomes your Awareness rating and can add up to 5% to your overall FAI.
            </p>
          </div>

          {latest ? (
            <div className="min-w-[120px] rounded-2xl border border-line bg-black/25 p-4 text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Latest score</div>
              <div className="nums mt-1 text-5xl font-black leading-none text-chalk">{latest.score}</div>
              <div className="mt-2"><Pill tone={AWARENESS_TONE[level!]}>{level}</Pill></div>
              {boost > 0 && <div className="mt-2 text-xs font-black text-up">+{boost}% FAI</div>}
            </div>
          ) : (
            <div className="rounded-2xl border border-gold/30 bg-gold/5 px-4 py-3 text-center">
              <div className="text-2xl">🧠</div>
              <div className="mt-1 text-xs font-black text-gold">No score yet</div>
            </div>
          )}
        </div>

        <AwarenessMeter score={latest?.score} />

        {latest && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-panel-2/35 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted">Correct</div>
              <div className="nums mt-1 text-lg font-black text-chalk">{latest.correct}/{latest.total}</div>
            </div>
            <div className="rounded-xl border border-line bg-panel-2/35 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted">Level</div>
              <div className="mt-1 text-sm font-black text-chalk">{level}</div>
            </div>
            <div className="rounded-xl border border-line bg-panel-2/35 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted">Last taken</div>
              <div className="mt-1 text-sm font-black text-chalk">{formatQuizDate(latest.takenAt)}</div>
            </div>
          </div>
        )}
      </div>

      <Link
        to="/quiz"
        data-testid="athlete-awareness-quiz-link"
        className="flex w-full items-center justify-between border-t border-fai/25 bg-fai px-5 py-4 text-sm font-black text-ink transition hover:brightness-110"
      >
        <span>{latest ? 'Retake Awareness Quiz' : 'Take Awareness Quiz'}</span>
        <span aria-hidden="true">→</span>
      </Link>
    </Card>
  )
}

export default function MyAthleteAccount() {
  const { data, userEmail, signOut } = useStore()
  const [claim, setClaim] = useState<AthleteClaim | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [hudlUrl, setHudlUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    void (async () => {
      try {
        const next = await loadMyAthleteClaim()
        setClaim(next)
        const athlete = next ? data.athletes.find((item) => item.id === next.athleteId) : undefined
        setPhotoUrl(athlete?.photoUrl ?? '')
        setHudlUrl(athlete?.hudlUrl ?? '')
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : 'Could not load athlete account.')
      } finally {
        setLoading(false)
      }
    })()
  }, [data.athletes])

  const athlete = claim ? data.athletes.find((item) => item.id === claim.athleteId) : undefined

  async function save() {
    setBusy(true)
    setError(undefined)
    setMessage(undefined)
    try {
      await updateMyAthleteProfile(photoUrl.trim() || undefined, hudlUrl.trim() || undefined)
      setMessage('Profile updated. Reloading the latest team profile…')
      window.setTimeout(() => window.location.reload(), 700)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not save profile.')
      setBusy(false)
    }
  }

  if (loading) return <div className="p-10 text-center text-sm font-bold text-muted">Loading your athlete account…</div>

  if (!claim || claim.status !== 'approved' || !athlete) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <Card className="p-6 text-center">
          <h1 className="text-2xl font-black">Athlete profile not approved</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {claim?.status === 'pending'
              ? 'Your claim is waiting for an owner or administrator to approve it.'
              : claim?.status === 'rejected'
                ? 'Your claim was not approved. Contact your coaching staff before submitting another claim.'
                : 'This account does not have an approved athlete claim.'}
          </p>
          <Link to="/account/setup" className="mt-4 inline-block rounded-xl bg-fai px-5 py-2.5 text-sm font-black text-ink">Open account setup</Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-fai">Athlete Account</div>
          <h1 className="mt-1 text-3xl font-black">Manage my profile</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {userEmail}</p>
        </div>
        <button type="button" onClick={() => void signOut()} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted">Sign out</button>
      </div>

      {(error || message) && (
        <div className={`rounded-xl border p-3 text-sm ${error ? 'border-down/40 bg-down/5 text-down' : 'border-fai/30 bg-fai/5 text-fai'}`}>
          {error ?? message}
        </div>
      )}

      <AwarenessQuizCard athleteId={athlete.id} />

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={athlete.name} photoUrl={photoUrl || athlete.photoUrl} size={82} />
          <div>
            <h2 className="text-xl font-black text-chalk">{athlete.name}</h2>
            <div className="mt-1 text-sm text-muted">{athlete.position} · Grade {athlete.grade}</div>
            <div className="mt-2 inline-flex rounded-full border border-fai/30 bg-fai/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-fai">Claim approved</div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted">Profile photo URL</span>
            <input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://…" className={inputClass} />
            <p className="mt-1 text-xs leading-relaxed text-muted">Use a direct image link. Coaches can replace inappropriate or incorrect photos.</p>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase tracking-wider text-muted">Hudl / highlight link</span>
            <input value={hudlUrl} onChange={(event) => setHudlUrl(event.target.value)} placeholder="https://www.hudl.com/…" className={inputClass} />
            <p className="mt-1 text-xs leading-relaxed text-muted">Add your Hudl profile, highlight reel, YouTube, or Vimeo link.</p>
          </label>

          <button type="button" disabled={busy} onClick={() => void save()} className="rounded-xl bg-fai px-6 py-3 text-sm font-black text-ink disabled:opacity-50">
            {busy ? 'Saving…' : 'Save my profile'}
          </button>
        </div>
      </Card>

      <Card className="border-gold/25 p-4">
        <div className="text-sm font-black text-chalk">Protected team information</div>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Your name, grade, positions, height, weight, testing results, film grades, badges, and FAI score remain controlled by authorized staff. Athlete accounts can change only the photo and Hudl fields above.
        </p>
      </Card>
    </div>
  )
}
