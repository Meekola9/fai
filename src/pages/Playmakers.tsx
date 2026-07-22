import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card, Pill, SectionTitle } from '../components/ui'
import {
  HAVOC_TYPES,
  PLAYMAKER_TYPES,
  PLAY_TYPE_BY_KEY,
  buildImpact,
  type AthleteImpact,
} from '../lib/impact'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function Meter({
  label,
  emoji,
  tone,
  total,
  leaders,
  pointsOf,
}: {
  label: string
  emoji: string
  tone: 'down' | 'up'
  total: number
  leaders: AthleteImpact[]
  pointsOf: (item: AthleteImpact) => number
}) {
  const max = Math.max(1, ...leaders.map(pointsOf))
  const accent = tone === 'down' ? 'text-down' : 'text-up'
  const bar = tone === 'down' ? 'bg-down' : 'bg-up'
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <SectionTitle>{emoji} {label}</SectionTitle>
        <div className={`text-3xl font-black nums ${accent}`}>{total}</div>
      </div>
      <div className="mt-3 space-y-2">
        {leaders.length === 0 && (
          <div className="text-sm text-muted">No plays logged yet.</div>
        )}
        {leaders.slice(0, 5).map((item, index) => {
          const points = pointsOf(item)
          return (
            <Link
              key={item.athlete.id}
              to={`/athletes/${item.athlete.id}`}
              className="flex items-center gap-3 rounded-xl bg-panel-2/40 px-3 py-2 transition hover:bg-panel-2"
            >
              <span className="w-4 text-center text-xs font-black text-muted">{index + 1}</span>
              <Avatar name={item.athlete.name} photoUrl={item.athlete.photoUrl} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-chalk">{item.athlete.name}</div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${(points / max) * 100}%` }} />
                </div>
              </div>
              <div className={`w-8 text-right text-sm font-black nums ${accent}`}>{points}</div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

function LevelCard({ item }: { item: AthleteImpact }) {
  const { level } = item
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-gold">
          <span className="text-[9px] font-bold uppercase leading-none tracking-wider">Lvl</span>
          <span className="text-lg font-black leading-none">{level.level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <Link to={`/athletes/${item.athlete.id}`} className="block truncate text-sm font-bold text-chalk hover:text-fai">
            {item.athlete.name}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
            {item.havocPoints > 0 && <Pill tone="down">💥 {item.havocPoints}</Pill>}
            {item.playmakerPoints > 0 && <Pill tone="up">⚡ {item.playmakerPoints}</Pill>}
            <span>· {item.playCount} play{item.playCount === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black nums text-fai">{item.totalPoints}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">points</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
          <div className="h-full rounded-full bg-gradient-to-r from-fai to-gold" style={{ width: `${Math.round(level.progress * 100)}%` }} />
        </div>
        <div className="mt-1 text-right text-[10px] text-muted">
          {level.next > level.floor
            ? `${item.totalPoints - level.floor}/${level.next - level.floor} to Level ${level.level + 1}`
            : 'Max level'}
        </div>
      </div>
    </Card>
  )
}

export default function Playmakers() {
  const { data, canEdit, addPlay, deletePlay } = useStore()
  const summary = useMemo(() => buildImpact(data.plays, data.athletes), [data.plays, data.athletes])

  const [athleteId, setAthleteId] = useState('')
  const [playType, setPlayType] = useState(HAVOC_TYPES[0].key)
  const [date, setDate] = useState(todayIso())
  const [opponent, setOpponent] = useState('')

  const roster = useMemo(
    () => [...data.athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [data.athletes],
  )
  const athleteById = useMemo(
    () => new Map(data.athletes.map((a) => [a.id, a])),
    [data.athletes],
  )
  const recentPlays = useMemo(
    () =>
      [...data.plays]
        .sort((a, b) => `${b.date}${b.createdAt ?? ''}`.localeCompare(`${a.date}${a.createdAt ?? ''}`))
        .slice(0, 12),
    [data.plays],
  )

  const havocLeaders = summary.athletes.filter((item) => item.havocPoints > 0)
  const playLeaders = [...summary.athletes]
    .filter((item) => item.playmakerPoints > 0)
    .sort((a, b) => b.playmakerPoints - a.playmakerPoints)

  function logPlay() {
    if (!athleteId) return
    addPlay({ athleteId, type: playType, date, opponent: opponent.trim() || undefined })
    setOpponent('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Playmakers &amp; Havoc</h1>
        <div className="mt-1 text-xs text-muted">
          Players earn points and level up by making plays. Havoc is defensive chaos; Playmakers are offensive &amp; special-teams explosions.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Meter
          label="Havoc Meter"
          emoji="💥"
          tone="down"
          total={summary.teamHavoc}
          leaders={havocLeaders}
          pointsOf={(item) => item.havocPoints}
        />
        <Meter
          label="Playmaker Meter"
          emoji="⚡"
          tone="up"
          total={summary.teamPlaymaker}
          leaders={playLeaders}
          pointsOf={(item) => item.playmakerPoints}
        />
      </div>

      {canEdit && (
        <Card className="p-5">
          <SectionTitle>Log a Play</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={athleteId}
              onChange={(event) => setAthleteId(event.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none focus:border-fai"
            >
              <option value="">Select athlete…</option>
              {roster.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
              ))}
            </select>
            <select
              value={playType}
              onChange={(event) => setPlayType(event.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none focus:border-fai"
            >
              <optgroup label="Havoc (defense)">
                {HAVOC_TYPES.map((play) => (
                  <option key={play.key} value={play.key}>{play.emoji} {play.label} (+{play.points})</option>
                ))}
              </optgroup>
              <optgroup label="Playmaker (offense / ST)">
                {PLAYMAKER_TYPES.map((play) => (
                  <option key={play.key} value={play.key}>{play.emoji} {play.label} (+{play.points})</option>
                ))}
              </optgroup>
            </select>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none focus:border-fai"
            />
            <input
              value={opponent}
              onChange={(event) => setOpponent(event.target.value)}
              placeholder="Opponent (optional)"
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none placeholder:text-muted focus:border-fai"
            />
          </div>
          <button
            type="button"
            onClick={logPlay}
            disabled={!athleteId}
            className="mt-3 rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink disabled:opacity-40"
          >
            + Log Play
          </button>
        </Card>
      )}

      <Card className="p-5">
        <SectionTitle>Level Up</SectionTitle>
        <div className="mb-3 text-xs text-muted">Every athlete ranked by total impact points earned.</div>
        {summary.athletes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-panel-2/30 p-6 text-center text-sm text-muted">
            No plays logged yet.{canEdit ? ' Use “Log a Play” above to start building the meters.' : ''}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.athletes.map((item) => (
              <LevelCard key={item.athlete.id} item={item} />
            ))}
          </div>
        )}
      </Card>

      {canEdit && recentPlays.length > 0 && (
        <Card className="p-5">
          <SectionTitle>Recent Plays</SectionTitle>
          <div className="mt-3 space-y-1.5">
            {recentPlays.map((play) => {
              const type = PLAY_TYPE_BY_KEY.get(play.type)
              const athlete = athleteById.get(play.athleteId)
              return (
                <div key={play.id} className="flex items-center gap-3 rounded-lg bg-panel-2/40 px-3 py-2 text-sm">
                  <span className="text-base">{type?.emoji ?? '•'}</span>
                  <span className="font-bold text-chalk">{athlete?.name ?? 'Unknown'}</span>
                  <span className="text-muted">{type?.label ?? play.type}</span>
                  <span className="text-xs text-muted">
                    +{type?.points ?? 0} · {play.date}{play.opponent ? ` · vs ${play.opponent}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => deletePlay(play.id)}
                    className="ml-auto rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-down/40 hover:text-down"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
