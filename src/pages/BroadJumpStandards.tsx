import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Avatar, Card, Pill, SectionTitle } from '../components/ui'
import {
  HISTORICAL_MALE_BROAD_JUMP_BANDS,
  broadJumpBandFor,
  broadJumpBandsFor,
  broadJumpFamilyFor,
  formatBroadJump,
  historicalMaleBroadJumpBandFor,
  type BroadJumpBandId,
} from '../lib/broadJumpBenchmarks'
import type { PositionGroup } from '../types'

const CURRENT_SEASON_ID = 'season-2026'

const BAND_TONE: Record<BroadJumpBandId, 'gold' | 'fai' | 'up' | 'default' | 'down'> = {
  elite: 'gold',
  excellent: 'fai',
  good: 'up',
  average: 'default',
  developing: 'down',
}

export default function BroadJumpStandards() {
  const { resultsForEvent, gradeLabelFor } = useStore()
  const [group, setGroup] = useState<'all' | PositionGroup>('all')

  const rows = useMemo(() => resultsForEvent(CURRENT_SEASON_ID)
    .filter((result) => typeof result.current.metrics.broadJump === 'number')
    .filter((result) => group === 'all' || result.athlete.positionGroup === group)
    .map((result) => {
      const inches = result.current.metrics.broadJump as number
      return {
        result,
        inches,
        footballBand: broadJumpBandFor(inches, result.athlete.positionGroup),
        historicalBand: historicalMaleBroadJumpBandFor(inches),
      }
    })
    .sort((a, b) => b.inches - a.inches || a.result.athlete.name.localeCompare(b.result.athlete.name)),
  [group, resultsForEvent])

  const groups = useMemo(
    () => [...new Set(resultsForEvent(CURRENT_SEASON_ID).map((result) => result.athlete.positionGroup))].sort(),
    [resultsForEvent],
  )

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-fai">Two separate comparisons</div>
            <h2 className="mt-1 text-xl font-black text-chalk">Broad Jump Standards</h2>
            <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted">
              The FAI Football Tier is the primary position-family coaching standard. The General Percentile is a separate historical male standing-long-jump reference transcribed from the 1996 Donald A. Chu chart you supplied; it does not change FAI scoring.
            </p>
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
        <FootballStandardCard title="Skill" groups="QB · RB · WR · DB · ATH · K/P" positionGroup="WR" />
        <FootballStandardCard title="Hybrid" groups="LB · TE" positionGroup="LB" />
        <FootballStandardCard title="Line" groups="OL · DL" positionGroup="OL" />
      </div>

      <Card className="overflow-hidden p-5">
        <SectionTitle right={<Pill tone="gold">Historical reference</Pill>}>General Male Percentile Chart · 1996</SectionTitle>
        <p className="mb-4 text-xs leading-relaxed text-muted">
          Standing long jump ranges shown in meters and converted to football feet-and-inches. Use this as general context only; the source image does not identify a football-only sample.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-left text-xs">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                <th className="px-3 py-2">Percentile</th>
                <th className="px-3 py-2">Meters</th>
                <th className="px-3 py-2">Feet / inches</th>
                <th className="px-3 py-2">Use in FAI</th>
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_MALE_BROAD_JUMP_BANDS.map((band) => (
                <tr key={band.percentile} className="bg-panel-2/35 text-chalk">
                  <td className="rounded-l-lg px-3 py-2 font-black nums">{band.percentile}</td>
                  <td className="px-3 py-2 nums text-muted">{band.lowMeters.toFixed(2)}–{band.highMeters.toFixed(2)} m</td>
                  <td className="px-3 py-2 font-black nums text-fai">{formatBroadJump(band.minInches)}–{formatBroadJump(band.maxInches)}</td>
                  <td className="rounded-r-lg px-3 py-2 text-muted">Context only</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle right={<Pill tone="fai">{rows.length} tested</Pill>}>2026 Athlete Broad Jump Comparison</SectionTitle>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No 2026 broad-jump results match this filter.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ result, inches, footballBand, historicalBand }, index) => (
              <Link key={result.athlete.id} to={`/athletes/${result.athlete.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-panel-2/35 p-3 transition hover:border-fai/40">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-black/35 text-sm font-black nums text-muted">{index + 1}</div>
                <Avatar name={result.athlete.name} photoUrl={result.athlete.photoUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-chalk">{result.athlete.name}</div>
                  <div className="text-[11px] text-muted">{result.athlete.positionGroup} · {gradeLabelFor(result.athlete)} · {broadJumpFamilyFor(result.athlete.positionGroup)}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Pill tone={BAND_TONE[footballBand.id]}>{footballBand.label}</Pill>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">General {historicalBand ? `${historicalBand.percentile}th` : 'below chart'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black nums text-fai">{formatBroadJump(inches)}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Broad</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function FootballStandardCard({
  title,
  groups,
  positionGroup,
}: {
  title: string
  groups: string
  positionGroup: PositionGroup
}) {
  const bands = broadJumpBandsFor(positionGroup)
  return (
    <Card className="p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fai">{title} football standard</div>
      <div className="mt-1 text-xs text-muted">{groups}</div>
      <div className="mt-4 space-y-2">
        {bands.map((band, index) => {
          const higher = index > 0 ? bands[index - 1] : undefined
          const range = band.id === 'elite'
            ? `${formatBroadJump(band.minInches)}+`
            : band.id === 'developing'
              ? `Under ${formatBroadJump(bands[index - 1].minInches)}`
              : `${formatBroadJump(band.minInches)}–${formatBroadJump(higher!.minInches - 0.1)}`
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
      <div className="mt-3 text-[10px] leading-relaxed text-muted">FAI coaching standard; not a statistical census or recruiting guarantee.</div>
    </Card>
  )
}
