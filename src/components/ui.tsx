import type { ReactNode } from 'react'
import type { Trend } from '../lib/progress'

// --- Cards & layout ------------------------------------------------------

export function Card({
  children,
  className = '',
  glow = false,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-panel/80 backdrop-blur ${
        glow ? 'shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)]' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-muted">
        {children}
      </h2>
      {right}
    </div>
  )
}

export function Pill({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'fai' | 'gold' | 'up' | 'down'
}) {
  const tones: Record<string, string> = {
    default: 'bg-panel-2 text-muted border-line',
    fai: 'bg-fai/10 text-fai border-fai/30',
    gold: 'bg-gold/10 text-gold border-gold/30',
    up: 'bg-up/10 text-up border-up/30',
    down: 'bg-down/10 text-down border-down/30',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

// --- Trend arrows --------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function trendColor(trend: Trend): string {
  return trend === 'improved'
    ? 'text-up'
    : trend === 'regressed'
      ? 'text-down'
      : 'text-flat'
}

export function TrendArrow({
  trend,
  className = '',
}: {
  trend: Trend
  className?: string
}) {
  const glyph = trend === 'improved' ? '▲' : trend === 'regressed' ? '▼' : '—'
  return <span className={`${trendColor(trend)} ${className}`}>{glyph}</span>
}

export function DeltaBadge({
  value,
  trend,
  suffix = '',
  size = 'sm',
}: {
  value: number
  trend: Trend
  suffix?: string
  size?: 'sm' | 'lg'
}) {
  const sign = value > 0 ? '+' : ''
  const text = size === 'lg' ? 'text-2xl' : 'text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold nums ${trendColor(trend)} ${text}`}
    >
      <TrendArrow trend={trend} className={size === 'lg' ? 'text-lg' : 'text-xs'} />
      {sign}
      {value.toFixed(1)}
      {suffix}
    </span>
  )
}

// --- Stat tile -----------------------------------------------------------

export function StatTile({
  label,
  value,
  sub,
  accent = 'chalk',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: 'chalk' | 'fai' | 'gold' | 'flame' | 'up'
}) {
  const accents: Record<string, string> = {
    chalk: 'text-chalk',
    fai: 'text-fai',
    gold: 'text-gold',
    flame: 'text-flame',
    up: 'text-up',
  }
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`mt-1 text-3xl font-black nums ${accents[accent]}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  )
}

// --- FAI score ring ------------------------------------------------------

export function FaiRing({
  score,
  size = 120,
  label = 'FAI',
}: {
  score: number
  size?: number
  label?: string
}) {
  const stroke = size * 0.09
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color =
    score >= 75 ? '#c6f24e' : score >= 50 ? '#fbbf24' : '#ff7a1a'
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#242b33" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black nums leading-none" style={{ color }}>
          {score.toFixed(1)}
        </div>
        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
          {label}
        </div>
      </div>
    </div>
  )
}

// --- Athlete avatar placeholder -----------------------------------------

export function Avatar({
  name,
  photoUrl,
  size = 48,
}: {
  name: string
  photoUrl?: string
  size?: number
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="grid place-items-center rounded-xl bg-gradient-to-br from-fai/25 to-flame/20 font-black text-chalk"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  )
}

export function RankBadge({ rank }: { rank: number }) {
  const gold = rank === 1
  const podium = rank <= 3
  return (
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-black nums ${
        gold
          ? 'bg-gold/20 text-gold'
          : podium
            ? 'bg-fai/15 text-fai'
            : 'bg-panel-2 text-muted'
      }`}
    >
      {rank}
    </div>
  )
}
