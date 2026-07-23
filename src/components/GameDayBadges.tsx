import type {
  GameDayBadgeAward,
  GameDayBadgeCount,
  GameDayBadgeDefinition,
} from '../lib/gameDayBadges'

function AchievementGlyph({ badge, color }: { badge: GameDayBadgeDefinition; color: string }) {
  const art = badge.art
  if (!art) return <text x="32" y="39" textAnchor="middle" fontSize="15" fontWeight="950" fill={color}>FAI</text>
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 2.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  const markSize = art.mark.length >= 3 ? 12 : 15

  switch (art.motif) {
    case 'rush':
      return (
        <g {...common}>
          <path d="M12 44C20 36 20 26 29 19C36 13 46 14 53 20" />
          <path d="M17 49L12 44L18 39M48 15L53 20L48 25" />
          <path d="M24 29H42M21 36H45" strokeDasharray="4 4" />
          <text x="33" y="33" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'touchdown':
      return (
        <g {...common}>
          <path d="M14 47V17M50 47V17M14 22H50" />
          <path d="M24 17V10M40 17V10" />
          <path d="M23 40C27 31 37 31 42 40C37 47 28 47 23 40Z" />
          <line x1="28" y1="36" x2="37" y2="44" />
          <text x="32" y="29" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'pass':
      return (
        <g {...common}>
          <path d="M10 44C21 27 34 17 54 14" strokeDasharray="4 4" />
          <path d="M36 17C41 10 51 10 56 16C52 24 42 25 36 19Z" />
          <line x1="42" y1="15" x2="50" y2="21" />
          <text x="28" y="46" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'precision':
      return (
        <g {...common}>
          <circle cx="32" cy="32" r="20" />
          <circle cx="32" cy="32" r="12" />
          <path d="M32 8V16M32 48V56M8 32H16M48 32H56" />
          <text x="32" y="37" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'target':
      return (
        <g {...common}>
          <circle cx="32" cy="32" r="20" />
          <circle cx="32" cy="32" r="11" />
          <path d="M45 19L55 9M48 10H55V17" />
          <text x="32" y="37" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'crown':
      return (
        <g {...common}>
          <path d="M13 22L22 32L32 16L42 32L51 22L47 46H17Z" />
          <path d="M19 39H45" />
          <text x="32" y="39" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'tackle':
      return (
        <g {...common}>
          <path d="M13 21L32 10L51 21V36C51 46 43 53 32 57C21 53 13 46 13 36Z" />
          <path d="M20 30L27 37L44 21" />
          <text x="34" y="48" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'backfield':
      return (
        <g {...common}>
          <path d="M12 14H52V50H12Z" />
          <path d="M32 14V50M12 32H52" strokeDasharray="4 4" />
          <path d="M18 43L45 20M39 20H45V26" />
          <text x="24" y="27" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'sack':
      return (
        <g {...common}>
          <path d="M21 12H43L50 22L45 52H19L14 22Z" />
          <path d="M21 12C23 20 41 20 43 12M18 24H46" />
          <text x="32" y="42" textAnchor="middle" fontSize={markSize + 2} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'coverage':
      return (
        <g {...common}>
          <path d="M10 34C16 20 27 14 42 16L54 10L50 23L39 20C27 19 19 25 15 37Z" />
          <path d="M16 43L48 43M22 50H42" />
          <text x="32" y="40" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'takeaway':
      return (
        <g {...common}>
          <path d="M12 25C21 16 43 16 52 25L46 42C38 49 26 49 18 42Z" />
          <path d="M18 28C23 24 28 25 31 29C27 34 22 34 18 31ZM46 28C41 24 36 25 33 29C37 34 42 34 46 31Z" />
          <text x="32" y="45" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'separate':
      return (
        <g {...common}>
          <path d="M21 23C26 16 38 16 43 23C39 31 27 32 21 25Z" />
          <line x1="28" y1="20" x2="37" y2="28" />
          <path d="M12 42L24 34M52 42L40 34M22 49L29 38M42 49L35 38" />
          <text x="32" y="55" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'return':
      return (
        <g {...common}>
          <path d="M49 18C38 8 19 15 17 30C15 43 26 52 39 49" />
          <path d="M42 11L49 18L42 25M32 28C36 22 45 24 47 31C43 39 34 40 29 34Z" />
          <text x="23" y="48" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'kick':
      return (
        <g {...common}>
          <path d="M18 12V35M46 12V35M18 18H46" />
          <path d="M32 35V54" />
          <path d="M23 43C27 37 37 37 42 43C38 50 28 50 23 43Z" />
          <text x="32" y="31" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'versatile':
      return (
        <g {...common}>
          <path d="M32 9L38 23L53 24L42 34L46 50L32 42L18 50L22 34L11 24L26 23Z" />
          <path d="M17 54H47" />
          <text x="32" y="36" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
    case 'block':
      return (
        <g {...common}>
          <path d="M11 18H53V46H11Z" />
          <path d="M21 18V46M32 18V46M43 18V46M11 32H53" />
          <path d="M17 52H47" strokeWidth="4" />
          <text x="32" y="37" textAnchor="middle" fontSize={markSize} fontWeight="950" fill={color} stroke="none">{art.mark}</text>
        </g>
      )
  }
}

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
      return <AchievementGlyph badge={badge} color={color} />
  }
}

export function GameDayBadgeArtwork({ badge, size = 64 }: { badge: GameDayBadgeDefinition; size?: number }) {
  const achievement = badge.scope === 'season'
  const positive = badge.tone === 'positive'
  const palette = achievement
    ? { edge: '#fbbf24', light: '#fff7cc', mid: '#b45309', dark: '#2b1204', ink: '#fff8dc' }
    : positive
      ? { edge: '#c6f24e', light: '#f4ffd1', mid: '#65a30d', dark: '#142007', ink: '#f7fee7' }
      : { edge: '#fb7185', light: '#ffe4e6', mid: '#be123c', dark: '#35070f', ink: '#fff1f2' }
  const frame = achievement
    ? 'M32 2L40 9L51 8L55 19L62 27L57 38L58 50L47 55L39 62L28 58L17 60L10 50L3 41L7 30L5 18L17 13L23 4Z'
    : positive
      ? 'M32 3L57 13V31C57 46 47 56 32 61C17 56 7 46 7 31V13Z'
      : 'M20 4H44L60 20V44L44 60H20L4 44V20Z'
  const id = `game-badge-${badge.id}`
  const ariaKind = achievement ? 'season achievement badge' : 'game-day badge'

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${badge.name} ${ariaKind}`} className="overflow-visible">
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
        {achievement ? (
          <g stroke={palette.edge} strokeOpacity="0.18" strokeWidth="1">
            <path d="M13 18L51 46M12 31L45 58M24 7L58 36" />
          </g>
        ) : positive ? (
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
  const achievement = badge.scope === 'season'
  return (
    <div className={`flex items-center gap-3 rounded-xl border ${achievement ? 'border-gold/35 bg-gold/5' : badge.tone === 'positive' ? 'border-fai/25 bg-fai/5' : 'border-down/30 bg-down/5'} ${compact ? 'p-2' : 'p-3'}`}>
      <GameDayBadgeArtwork badge={badge} size={compact ? 42 : 56} />
      <div className="min-w-0 flex-1">
        <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${achievement ? 'text-gold' : badge.tone === 'positive' ? 'text-fai' : 'text-down'}`}>
          {achievement ? 'Season achievement' : badge.tone === 'positive' ? 'Positive badge' : 'Negative badge'}
        </div>
        <div className="truncate text-sm font-black text-chalk">{badge.name}</div>
        <div className="truncate text-[11px] text-muted">{play.date}{play.opponent ? ` · vs ${play.opponent}` : ''}</div>
      </div>
    </div>
  )
}

export function GameDayBadgeCountChip({ item }: { item: GameDayBadgeCount }) {
  const achievement = item.badge.scope === 'season'
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${achievement ? 'border-gold/35 bg-gold/5' : item.badge.tone === 'positive' ? 'border-fai/25 bg-fai/5' : 'border-down/30 bg-down/5'}`}>
      <GameDayBadgeArtwork badge={item.badge} size={36} />
      <div>
        <div className="text-xs font-black text-chalk">{item.badge.name}</div>
        <div className={`text-[10px] font-bold uppercase tracking-wider ${achievement ? 'text-gold' : 'text-muted'}`}>
          {achievement ? '2026 achievement' : `Season × ${item.count}`}
        </div>
      </div>
    </div>
  )
}
