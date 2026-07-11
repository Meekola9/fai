import { useMemo } from 'react'
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

function LeaderMini({ label, row, sub }: { label: string; row?: LeaderRow; sub: string }) {
  if (!row) {
    return (
      <Card className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
        <div className="mt-2 text-sm text-muted">No complete data yet</div>
      </Card>
    )
  }
  const athlete = row.result.athlete
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <Link to={`/athletes/${athlete.id}`} className="group mt-2 flex items-center gap-3">
        <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={44} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-chalk group-hover:text-fai">{athlete.name}</div>
          <div className="text-xs text-muted">
            {row.result.current.session.positionGroupSnapshot ?? athlete.positionGroup} · Gr{' '}
            {row.result.current.session.gradeSnapshot ?? athlete.grade}
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
  const { data, results } = useStore()
  const stats = useMemo(() => teamStats(results), [results])
  const topFive = results.filter((result) => result.rankEligible).slice(0, 5)

  const radar = useMemo(
    () => ({
      label: 'Team Average',
      color: '#22d3ee',
      values: Object.fromEntries(
        stats.categoryAverages.map((item) => [item.category, item.avg]),
      ) as Record<Category, number>,
    }),
    [stats.categoryAverages],
  )

  if (!data.athletes.length) {
    return (
      <Card className="p-10 text-center">
        <div className="text-lg font-bold">No athletes yet</div>
        <div className="mt-1 text-sm text-muted">Add a roster and create a testing event.</div>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/athletes/new" className="rounded-lg bg-fai px-4 py-2 text-sm font-bold text-ink">Add Athlete</Link>
          <Link to="/data" className="rounded-lg border border-line px-4 py-2 text-sm font-bold">Import Roster</Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card glow className="flex items-center gap-4 p-5">
          <FaiRing score={stats.avgFai} size={104} label="Team FAI" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Official Team Average</div>
            <div className="mt-1 flex items-center gap-2">
              <DeltaBadge
                value={stats.avgImprovement}
                trend={stats.avgImprovement > 0.05 ? 'improved' : stats.avgImprovement < -0.05 ? 'regressed' : 'same'}
                size="lg"
              />
              <span className="text-xs text-muted">avg change</span>
            </div>
          </div>
        </Card>
        <StatTile label="Complete Scores" value={stats.completeCount} sub={`${stats.testedCount} athletes with entries`} accent="fai" />
        <StatTile label="Provisional" value={stats.provisionalCount} sub="Excluded from rankings" accent="flame" />
        <StatTile
          label="Weakest Team Category"
          value={stats.weakestCategory ? CATEGORY_SHORT[stats.weakestCategory.category] : '—'}
          sub={stats.weakestCategory ? `${stats.weakestCategory.avg} avg score` : 'Need complete scores'}
          accent="flame"
        />
      </div>

      {stats.provisionalCount > 0 && (
        <Card className="border-flame/30 bg-flame/5 p-4 text-sm text-muted">
          Provisional athletes need the remaining required tests before they receive official team or position-group ranks.
        </Card>
      )}

      <section>
        <SectionTitle>Team Leaders · Complete Scores Only</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <LeaderMini label="Fastest (40)" row={stats.fastest} sub="best 40" />
          <LeaderMini label="Strongest" row={stats.strongest} sub="relative STR" />
          <LeaderMini label="Most Explosive" row={stats.mostExplosive} sub="PWR score" />
          <LeaderMini label="Best Change of Dir." row={stats.bestCod} sub="COD score" />
          <LeaderMini label="Most Improved" row={stats.mostImproved} sub="FAI gain" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle right={<Link to="/leaderboards" className="text-xs font-bold text-fai">View all →</Link>}>
            Top 5 · Official FAI
          </SectionTitle>
          {topFive.length ? (
            <div className="space-y-2">{topFive.map((result) => <TopRow key={result.athlete.id} result={result} />)}</div>
          ) : (
            <div className="py-10 text-center text-sm text-muted">No athlete has completed the required testing battery yet.</div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>Team Category Profile</SectionTitle>
          <RadarChart series={[radar]} />
          <div className="mt-2 grid grid-cols-5 gap-1 text-center">
            {stats.categoryAverages.map((item) => (
              <div key={item.category}>
                <div className="text-lg font-black nums text-chalk">{item.avg}</div>
                <div className="text-[10px] font-semibold uppercase text-muted">{CATEGORY_SHORT[item.category]}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function TopRow({ result }: { result: AthleteResult }) {
  const athlete = result.athlete
  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="flex items-center gap-3 rounded-xl border border-transparent bg-panel-2/50 px-3 py-2 transition hover:border-line hover:bg-panel-2"
    >
      <RankBadge rank={result.teamRank} />
      <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-chalk">{athlete.name}</div>
        <div className="text-xs text-muted">
          {athlete.position} · {athlete.positionGroup} · Gr {athlete.grade} · {formatHeight(athlete.heightIn)} · {athlete.weightLbs} lbs
        </div>
      </div>
      {result.previous && (
        <DeltaBadge value={result.faiImprovement} trend={result.faiImprovement > 0.05 ? 'improved' : result.faiImprovement < -0.05 ? 'regressed' : 'same'} />
      )}
      <div className="w-14 text-right text-2xl font-black nums text-fai">{result.current.fai.toFixed(1)}</div>
    </Link>
  )
}
