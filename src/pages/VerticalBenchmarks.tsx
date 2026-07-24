import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card, Pill, SectionTitle } from '../components/ui'
import {
  VERTICAL_BENCHMARK_PROFILES,
  verticalBandFor,
  verticalBandsFor,
  verticalFamilyFor,
  type VerticalBenchmarkMode,
} from '../lib/verticalBenchmarks'
import type { PositionGroup } from '../types'

const STORAGE_KEY = 'fai:vertical-benchmark-mode'
const CURRENT_SEASON_ID = 'season-2026'

const BAND_TONE = {
  elite: 'gold',
  excellent: 'fai',
  good: 'up',
  average: 'default',
  developing: 'down',
} as const

function loadMode(): VerticalBenchmarkMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored in VERTICAL_BENCHMARK_PROFILES) return stored as VerticalBenchmarkMode
  } catch {
    // Storage is optional; default remains National High School.
  }
  return 'national-hs'
}

export default function VerticalBenchmarks({ embedded = false }: { embedded?: boolean }) {
  const { resultsForEvent, gradeLabelFor } = useStore()
  const [mode, setMode] = useState<VerticalBenchmarkMode>(loadMode)
  const [group, setGroup] = useState<'all' | PositionGroup>('all')
  const profile = VERTICAL_BENCHMARK_PROFILES[mode]

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* optional preference */ }
  }, [mode])

  const rows = useMemo(() => resultsForEvent(CURRENT_SEASON_ID)
    .filter((result) => typeof result.current.metrics.verticalJump === 'number')
    .filter((result) => group === 'all' || result.athlete.positionGroup === group)
    .map((result) => {
      const inches = result.current.metrics.verticalJump as number
      return {
        result,
        inches,
        band: verticalBandFor(inches, result.athlete.positionGroup, mode),
      }
    })
    .sort((a, b) => b.inches - a.inches || a.result.athlete.name.localeCompare(b.result.athlete.name)),
  [group, mode, resultsForEvent])

  const groups = useMemo(() => [...new Set(resultsForEvent(CURRENT_SEASON_ID).map((result) => result.athlete.positionGroup))].sort(), [resultsForEvent])

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-fai">Explosive Power Standards</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-chalk">Vertical Jump Benchmarks</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              Compare 2026 vertical jumps by football position family. National High School is the fixed FAI scoring standard; Georgia and NCAA modes change comparison context only.
            </p>
          </div>
          <Link to="/stats" className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted hover:text-fai">Stats Guide →</Link>
        </div>
      )}

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">Comparison mode</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(VERTICAL_BENCHMARK_PROFILES) as VerticalBenchmarkMode[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`rounded-xl border px-3 py-2 text-xs font-black transition ${mode === key ? 'border-fai bg-fai text-ink' : 'border-line bg-panel-2 text-muted hover:text-chalk'}`}
                >
                  {VERTICAL_BENCHMARK_PROFILES[key].shortLabel}
                </button>
              ))}
            </div>
            <p className="mt-3 max-w-4xl text-xs leading-relaxed text-muted">{profile.note}</p>
          </div>
          <label>
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-muted">Position group</span>
            <select value={group} onChange={(event) => setGroup(event.target.value as typeof group)} className="rounded-xl border border-line bg-ink px-3 py-2 text-sm font-bold text-chalk outline-none focus:border-fai">
              <option value="all">All groups</option>
              {groups.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <StandardCard title="Skill" groups="QB · RB · WR · DB · ATH · K/P" positionGroup="WR" mode={mode} />
        <StandardCard title="Hybrid" groups="LB · TE" positionGroup="LB" mode={mode} />
        <StandardCard title="Line" groups="OL · DL" positionGroup="OL" mode={mode} />
      </div>

      <Card className="p-5">
        <SectionTitle right={<Pill tone="fai">{rows.length} tested</Pill>}>2026 Athlete Comparison · {profile.label}</SectionTitle>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No 2026 vertical-jump results match this filter.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ result, inches, band }, index) => (
              <Link key={result.athlete.id} to={`/athletes/${result.athlete.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-panel-2/35 p-3 transition hover:border-fai/40">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-black/35 text-sm font-black nums text-muted">{index + 1}</div>
                <Avatar name={result.athlete.name} photoUrl={result.athlete.photoUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-chalk">{result.athlete.name}</div>
                  <div className="text-[11px] text-muted">{result.athlete.positionGroup} · {gradeLabelFor(result.athlete)} · {verticalFamilyFor(result.athlete.positionGroup)}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Pill tone={BAND_TONE[band.id]}>{band.label}</Pill>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{band.percentileLabel}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black nums text-fai">{inches.toFixed(1)}″</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Vertical</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StandardCard({
  title,
  groups,
  positionGroup,
  mode,
}: {
  title: string
  groups: string
  positionGroup: PositionGroup
  mode: VerticalBenchmarkMode
}) {
  const bands = verticalBandsFor(positionGroup, mode)
  return (
    <Card className="p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fai">{title} standard</div>
      <div className="mt-1 text-xs text-muted">{groups}</div>
      <div className="mt-4 space-y-2">
        {bands.map((band, index) => {
          const higher = index > 0 ? bands[index - 1] : undefined
          const range = band.id === 'elite'
            ? `${band.min}+ inches`
            : band.id === 'developing'
              ? `Under ${bands[index - 1].min} inches`
              : `${band.min}–${(higher!.min - 0.1).toFixed(1)} inches`
          return (
            <div key={band.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2/35 px-3 py-2">
              <div>
                <div className="text-xs font-black text-chalk">{band.label}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted">{band.percentileLabel}</div>
              </div>
              <div className="text-right text-xs font-black nums text-fai">{range}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
