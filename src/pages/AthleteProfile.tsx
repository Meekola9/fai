import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { athleteTimeline } from '../lib/compute'
import { computeProgress, strengths, weaknesses } from '../lib/progress'
import { SCORED_METRICS } from '../data/scoring'
import { CATEGORIES, CATEGORY_SHORT, formatHeight } from '../data/constants'
import {
  Avatar,
  Card,
  DeltaBadge,
  FaiRing,
  Pill,
  SectionTitle,
  TrendArrow,
} from '../components/ui'
import { RadarChart, LineChart, ScoreMeter } from '../components/charts'
import type { Category } from '../types'

function trendOf(value: number) {
  return value > 0.05 ? 'improved' : value < -0.05 ? 'regressed' : ('same' as const)
}

const CATEGORY_COLOR: Record<Category, string> = {
  Speed: '#22d3ee',
  Power: '#f97316',
  'Change of Direction': '#a78bfa',
  Conditioning: '#34d399',
  Strength: '#fbbf24',
}

export default function AthleteProfile() {
  const { id } = useParams()
  const { data, computed, resultByAthlete, gradeLabelFor } = useStore()
  const athlete = id ? data.athletes.find((item) => item.id === id) : undefined
  const result = id ? resultByAthlete.get(id) : undefined
  const timeline = useMemo(() => (id ? athleteTimeline(computed, id) : []), [computed, id])

  if (!athlete) {
    return (
      <Card className="p-10 text-center">
        <div className="text-lg font-bold">Athlete not found</div>
        <Link to="/athletes" className="mt-3 inline-block text-sm font-semibold text-fai">← Back to athletes</Link>
      </Card>
    )
  }

  if (!result || timeline.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <ProfileNav athleteId={athlete.id} />
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={80} />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-chalk">{athlete.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <Pill tone="fai">{athlete.positionGroup}</Pill>
                <span>{athlete.position}</span>
                <span>· {gradeLabelFor(athlete, 'long')}</span>
                <span>· {formatHeight(athlete.heightIn)}</span>
                <span>· {athlete.weightLbs} lbs</span>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-line bg-panel-2/30 p-6 text-center">
            <div className="text-base font-bold text-chalk">No testing data yet</div>
            <div className="mt-1 text-sm text-muted">Create or select a testing event and enter the athlete’s results.</div>
            <Link to={`/entry?athlete=${athlete.id}`} className="mt-4 inline-block rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink">+ Enter Testing Data</Link>
          </div>
        </Card>
      </div>
    )
  }

  const { current, previous, faiImprovement, faiImprovementPct, rankEligible } = result
  const progress = computeProgress(current, previous)
  const strong = strengths(current)
  const weak = weaknesses(current)
  const radarSeries = [
    ...(previous ? [{ label: 'Previous', color: '#64748b', values: previous.categories as Record<Category, number> }] : []),
    { label: 'Current', color: '#22d3ee', values: current.categories as Record<Category, number> },
  ]
  const linePoints = timeline.map((item) => ({
    label: item.event.name.length > 12 ? item.event.phase : item.event.name,
    value: item.fai,
  }))

  return (
    <div className="space-y-6">
      <ProfileNav athleteId={athlete.id} />

      <Card glow className="p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={96} />
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tight text-chalk">{athlete.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Pill tone="fai">{athlete.positionGroup}</Pill>
              <span>{athlete.position}</span>
              <span>· {gradeLabelFor(athlete, 'long')}</span>
              <span>· {current.session.weightLbsSnapshot ?? athlete.weightLbs} lbs at test</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone={rankEligible ? 'up' : 'gold'}>
                {rankEligible ? 'Official score' : `${current.scoreStatus} · ${current.completionPct}% complete`}
              </Pill>
              {rankEligible && <Pill tone="gold">Team Rank #{result.teamRank} / {result.teamCount}</Pill>}
              {rankEligible && <Pill>{current.session.positionGroupSnapshot ?? athlete.positionGroup} Rank #{result.groupRank} / {result.groupCount}</Pill>}
              <Pill>{current.event.name} · {current.event.startDate}</Pill>
            </div>
          </div>
          <div className="text-center">
            <FaiRing score={current.fai} size={130} label={rankEligible ? 'FAI' : 'PROV'} />
            {previous && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <DeltaBadge value={faiImprovement} trend={trendOf(faiImprovement)} size="lg" />
                <span className="text-xs text-muted">({faiImprovementPct >= 0 ? '+' : ''}{faiImprovementPct}%)</span>
              </div>
            )}
          </div>
        </div>

        {!rankEligible && (
          <div className="mt-5 rounded-xl border border-flame/30 bg-flame/5 p-4 text-sm text-muted">
            This score is visible for coaching feedback but is excluded from official rankings until all required tests are complete.
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle right={<div className="flex gap-3 text-xs">{previous && <span className="text-flat">● Previous</span>}<span className="text-fai">● Current</span></div>}>
            Category Profile
          </SectionTitle>
          <RadarChart series={radarSeries} />
          <div className="mt-3 space-y-2">
            {progress.categories.map((category) => (
              <div key={category.category} className="flex items-center gap-3">
                <div className="w-10 text-xs font-bold text-muted">{CATEGORY_SHORT[category.category]}</div>
                <div className="flex-1"><ScoreMeter value={category.current ?? 0} color={CATEGORY_COLOR[category.category]} /></div>
                <div className="w-10 text-right text-sm font-black nums text-chalk">{typeof category.current === 'number' ? category.current.toFixed(0) : '—'}</div>
                <div className="w-14 text-right">
                  {typeof category.current === 'number' && typeof category.previous === 'number'
                    ? <DeltaBadge value={category.improvement} trend={category.trend} />
                    : <span className="text-xs text-muted">—</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle>FAI Progress by Event</SectionTitle>
            {timeline.length > 1 ? <LineChart points={linePoints} /> : <div className="py-8 text-center text-sm text-muted">Add another testing event to measure progress.</div>}
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <InsightCard title="Biggest Improvement" tone="up">
              {progress.biggestImprovement ? (
                <>
                  <div className="text-sm font-bold text-chalk">{progress.biggestImprovement.label}</div>
                  <div className="mt-1 text-xs text-muted">
                    {formatMetric(progress.biggestImprovement.previousRaw, progress.biggestImprovement.unit)} →{' '}
                    <span className="font-bold text-up">{formatMetric(progress.biggestImprovement.currentRaw, progress.biggestImprovement.unit)}</span>
                  </div>
                </>
              ) : <div className="text-xs text-muted">No comparable prior result.</div>}
            </InsightCard>
            <InsightCard title="Biggest Weakness" tone="down">
              {progress.biggestWeakness ? (
                <><div className="text-sm font-bold text-chalk">{progress.biggestWeakness.category}</div><div className="mt-1 text-2xl font-black nums text-flame">{progress.biggestWeakness.current?.toFixed(0)}</div></>
              ) : <div className="text-xs text-muted">Not enough data.</div>}
            </InsightCard>
            <InsightCard title="Suggested Focus" tone="fai">
              {progress.suggestedFocus ? <><div className="text-lg font-black text-fai">{progress.suggestedFocus}</div><div className="mt-1 text-xs text-muted">Prioritize this category next block.</div></> : <div className="text-xs text-muted">—</div>}
            </InsightCard>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-up">Strengths</div>
              <div className="flex flex-wrap gap-1.5">{strong.length ? strong.map((category) => <Pill key={category} tone="up">{category} · {current.categories[category].toFixed(0)}</Pill>) : <span className="text-xs text-muted">Building baseline strengths.</span>}</div>
            </Card>
            <Card className="p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-down">Weaknesses</div>
              <div className="flex flex-wrap gap-1.5">{weak.length ? weak.map((category) => <Pill key={category} tone="down">{category} · {current.categories[category].toFixed(0)}</Pill>) : <span className="text-xs text-muted">No major weakness flagged.</span>}</div>
            </Card>
          </div>
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle>Test-by-Test · Current vs Previous Event</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted"><th className="py-2 pr-3">Test</th><th className="px-3">Cat</th><th className="px-3 text-right">Previous</th><th className="px-3 text-right">Current</th><th className="px-3 text-right">Change</th><th className="px-3 text-right">Score</th><th className="px-3 text-center">Trend</th></tr></thead>
            <tbody>
              {progress.metrics.map((metric) => (
                <tr key={metric.key} className="border-b border-line/50">
                  <td className="py-2 pr-3 font-semibold text-chalk">{metric.label}</td>
                  <td className="px-3 text-xs text-muted">{CATEGORY_SHORT[metric.category]}</td>
                  <td className="px-3 text-right nums text-muted">{formatMetric(metric.previousRaw, metric.unit)}</td>
                  <td className="px-3 text-right nums font-bold text-chalk">{formatMetric(metric.currentRaw, metric.unit)}</td>
                  <td className={`px-3 text-right nums font-bold ${metric.rawImprovement === undefined ? 'text-muted' : metric.rawImprovement > 0 ? 'text-up' : metric.rawImprovement < 0 ? 'text-down' : 'text-flat'}`}>{metric.rawImprovement === undefined ? '—' : `${metric.rawImprovement > 0 ? '+' : ''}${metric.rawImprovement}${metric.unit}`}</td>
                  <td className="px-3 text-right nums text-fai">{typeof metric.currentScore === 'number' ? metric.currentScore.toFixed(0) : '—'}</td>
                  <td className="px-3 text-center">{metric.rawImprovement === undefined ? <span className="text-xs text-muted">—</span> : <TrendArrow trend={metric.trend} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>Testing Event History</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted"><th className="py-2 pr-3">Event</th><th className="px-2">Date</th><th className="px-2">Status</th>{SCORED_METRICS.map((metric) => <th key={metric.key} className="px-2 text-right">{metric.shortLabel}</th>)}<th className="px-2 text-right">FAI</th></tr></thead>
            <tbody>
              {[...timeline].reverse().map((item) => (
                <tr key={item.event.id} className="border-b border-line/50">
                  <td className="py-2 pr-3 font-semibold text-chalk">{item.event.name}</td>
                  <td className="px-2 text-muted">{item.event.startDate}</td>
                  <td className="px-2"><span className={item.scoreStatus === 'complete' ? 'text-up' : 'text-flame'}>{item.scoreStatus} · {item.completionPct}%</span></td>
                  {SCORED_METRICS.map((metric) => <td key={metric.key} className="px-2 text-right nums text-chalk">{formatMetric(item.metrics[metric.key], metric.unit)}</td>)}
                  <td className="px-2 text-right nums font-black text-fai">{item.fai.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-center text-xs text-muted">Category weights: {CATEGORIES.map((category) => CATEGORY_SHORT[category]).join(' · ')}</div>
    </div>
  )
}

function ProfileNav({ athleteId }: { athleteId: string }) {
  return (
    <div className="flex items-center justify-between">
      <Link to="/athletes" className="text-sm font-semibold text-muted hover:text-chalk">← Athletes</Link>
      <div className="flex gap-2">
        <Link to={`/entry?athlete=${athleteId}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-chalk hover:bg-panel-2">+ Testing</Link>
        <Link to={`/athletes/${athleteId}/edit`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-chalk hover:bg-panel-2">Edit</Link>
      </div>
    </div>
  )
}

function InsightCard({ title, tone, children }: { title: string; tone: 'up' | 'down' | 'fai'; children: React.ReactNode }) {
  const border = tone === 'up' ? 'border-up/30' : tone === 'down' ? 'border-down/30' : 'border-fai/30'
  return <Card className={`p-4 ${border}`}><div className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</div><div className="mt-1.5">{children}</div></Card>
}

function formatMetric(value: number | undefined, unit: string): string {
  if (typeof value !== 'number') return '—'
  if (unit === 's' || unit === 'x') return `${value.toFixed(2)}${unit}`
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`
}
