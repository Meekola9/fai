import { Link } from 'react-router-dom'
import type { EarnedPlayerBadge, PlayerBadgeDefinition, BadgeTier } from '../lib/badges'

const TIER_STYLE: Record<BadgeTier, {
  frame: string
  label: string
  glow: string
}> = {
  bronze: {
    frame: 'border-flame/50 bg-gradient-to-br from-flame/25 to-panel text-flame',
    label: 'text-flame',
    glow: 'shadow-[0_0_22px_-10px_rgba(249,115,22,0.75)]',
  },
  silver: {
    frame: 'border-slate-400/50 bg-gradient-to-br from-slate-300/20 to-panel text-slate-200',
    label: 'text-slate-200',
    glow: 'shadow-[0_0_22px_-10px_rgba(203,213,225,0.65)]',
  },
  gold: {
    frame: 'border-gold/60 bg-gradient-to-br from-gold/25 to-panel text-gold',
    label: 'text-gold',
    glow: 'shadow-[0_0_24px_-10px_rgba(251,191,36,0.8)]',
  },
  elite: {
    frame: 'border-fai/60 bg-gradient-to-br from-fai/25 to-panel text-fai',
    label: 'text-fai',
    glow: 'shadow-[0_0_25px_-10px_rgba(34,211,238,0.85)]',
  },
  legend: {
    frame: 'border-violet-400/60 bg-gradient-to-br from-violet-500/25 to-panel text-violet-300',
    label: 'text-violet-300',
    glow: 'shadow-[0_0_28px_-10px_rgba(167,139,250,0.9)]',
  },
}

const TIER_NAME: Record<BadgeTier, string> = {
  bronze: 'Foundation',
  silver: 'Silver',
  gold: 'Gold',
  elite: 'Elite',
  legend: 'Legend',
}

export function BadgeMedallion({
  badge,
  size = 'md',
}: {
  badge: PlayerBadgeDefinition
  size?: 'sm' | 'md' | 'lg'
}) {
  const dimensions = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12'
  const iconSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl'
  const style = TIER_STYLE[badge.tier]

  return (
    <div className={`relative grid shrink-0 place-items-center ${dimensions}`} aria-hidden="true">
      <div className={`absolute inset-[6%] rotate-45 rounded-[28%] border ${style.frame} ${style.glow}`} />
      <div className="absolute inset-[20%] rotate-45 rounded-[24%] border border-white/10 bg-ink/35" />
      <span className={`relative z-10 drop-shadow ${iconSize}`}>{badge.icon}</span>
    </div>
  )
}

export function PlayerBadgeStrip({
  badges,
  limit = 3,
}: {
  badges: EarnedPlayerBadge[]
  limit?: number
}) {
  const shown = badges.slice(0, limit)
  if (!shown.length) return null

  return (
    <div className="mt-3 flex items-center gap-1.5" aria-label={`${badges.length} earned player badges`}>
      {shown.map((badge) => (
        <Link
          key={badge.id}
          to={`/badges#${badge.id}`}
          className="group relative rounded-lg focus:outline-none focus:ring-2 focus:ring-fai/50"
          title={`${badge.name}: ${badge.evidence}`}
          aria-label={`${badge.name}. ${badge.evidence}`}
        >
          <BadgeMedallion badge={badge} size="sm" />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-48 -translate-x-1/2 rounded-lg border border-line bg-ink px-2.5 py-2 text-left shadow-xl group-hover:block group-focus:block">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${TIER_STYLE[badge.tier].label}`}>
              {TIER_NAME[badge.tier]}
            </div>
            <div className="mt-0.5 text-xs font-black text-chalk">{badge.name}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-muted">{badge.evidence}</div>
          </div>
        </Link>
      ))}
      {badges.length > shown.length && (
        <Link
          to="/badges"
          className="grid h-8 min-w-8 place-items-center rounded-full border border-line bg-panel-2 px-2 text-[10px] font-black text-muted hover:border-fai/40 hover:text-fai"
          aria-label={`View ${badges.length - shown.length} more badges`}
        >
          +{badges.length - shown.length}
        </Link>
      )}
    </div>
  )
}

export function PlayerBadgeGallery({ badges }: { badges: EarnedPlayerBadge[] }) {
  if (!badges.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-panel-2/30 p-5 text-center text-sm text-muted">
        No verified badges yet. Complete more testing or improve current marks to unlock achievements.
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge) => (
        <Link
          key={badge.id}
          to={`/badges#${badge.id}`}
          className="group flex items-center gap-3 rounded-xl border border-line bg-panel-2/35 p-3 transition hover:border-fai/35 hover:bg-panel-2/60"
        >
          <BadgeMedallion badge={badge} />
          <div className="min-w-0 flex-1">
            <div className={`text-[9px] font-bold uppercase tracking-[0.16em] ${TIER_STYLE[badge.tier].label}`}>
              {TIER_NAME[badge.tier]} badge
            </div>
            <div className="mt-0.5 truncate text-sm font-black text-chalk group-hover:text-fai">{badge.name}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-muted">{badge.evidence}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function badgeTierName(tier: BadgeTier): string {
  return TIER_NAME[tier]
}

// eslint-disable-next-line react-refresh/only-export-components
export function badgeTierLabelClass(tier: BadgeTier): string {
  return TIER_STYLE[tier].label
}
