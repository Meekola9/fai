import { Link } from 'react-router-dom'
import { BadgeArtwork } from './BadgeArtwork'
import type { EarnedPlayerBadge, PlayerBadgeDefinition, BadgeTier } from '../lib/badges'

const TIER_STYLE: Record<BadgeTier, {
  label: string
  ring: string
  card: string
}> = {
  bronze: {
    label: 'text-orange-300',
    ring: 'drop-shadow-[0_0_7px_rgba(251,146,60,0.34)] group-hover:drop-shadow-[0_0_13px_rgba(251,146,60,0.68)]',
    card: 'border-orange-400/20 bg-orange-400/[0.035] hover:border-orange-300/45',
  },
  silver: {
    label: 'text-slate-200',
    ring: 'drop-shadow-[0_0_7px_rgba(226,232,240,0.28)] group-hover:drop-shadow-[0_0_13px_rgba(226,232,240,0.58)]',
    card: 'border-slate-300/20 bg-slate-300/[0.035] hover:border-slate-200/45',
  },
  gold: {
    label: 'text-gold',
    ring: 'drop-shadow-[0_0_8px_rgba(252,211,77,0.34)] group-hover:drop-shadow-[0_0_15px_rgba(252,211,77,0.7)]',
    card: 'border-gold/25 bg-gold/[0.04] hover:border-gold/55',
  },
  elite: {
    label: 'text-fai',
    ring: 'drop-shadow-[0_0_8px_rgba(103,232,249,0.34)] group-hover:drop-shadow-[0_0_16px_rgba(103,232,249,0.72)]',
    card: 'border-fai/25 bg-fai/[0.04] hover:border-fai/55',
  },
  legend: {
    label: 'text-violet-300',
    ring: 'drop-shadow-[0_0_9px_rgba(196,181,253,0.38)] group-hover:drop-shadow-[0_0_17px_rgba(196,181,253,0.75)]',
    card: 'border-violet-300/25 bg-violet-300/[0.04] hover:border-violet-300/55',
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
  const pixels = size === 'sm' ? 46 : size === 'lg' ? 92 : 68
  const style = TIER_STYLE[badge.tier]

  return (
    <div
      className={`relative grid shrink-0 place-items-center transition duration-200 group-hover:-translate-y-1 group-hover:scale-[1.045] ${style.ring}`}
      style={{ width: pixels, height: pixels }}
      aria-hidden="true"
    >
      <BadgeArtwork badge={badge} size={pixels} />
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
          <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-52 -translate-x-1/2 rounded-lg border border-line bg-ink px-3 py-2.5 text-left shadow-xl group-hover:block group-focus:block">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${TIER_STYLE[badge.tier].label}`}>
              {badge.group === 'signature' ? 'Archetype' : TIER_NAME[badge.tier]}
            </div>
            <div className="mt-0.5 text-xs font-black text-chalk">{badge.name}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-muted">{badge.evidence}</div>
          </div>
        </Link>
      ))}
      {badges.length > shown.length && (
        <Link
          to="/badges"
          className="ml-1 grid h-9 min-w-9 place-items-center rounded-full border border-line bg-panel-2 px-2 text-[10px] font-black text-muted hover:border-fai/40 hover:text-fai"
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {badges.map((badge) => {
        const style = TIER_STYLE[badge.tier]
        return (
          <Link
            key={badge.id}
            to={`/badges#${badge.id}`}
            className={`group relative flex min-h-[184px] flex-col items-center overflow-hidden rounded-2xl border p-4 text-center transition duration-200 hover:-translate-y-0.5 hover:bg-panel-2/70 ${style.card}`}
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <BadgeMedallion badge={badge} size="lg" />
            <div className={`mt-2 text-[9px] font-black uppercase tracking-[0.18em] ${style.label}`}>
              {badge.group === 'signature' ? 'Archetype' : TIER_NAME[badge.tier]}
            </div>
            <div className="mt-1 w-full text-sm font-black leading-tight text-chalk group-hover:text-fai">
              {badge.name}
            </div>
            <div className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-muted">
              {badge.evidence}
            </div>
          </Link>
        )
      })}
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
