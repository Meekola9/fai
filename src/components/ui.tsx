import type { ReactNode } from 'react'
import type { Trend } from '../lib/progress'

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
      className={`rounded-xl border border-line/90 bg-panel ${
        glow ? 'shadow-[inset_3px_0_0_rgba(200,242,74,0.92),0_14px_40px_rgba(0,0,0,0.18)]' : ''
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
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-line/80 pb-2.5">
      <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-chalk">
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
    fai: 'bg-fai/8 text-fai border-fai/35',
    gold: 'bg-gold/8 text-gold border-gold/35',
    up: 'bg-up/8 text-up border-up/35',
    down: 'bg-down/8 text-down border-down/35',
  }
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

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
  const glyph = trend === 'improved' ? '↑' : trend === 'regressed' ? '↓' : '—'
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
  const text = size === 'lg' ? 'text-xl' : 'text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1 font-extrabold nums ${trendColor(trend)} ${text}`}
    >
      <TrendArrow trend={trend} className={size === 'lg' ? 'text-base' : 'text-xs'} />
      {sign}
      {value.toFixed(1)}
      {suffix}
    </span>
  )
}

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
    <Card className="relative overflow-hidden p-4">
      <div className="absolute inset-y-0 left-0 w-[3px] bg-line" aria-hidden="true" />
      <div className="text-[11px] font-bold text-muted">
        {label}
      </div>
      <div className={`mt-2 text-[2rem] font-black leading-none nums ${accents[accent]}`}>
        {value}
      </div>
      {sub && <div className="mt-2 text-xs leading-relaxed text-muted">{sub}</div>}
    </Card>
  )
}

export function FaiRing({
  score,
  size = 120,
  label = 'FAI',
}: {
  score: number
  size?: number
  label?: string
}) {
  const stroke = Math.max(7, size * 0.07)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color = score >= 75 ? '#c8f24a' : score >= 50 ? '#d7b85f' : '#ee8b4a'
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#30332d" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black nums leading-none text-chalk">
          {score.toFixed(1)}
        </div>
        <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
          {label}
        </div>
      </div>
    </div>
  )
}

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
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-lg border border-line object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="grid place-items-center rounded-lg border border-line bg-panel-2 font-black text-chalk"
      style={{ width: size, height: size, fontSize: size * 0.31 }}
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
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border text-sm font-black nums ${
        gold
          ? 'border-gold/45 bg-gold/8 text-gold'
          : podium
            ? 'border-fai/35 bg-fai/8 text-fai'
            : 'border-line bg-panel-2 text-muted'
      }`}
    >
      {rank}
    </div>
  )
}
