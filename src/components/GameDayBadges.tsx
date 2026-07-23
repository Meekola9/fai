import type {
  GameDayBadgeAward,
  GameDayBadgeCount,
  GameDayBadgeDefinition,
} from '../lib/gameDayBadges'

function BadgeGlyph({ badge, color }: { badge: GameDayBadgeDefinition; color: string }) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (badge.key) {
    case 'badge_menace':
      return (
        <g {...common}>
          <path d="M18 24C21 12 39 9 48 18L53 13V27H39L45 21C38 15 27 17 24 25" />
          <path d="M46 40C42 52 24 55 16 46L11 51V37H25L19 43C26 49 37 47 40 39" />
          <path d="M25 29C29 24 37 24 41 29L38 38C34 41 28 39 24 35Z" />
          <line x1="29" y1="29" x2="36" y2="37" />
        </g>
      )
    case 'badge_journeyman':
      return (
        <g {...common}>
          <path d="M13 49L23 12M51 49L41 12" />
          <path d="M21 40H43M19 30H45M17 20H47" strokeDasharray="4 4" />
          <text x="32" y="38" textAnchor="middle" fontSize="19" fontWeight="950" fill={color} stroke="none">100</text>
        </g>
      )
    case 'badge_airmail':
      return (
        <g {...common}>
          <path d="M12 43C23 24 35 17 54 16" strokeDasharray="4 4" />
          <path d="M37 18C41 11 51 10 56 16C51 23 42 24 36 19Z" />
          <line x1="42" y1="15" x2="50" y2="20" />
          <path d="M11 45L20 44L15 36" />
        </g>
      )
    case 'badge_swat':
      return (
        <g {...common}>
          <path d="M14 39L22 24C24 20 28 22 27 26L25 31L29 19C30 15 35 17 34 21L32 30L36 18C37 14 42 16 41 20L38 31L42 23C44 19 48 22 46 26L41 42C39 49 31 53 24 49Z" />
          <path d="M45 13C50 9 57 12 58 18C55 23 48 24 43 20Z" />
          <line x1="48" y1="14" x2="55" y2="20" />
        </g>
      )
    case 'badge_waffle_house':
      return (
        <g {...common}>
          <path d="M14 14H50V50H14Z" />
          <path d="M14 26H50M14 38H50M26 14V50M38 14V50" strokeWidth="2" />
          <text x="32" y="39" textAnchor="middle" fontSize="24" fontWeight="950" fill={color} stroke="none">5</text>
        </g>
      )
    case 'badge_robber':
      return (
        <g {...common}>
          <path d="M12 25C21 16 43 16 52 25L46 42C38 49 26 49 18 42Z" />
          <path d="M18 28C23 24 28 25 31 29C27 34 22 34 18 31ZM46 28C41 24 36 25 33 29C37 34 42 34 46 31Z" />
          <path d="M26 43C29 39 35 39 38 43" />
        </g>
      )
    case 'badge_butter_fingers':
      return (
        <g {...common}>
          <path d="M23 18C29 12 40 14 44 21C40 29 30 31 23 25Z" />
          <line x1="29" y1="18" x2="38" y2="26" />
          <path d="M12 34C17 29 24 30 27 36M52 34C47 29 40 30 37 36" />
          <path d="M15 39L23 49M49 39L41 49" />
          <path d="M29 36L27 54M35 36L37 54" strokeDasharray="3 4" />
        </g>
      )
    case 'badge_traffic_cone':
      return (
        <g {...common}>
          <path d="M28 10H36L47 48H17Z" />
          <path d="M12 48H52V55H12Z" />
          <path d="M23 30H41M20 40H44" strokeWidth="4" />
        </g>
      )
    default:
      return <text x="32" y="39" textAnchor="middle" fontSize="15" fontWeight="950" fill={color}>FAI</text>
  }
}

export function GameDayBadgeArtwork({ badge, size = 64 }: { badge: GameDayBadgeDefinition; size?: number }) {
  const positive = badge.tone === 'positive'
  const palette = positive
    ? { edge: '#c6f24e', light: '#f4ffd1', mid: '#65a30d', dark: '#142007', ink: '#f7fee7' }
    : { edge: '#fb7185', light: '#ffe4e6', mid: '#be123c', dark: '#35070f', ink: '#fff1f2' }
  const frame = positive
    ? 'M32 3L57 13V31C57 46 47 56 32 61C17 56 7 46 7 31V13Z'
    : 'M20 4H44L60 20V44L44 60H20L4 44V20Z'
  const id = `game-badge-${badge.id}`

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${badge.name} game-day badge`} className="overflow-visible">
      <defs>
        <linearGradient id={`${id}-metal`} x1="8" y1="5" x2="56" y2="59" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.light} />
          <stop offset="0.3" stopColor={palette.edge} />
          <stop offset="0.62" stopColor={palette.mid} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="0" cy="0" r="1" gradientTransform="translate(25 20) rotate(48) scale(38)">
          <stop offset="0" stopColor={palette.light} stopOpacity="0.24" />
          <stop offset="0.55" stopColor={palette.dark} stopOpacity="0.72" />
          <stop offset="1" stopColor="#020617" stopOpacity="0.96" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.3" floodColor={palette.edge} floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter={`url(#${id}-shadow)`}>
        <path d={frame} fill={`url(#${id}-metal)`} stroke={palette.edge} strokeWidth="1.4" />
        <circle cx="32" cy="32" r="23.5" fill={`url(#${id}-core)`} stroke={palette.edge} strokeOpacity="0.58" strokeWidth="1.1" />
        {positive ? (
          <path d="M10 43L19 34L27 38L38 22L46 27L55 16" fill="none" stroke={palette.edge} strokeOpacity="0.18" strokeWidth="1.2" />
        ) : (
          <g stroke={palette.edge} strokeOpacity="0.18" strokeWidth="1.2">
            <path d="M13 17L51 47M20 10L57 47M7 25L43 61" />
          </g>
        )}
        <g transform="translate(6.5 6.5) scale(0.797)">
          <BadgeGlyph badge={badge} color={palette.ink} />
        </g>
        <circle cx="32" cy="32" r="27" fill="none" stroke={palette.edge} strokeOpacity="0.35" strokeWidth="0.8" strokeDasharray="1.5 3" />
      </g>
    </svg>
  )
}

export function GameDayBadgeAwardCard({ award, compact = false }: { award: GameDayBadgeAward; compact?: boolean }) {
  const { badge, play } = award
  return (
    <div className={`flex items-center gap-3 rounded-xl border ${badge.tone === 'positive' ? 'border-fai/25 bg-fai/5' : 'border-down/30 bg-down/5'} ${compact ? 'p-2' : 'p-3'}`}>
      <GameDayBadgeArtwork badge={badge} size={compact ? 42 : 56} />
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${badge.tone === 'positive' ? 'text-fai' : 'text-down'}`}>
          {badge.tone === 'positive' ? 'Positive badge' : 'Negative badge'}
        </div>
        <div className="truncate text-sm font-black text-chalk">{badge.name}</div>
        <div className="truncate text-[11px] text-muted">{play.date}{play.opponent ? ` · vs ${play.opponent}` : ''}</div>
      </div>
    </div>
  )
}

export function GameDayBadgeCountChip({ item }: { item: GameDayBadgeCount }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${item.badge.tone === 'positive' ? 'border-fai/25 bg-fai/5' : 'border-down/30 bg-down/5'}`}>
      <GameDayBadgeArtwork badge={item.badge} size={36} />
      <div>
        <div className="text-xs font-black text-chalk">{item.badge.name}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Season × {item.count}</div>
      </div>
    </div>
  )
}
