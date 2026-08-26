import type { FaiTrend } from '../lib/faiTrend'

const UP = '#22c55e'
const DOWN = '#fb7185'
const FLAT = '#c8f24a'

/**
 * Game-to-game sparkline of a player's boosted FAI overall. The dashed line is
 * their tested base; the trend shows how impact + efficiency move it as games
 * accrue. Colored green when climbing, red when slipping.
 */
export default function FaiTrendMeter({ trend }: { trend: FaiTrend }) {
  if (trend.points.length === 0) return null

  const W = 300
  const H = 72
  const padY = 12
  const padX = 6
  const values = [trend.baseFai, ...trend.points.map((point) => point.fai)]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const count = trend.points.length

  const x = (index: number) => (count === 1 ? W / 2 : padX + (index / (count - 1)) * (W - padX * 2))
  const y = (value: number) => padY + (1 - (value - min) / span) * (H - padY * 2)

  const linePoints = trend.points.map((point, index) => `${x(index)},${y(point.fai)}`).join(' ')
  const areaPoints = `${x(0)},${H - padY} ${linePoints} ${x(count - 1)},${H - padY}`
  const baseY = y(trend.baseFai)

  const color = trend.delta > 0 ? UP : trend.delta < 0 ? DOWN : FLAT
  const deltaTone = trend.delta > 0 ? 'text-up' : trend.delta < 0 ? 'text-down' : 'text-muted'
  const deltaLabel = `${trend.delta > 0 ? '+' : ''}${trend.delta.toFixed(1)}`
  const first = trend.points[0]
  const last = trend.points[count - 1]

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Season Progress</div>
          <div className="text-[11px] text-muted">FAI overall, game to game</div>
        </div>
        <div className="text-right">
          <div className="nums text-2xl font-black leading-none text-chalk">{trend.latest.toFixed(1)}</div>
          <div className={`nums text-[11px] font-black ${deltaTone}`}>
            {deltaLabel} vs base {trend.baseFai.toFixed(1)}
          </div>
        </div>
      </div>

      <svg className="mt-3 w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`FAI overall from ${first.gameLabel} to ${last.gameLabel}: ${trend.baseFai.toFixed(1)} base to ${trend.latest.toFixed(1)}`}>
        <defs>
          <linearGradient id="faiTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Tested-base reference line */}
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#8a9282" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

        {count > 1 && <polygon points={areaPoints} fill="url(#faiTrendFill)" />}
        {count > 1 && (
          <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {trend.points.map((point, index) => (
          <circle
            key={point.date + point.gameLabel}
            cx={x(index)}
            cy={y(point.fai)}
            r={index === count - 1 ? 4 : 2.6}
            fill={index === count - 1 ? color : '#0b0f14'}
            stroke={color}
            strokeWidth="1.5"
          >
            <title>{`${point.gameLabel}: ${point.fai.toFixed(1)}`}</title>
          </circle>
        ))}
      </svg>

      <div className="mt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-muted">
        <span className="truncate">{first.gameLabel}</span>
        <span className="text-muted/70">dashed = tested base</span>
        <span className="truncate">{last.gameLabel}</span>
      </div>
    </div>
  )
}
