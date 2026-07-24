import { Link } from 'react-router-dom'
import { BadgeArtwork } from './BadgeArtwork'
import type { EarnedPlayerBadge, PlayerBadgeDefinition, BadgeTier } from '../lib/badges'

const TIER_STYLE: Record<BadgeTier, {
  label: string
  ring: string
}> = {
  bronze: {
    label: 'text-orange-300',
    ring: 'group-hover:drop-shadow-[0_0_8px_rgba(251,146,60,0.55)]',
  },
  silver: {
    label: 'text-slate-200',
    ring: 'group-hover:drop-shadow-[0_0_8px_rgba(226,232,240,0.45)]',
  },
  gold: {
    label: 'text-gold',
    ring: 'group-hover:drop-shadow-[0_0_9px_rgba(252,211,77,0.6)]',
  },
  elite: {
    label: 'text-fai',
    ring: 'group-hover:drop-shadow-[0_0_10px_rgba(103,232,249,0.65)]',
  },
  legend: {
    label: 'text-violet-300',
    ring: 'group-hover:drop-shadow-[0_0_11px_rgba(196,181,253,0.7)]',
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
  const pixels = size === 'sm' ? 40 : size === 'lg' ? 72 : 54
  const style = TIER_STYLE[badge.tier]

  return (
    <div
      className={`relative grid shrink-0 place-items-center transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.04] ${style.ring}`}
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
    <div className="mt-3 flex items-center gap-1" aria-label={`${badges.length} earned player badges`}>
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
          className="ml-1 grid h-8 min-w-8 place-items-center rounded-full border border-line bg-panel-2 px-2 text-[10px] font-black text-muted hover:border-fai/40 hover:text-fai"
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
              {badge.group === 'signature' ? 'Archetype' : `${TIER_NAME[badge.tier]} badge`}
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
