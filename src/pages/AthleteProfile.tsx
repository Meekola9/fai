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

function trendOf(v: number) {
  return v > 0.05 ? 'improved' : v < -0.05 ? 'regressed' : ('same' as const)
}

const CAT_COLOR: Record<Category, string> = {
  Speed: '#22d3ee',
  Power: '#f97316',
  'Change of Direction': '#a78bfa',
  Conditioning: '#34d399',
  Strength: '#fbbf24',
}

export default function AthleteProfile() {
  const { id } = useParams()
  const { data, computed, resultByAthlete } = useStore()

  const result = id ? resultByAthlete.get(id) : undefined
  const timeline = useMemo(
    () => (id ? athleteTimeline(computed, id) : []),
    [computed, id],
  )
  const bio = id ? data.athletes.find((a) => a.id === id) : undefined

  // Athlete doesn't exist at all.
  if (!bio) {
    return (
      <Card className="p-10 text-center">
        <div className="text-lg font-bold">Athlete not found</div>
        <Link to="/athletes" className="mt-3 inline-block text-sm font-semibold text-fai">
          ← Back to athletes
        </Link>
      </Card>
    )
  }

  // Athlete exists but has no testing data yet — show bio + prompt to add a session.
  if (!result || !timeline.length) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <Link to="/athletes" className="text-sm font-semibold text-muted hover:text-chalk">
            ← Athletes
          </Link>
          <Link to={`/athletes/${bio.id}/edit`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-chalk hover:bg-panel-2">
            Edit
          </Link>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={bio.name} photoUrl={bio.photoUrl} size={80} />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-chalk">{bio.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                <Pill tone="fai">{bio.positionGroup}</Pill>
                <span className="font-semibold text-chalk">{bio.position}</span>
                <span>· Grade {bio.grade}</span>
                <span>· {formatHeight(bio.heightIn)}</span>
                <span>· {bio.weightLbs} lbs</span>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-line bg-panel-2/30 p-6 text-center">
            <div className="text-base font-bold text-chalk">No testing data yet</div>
            <div className="mt-1 text-sm text-muted">
              Log a testing session to generate {bio.name.split(' ')[0]}'s FAI score, rankings, and
              progress.
            </div>
            <Link
              to={`/entry?athlete=${bio.id}`}
              className="mt-4 inline-block rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink hover:bg-fai/90"
            >
              + Enter Testing Data
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const { athlete, current, previous, faiImprovement, faiImprovementPct } = result
  const progress = computeProgress(current, previous)
  const strong = strengths(current)
  const weak = weaknesses(current)

  const radarSeries = [
    ...(previous
      ? [{ label: 'Previous', color: '#64748b', values: previous.categories as Record<Category, number> }]
      : []),
    { label: 'Current', color: '#22d3ee', values: current.categories as Record<Category, number> },
  ]

  const linePoints = timeline.map((c) => ({
    label: `${c.session.phase.slice(0, 4)}`,
    value: c.fai,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/athletes" className="text-sm font-semibold text-muted hover:text-chalk">
          ← Athletes
        </Link>
        <div className="flex gap-2">
          <Link to={`/entry?athlete=${athlete.id}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-chalk hover:bg-panel-2">
            + Testing
          </Link>
          <Link to={`/athletes/${athlete.id}/edit`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold text-chalk hover:bg-panel-2">
            Edit
          </Link>
        </div>
      </div>

      {/* Header card */}
      <Card glow className="p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={athlete.name} photoUrl={athlete.photoUrl} size={96} />
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tight text-chalk">{athlete.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Pill tone="fai">{athlete.positionGroup}</Pill>
              <span className="font-semibold text-chalk">{athlete.position}</span>
              <span>· Grade {athlete.grade}</span>
              <span>· {formatHeight(athlete.heightIn)}</span>
              <span>· {athlete.weightLbs} lbs</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone="gold">Team Rank #{result.teamRank} / {result.teamCount}</Pill>
              <Pill>{athlete.positionGroup} Rank #{result.groupRank} / {result.groupCount}</Pill>
              <Pill>{current.session.phase} · {current.session.date}</Pill>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <FaiRing score={current.fai} size={130} />
              {previous && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <DeltaBadge value={faiImprovement} trend={trendOf(faiImprovement)} size="lg" />
                  <span className="text-xs text-muted">
                    ({faiImprovementPct >= 0 ? '+' : ''}
                    {faiImprovementPct}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {previous && (
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">Previous FAI</div>
              <div className="text-2xl font-black nums text-muted">{previous.fai.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">Current FAI</div>
              <div className="text-2xl font-black nums text-fai">{current.fai.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">Improvement</div>
              <div className={`text-2xl font-black nums ${faiImprovement >= 0 ? 'text-up' : 'text-down'}`}>
                {faiImprovement >= 0 ? '+' : ''}
                {faiImprovement.toFixed(1)}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar */}
        <Card className="p-5">
          <SectionTitle
            right={
              <div className="flex gap-3 text-xs">
                {previous && (
                  <span className="flex items-center gap-1 text-flat">
                    <span className="inline-block h-2 w-2 rounded-full bg-flat" /> Previous
                  </span>
                )}
                <span className="flex items-center gap-1 text-fai">
                  <span className="inline-block h-2 w-2 rounded-full bg-fai" /> Current
                </span>
              </div>
            }
          >
            Category Profile
          </SectionTitle>
          <RadarChart series={radarSeries} />
          <div className="mt-3 space-y-2">
            {progress.categories.map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <div className="w-10 text-xs font-bold text-muted">{CATEGORY_SHORT[c.category]}</div>
                <div className="flex-1">
                  <ScoreMeter value={c.current ?? 0} color={CAT_COLOR[c.category]} />
                </div>
                <div className="w-10 text-right text-sm font-black nums text-chalk">
                  {(c.current ?? 0).toFixed(0)}
                </div>
                <div className="w-14 text-right">
                  {typeof c.current === 'number' && typeof c.previous === 'number' ? (
                    <DeltaBadge value={c.improvement} trend={c.trend} />
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Progress over time + insights */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle>FAI Progress Over Time</SectionTitle>
            {timeline.length > 1 ? (
              <LineChart points={linePoints} />
            ) : (
              <div className="py-8 text-center text-sm text-muted">
                Only one testing session logged. Add another to see progress.
              </div>
            )}
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <InsightCard title="Biggest Improvement" tone="up">
              {progress.biggestImprovement ? (
                <>
                  <div className="text-sm font-bold text-chalk">
                    {progress.biggestImprovement.label}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {progress.biggestImprovement.previousRaw}
                    {progress.biggestImprovement.unit} →{' '}
                    <span className="font-bold text-up">
                      {progress.biggestImprovement.currentRaw}
                      {progress.biggestImprovement.unit}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-up">
                    +{progress.biggestImprovement.scoreImprovement} score
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted">No prior test to compare.</div>
              )}
            </InsightCard>

            <InsightCard title="Biggest Weakness" tone="down">
              {progress.biggestWeakness ? (
                <>
                  <div className="text-sm font-bold text-chalk">
                    {progress.biggestWeakness.category}
                  </div>
                  <div className="mt-1 text-2xl font-black nums text-flame">
                    {(progress.biggestWeakness.current ?? 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-muted">lowest category score</div>
                </>
              ) : (
                <div className="text-xs text-muted">—</div>
              )}
            </InsightCard>

            <InsightCard title="Suggested Focus" tone="fai">
              {progress.suggestedFocus ? (
                <>
                  <div className="text-lg font-black text-fai">{progress.suggestedFocus}</div>
                  <div className="mt-1 text-xs text-muted">
                    Prioritize {progress.suggestedFocus.toLowerCase()} work this block.
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted">—</div>
              )}
            </InsightCard>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-up">Strengths</div>
              {strong.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {strong.map((c) => (
                    <Pill key={c} tone="up">
                      {c} · {current.categories[c].toFixed(0)}
                    </Pill>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted">Building baseline strengths.</div>
              )}
            </Card>
            <Card className="p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-down">Weaknesses</div>
              {weak.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {weak.map((c) => (
                    <Pill key={c} tone="down">
                      {c} · {current.categories[c].toFixed(0)}
                    </Pill>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted">No major weaknesses flagged.</div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Test-by-test improvement table */}
      <Card className="p-5">
        <SectionTitle>Test-by-Test · Latest vs Previous</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-3">Test</th>
                <th className="px-3">Cat</th>
                <th className="px-3 text-right">Previous</th>
                <th className="px-3 text-right">Current</th>
                <th className="px-3 text-right">Change</th>
                <th className="px-3 text-right">Score</th>
                <th className="px-3 text-center">Result</th>
              </tr>
            </thead>
            <tbody>
              {progress.metrics.map((m) => {
                const has = typeof m.currentRaw === 'number'
                return (
                  <tr key={m.key} className="border-b border-line/50">
                    <td className="py-2 pr-3 font-semibold text-chalk">{m.label}</td>
                    <td className="px-3 text-xs text-muted">{CATEGORY_SHORT[m.category]}</td>
                    <td className="px-3 text-right nums text-muted">
                      {typeof m.previousRaw === 'number' ? `${m.previousRaw}${m.unit}` : '—'}
                    </td>
                    <td className="px-3 text-right nums font-bold text-chalk">
                      {has ? `${m.currentRaw}${m.unit}` : '—'}
                    </td>
                    <td className={`px-3 text-right nums font-bold ${
                      m.rawImprovement === undefined
                        ? 'text-muted'
                        : m.rawImprovement > 0
                          ? 'text-up'
                          : m.rawImprovement < 0
                            ? 'text-down'
                            : 'text-flat'
                    }`}>
                      {m.rawImprovement === undefined
                        ? '—'
                        : `${m.rawImprovement > 0 ? '+' : ''}${m.rawImprovement}${m.unit}`}
                    </td>
                    <td className="px-3 text-right nums text-fai">
                      {typeof m.currentScore === 'number' ? m.currentScore.toFixed(0) : '—'}
                    </td>
                    <td className="px-3 text-center">
                      {m.rawImprovement === undefined ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <TrendArrow trend={m.trend} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Full test history */}
      <Card className="p-5">
        <SectionTitle>Test History · All Sessions</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="py-2 pr-3">Date</th>
                <th className="px-2">Phase</th>
                {SCORED_METRICS.map((m) => (
                  <th key={m.key} className="px-2 text-right">
                    {m.shortLabel}
                  </th>
                ))}
                <th className="px-2 text-right">FAI</th>
              </tr>
            </thead>
            <tbody>
              {[...timeline].reverse().map((c) => (
                <tr key={c.session.id} className="border-b border-line/50">
                  <td className="py-2 pr-3 font-semibold text-chalk">{c.session.date}</td>
                  <td className="px-2 text-muted">{c.session.phase}</td>
                  {SCORED_METRICS.map((m) => (
                    <td key={m.key} className="px-2 text-right nums text-chalk">
                      {typeof c.metrics[m.key] === 'number' ? c.metrics[m.key] : '—'}
                    </td>
                  ))}
                  <td className="px-2 text-right nums font-black text-fai">{c.fai.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-center text-xs text-muted">
        Category weights: {CATEGORIES.map((c) => CATEGORY_SHORT[c]).join(' · ')} — edit in{' '}
        <code className="text-fai">src/data/scoring.ts</code>
      </div>
    </div>
  )
}

function InsightCard({
  title,
  tone,
  children,
}: {
  title: string
  tone: 'up' | 'down' | 'fai'
  children: React.ReactNode
}) {
  const border =
    tone === 'up' ? 'border-up/30' : tone === 'down' ? 'border-down/30' : 'border-fai/30'
  return (
    <Card className={`p-4 ${border}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</div>
      <div className="mt-1.5">{children}</div>
    </Card>
  )
}
