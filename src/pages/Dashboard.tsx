import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { teamStats, type LeaderRow } from '../lib/leaderboards'
import { CATEGORY_SHORT, formatHeight } from '../data/constants'
import {
  Avatar,
  Card,
  DeltaBadge,
  FaiRing,
  RankBadge,
  SectionTitle,
  StatTile,
} from '../components/ui'
import { RadarChart } from '../components/charts'
import type { AthleteResult, Category } from '../types'
import { useMemo } from 'react'

function LeaderMini({ label, row, sub }: { label: string; row?: LeaderRow; sub: string }) {
  if (!row)
    return (
      <Card className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
        <div className="mt-2 text-sm text-muted">No data yet</div>
      </Card>
    )
  const a = row.result.athlete
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <Link to={`/athletes/${a.id}`} className="mt-2 flex items-center gap-3 group">
        <Avatar name={a.name} photoUrl={a.photoUrl} size={44} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-chalk group-hover:text-fai">{a.name}</div>
          <div className="text-xs text-muted">
            {a.positionGroup} · Gr {a.grade}
          </div>
        </div>
      </Link>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-black nums text-fai">{row.display}</span>
        <span className="text-[11px] text-muted">{sub}</span>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { results } = useStore()
  const stats = useMemo(() => teamStats(results), [results])
  const top5 = results.slice(0, 5)

  const radar = useMemo(
    () => ({
      label: 'Team Average',
      color: '#22d3ee',
      values: Object.fromEntries(
        stats.categoryAverages.map((c) => [c.category, c.avg]),
      ) as Record<Category, number>,
    }),
    [stats],
  )

  if (!results.length) {
    return (
      <Card className="p-10 text-center">
        <div className="text-lg font-bold">No athletes yet</div>
        <div className="mt-1 text-sm text-muted">
          Add athletes and testing data to see the coach dashboard.
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/athletes/new" className="rounded-lg bg-fai px-4 py-2 text-sm font-bold text-ink">
            Add Athlete
          </Link>
          <Link to="/data" className="rounded-lg border border-line px-4 py-2 text-sm font-bold">
            Load Sample Data
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card glow className="flex items-center gap-4 p-5">
          <FaiRing score={stats.avgFai} size={104} label="Team FAI" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Team Average FAI
            </div>
            <div className="mt-1 flex items-center gap-2">
              <DeltaBadge
                value={stats.avgImprovement}
                trend={
                  stats.avgImprovement > 0.05
                    ? 'improved'
                    : stats.avgImprovement < -0.05
                      ? 'regressed'
                      : 'same'
                }
                size="lg"
              />
              <span className="text-xs text-muted">avg change</span>
            </div>
          </div>
        </Card>
        <StatTile label="Athletes Tested" value={stats.testedCount} accent="fai" />
        <StatTile
          label="Best Team Category"
          value={stats.bestCategory ? CATEGORY_SHORT[stats.bestCategory.category] : '—'}
          sub={stats.bestCategory ? `${stats.bestCategory.avg} avg score` : ''}
          accent="up"
        />
        <StatTile
          label="Weakest Team Category"
          value={stats.weakestCategory ? CATEGORY_SHORT[stats.weakestCategory.category] : '—'}
          sub={stats.weakestCategory ? `${stats.weakestCategory.avg} avg score` : ''}
          accent="flame"
        />
      </div>

      {/* Superlatives */}
      <section>
        <SectionTitle>Team Leaders</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <LeaderMini label="Fastest (40)" row={stats.fastest} sub="best 40" />
          <LeaderMini label="Strongest" row={stats.strongest} sub="STR score" />
          <LeaderMini label="Most Explosive" row={stats.mostExplosive} sub="PWR score" />
          <LeaderMini label="Best Change of Dir." row={stats.bestCod} sub="COD score" />
          <LeaderMini label="Most Improved" row={stats.mostImproved} sub="FAI gain" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top 5 FAI */}
        <Card className="p-5 lg:col-span-2">
          <SectionTitle right={<Link to="/leaderboards" className="text-xs font-bold text-fai">View all →</Link>}>
            Top 5 · Overall FAI
          </SectionTitle>
          <div className="space-y-2">
            {top5.map((r) => (
              <TopRow key={r.athlete.id} r={r} />
            ))}
          </div>
        </Card>

        {/* Team radar */}
        <Card className="p-5">
          <SectionTitle>Team Category Profile</SectionTitle>
          <RadarChart series={[radar]} />
          <div className="mt-2 grid grid-cols-5 gap-1 text-center">
            {stats.categoryAverages.map((c) => (
              <div key={c.category}>
                <div className="text-lg font-black nums text-chalk">{c.avg}</div>
                <div className="text-[10px] font-semibold uppercase text-muted">
                  {CATEGORY_SHORT[c.category]}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function TopRow({ r }: { r: AthleteResult }) {
  const a = r.athlete
  return (
    <Link
      to={`/athletes/${a.id}`}
      className="flex items-center gap-3 rounded-xl border border-transparent bg-panel-2/50 px-3 py-2 transition hover:border-line hover:bg-panel-2"
    >
      <RankBadge rank={r.teamRank} />
      <Avatar name={a.name} photoUrl={a.photoUrl} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-chalk">{a.name}</div>
        <div className="text-xs text-muted">
          {a.position} · {a.positionGroup} · Gr {a.grade} · {formatHeight(a.heightIn)} · {a.weightLbs} lbs
        </div>
      </div>
      {r.previous && (
        <DeltaBadge value={r.faiImprovement} trend={r.faiImprovement > 0.05 ? 'improved' : r.faiImprovement < -0.05 ? 'regressed' : 'same'} />
      )}
      <div className="w-14 text-right text-2xl font-black nums text-fai">
        {r.current.fai.toFixed(1)}
      </div>
    </Link>
  )
}
