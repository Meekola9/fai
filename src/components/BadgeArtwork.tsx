import { useId } from 'react'
import { BADGE_ART } from '../lib/badgeArt'
import type { BadgeGroup, BadgeTier, PlayerBadgeDefinition } from '../lib/badges'

const TIER_PALETTE: Record<BadgeTier, {
  edge: string
  light: string
  mid: string
  dark: string
  core: string
  ink: string
  glow: string
}> = {
  bronze: {
    edge: '#fb923c',
    light: '#ffedd5',
    mid: '#c2410c',
    dark: '#431407',
    core: '#170906',
    ink: '#fff7ed',
    glow: '#f97316',
  },
  silver: {
    edge: '#e2e8f0',
    light: '#ffffff',
    mid: '#94a3b8',
    dark: '#1e293b',
    core: '#0f172a',
    ink: '#f8fafc',
    glow: '#cbd5e1',
  },
  gold: {
    edge: '#fcd34d',
    light: '#fff7cc',
    mid: '#d97706',
    dark: '#451a03',
    core: '#1c0c03',
    ink: '#fffbeb',
    glow: '#fbbf24',
  },
  elite: {
    edge: '#67e8f9',
    light: '#ecfeff',
    mid: '#0891b2',
    dark: '#083344',
    core: '#031b22',
    ink: '#ecfeff',
    glow: '#22d3ee',
  },
  legend: {
    edge: '#c4b5fd',
    light: '#f5f3ff',
    mid: '#7c3aed',
    dark: '#2e1065',
    core: '#14052e',
    ink: '#faf5ff',
    glow: '#a78bfa',
  },
}

const TIER_RANK: Record<BadgeTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  elite: 4,
  legend: 5,
}

const OUTER_FRAME = 'M11 5H53L59 13V36C59 49 49 58 32 63C15 58 5 49 5 36V13Z'
const INNER_FRAME = 'M14 12H50L54 18V35C54 44 46 51 32 56C18 51 10 44 10 35V18Z'
const CORE_FRAME = 'M17 17H47L50 21V34C50 41 43 47 32 51C21 47 14 41 14 34V21Z'

function GroupPattern({ group, color }: { group: BadgeGroup; color: string }) {
  if (group === 'testing') {
    return (
      <g opacity="0.17" stroke={color} strokeWidth="1">
        <path d="M12 22H52M11 31H53M13 40H51M22 13V48M32 12V52M42 13V48" />
      </g>
    )
  }
  if (group === 'performance') {
    return (
      <g opacity="0.17" stroke={color} strokeWidth="1">
        <path d="M32 11V19M32 45V53M11 32H19M45 32H53M17 17L23 23M41 41L47 47M47 17L41 23M23 41L17 47" />
      </g>
    )
  }
  if (group === 'club') {
    return (
      <g opacity="0.17" stroke={color} strokeWidth="1.2">
        <path d="M10 21H42M8 28H49M10 35H54M16 42H55" />
      </g>
    )
  }
  if (group === 'progress') {
    return (
      <g opacity="0.17" fill="none" stroke={color} strokeWidth="1.2">
        <path d="M13 45L23 35L31 39L45 23L52 28M45 23H53V31" />
      </g>
    )
  }
  if (group === 'signature') {
    return (
      <g opacity="0.18" fill="none" stroke={color} strokeWidth="1.1">
        <path d="M15 39C12 29 19 17 32 17C45 17 52 29 49 39" />
        <path d="M21 45C18 37 23 27 32 27C41 27 46 37 43 45" />
      </g>
    )
  }
  return (
    <g opacity="0.17" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M17 46C11 39 11 26 17 19M47 46C53 39 53 26 47 19M18 19L13 15M46 19L51 15" />
    </g>
  )
}

/** Two-letter monogram for a signature badge, drawn from the archetype name. */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? '?').slice(0, 2).toUpperCase()
}

function BadgeGlyph({ badge, color }: { badge: PlayerBadgeDefinition; color: string }) {
  if (badge.group === 'signature') {
    return (
      <g fill={color} stroke="none">
        <text
          x="32"
          y="41"
          textAnchor="middle"
          fontSize="25"
          fontWeight="950"
          letterSpacing="-1.2"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {monogram(badge.name)}
        </text>
        <path d="M32 7L34 12L40 12L35 16L37 21L32 18L27 21L29 16L24 12L30 12Z" />
      </g>
    )
  }

  const art = BADGE_ART[badge.id]
  if (!art) {
    return (
      <text x="32" y="39" textAnchor="middle" fontSize="18" fontWeight="950" fill={color}>
        FAI
      </text>
    )
  }

  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth="3.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {art.paths?.map((path, index) => <path key={`p-${index}`} d={path} />)}
      {art.lines?.map((line, index) => (
        <line key={`l-${index}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
      ))}
      {art.circles?.map((circle, index) => (
        <circle
          key={`c-${index}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          fill={circle.fill ? color : 'none'}
        />
      ))}
      {art.text && (
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fontSize={art.textSize ?? 20}
          fontWeight="950"
          letterSpacing="-0.8"
          fill={color}
          stroke="none"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {art.text}
        </text>
      )}
    </g>
  )
}

export function BadgeArtwork({
  badge,
  size,
}: {
  badge: PlayerBadgeDefinition
  size: number
}) {
  const palette = TIER_PALETTE[badge.tier]
  const markerCount = TIER_RANK[badge.tier]
  const reactId = useId().replace(/:/g, '')
  const id = `badge-${reactId}-${badge.id.replace(/[^a-z0-9]/gi, '-')}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${badge.name} ${badge.tier} badge artwork`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={`${id}-metal`} x1="8" y1="4" x2="57" y2="61" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.light} />
          <stop offset="0.2" stopColor={palette.edge} />
          <stop offset="0.52" stopColor={palette.mid} />
          <stop offset="0.78" stopColor={palette.dark} />
          <stop offset="1" stopColor={palette.mid} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="12" y1="8" x2="50" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="0.22" stopColor={palette.edge} stopOpacity="0.95" />
          <stop offset="0.7" stopColor={palette.dark} />
          <stop offset="1" stopColor={palette.light} stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="0" cy="0" r="1" gradientTransform="translate(26 21) rotate(54) scale(35 39)">
          <stop offset="0" stopColor={palette.edge} stopOpacity="0.24" />
          <stop offset="0.42" stopColor={palette.dark} stopOpacity="0.88" />
          <stop offset="1" stopColor={palette.core} />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <path d={INNER_FRAME} />
        </clipPath>
        <filter id={`${id}-shadow`} x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="2.4" floodColor="#000000" floodOpacity="0.68" />
          <feDropShadow dx="0" dy="0" stdDeviation="2.7" floodColor={palette.glow} floodOpacity="0.52" />
        </filter>
        <filter id={`${id}-glyph-glow`} x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor={palette.light} floodOpacity="0.48" />
        </filter>
      </defs>

      <g filter={`url(#${id}-shadow)`}>
        <path d={OUTER_FRAME} fill={`url(#${id}-metal)`} stroke={palette.light} strokeOpacity="0.8" strokeWidth="0.9" />
        <path d={INNER_FRAME} fill={`url(#${id}-rim)`} stroke={palette.edge} strokeWidth="1" />
        <path d={CORE_FRAME} fill={`url(#${id}-core)`} stroke={palette.edge} strokeOpacity="0.7" strokeWidth="1.15" />

        <g clipPath={`url(#${id}-clip)`}>
          <GroupPattern group={badge.group} color={palette.edge} />
          <path d="M14 17C23 10 42 9 51 17" fill="none" stroke="#fff" strokeOpacity="0.24" strokeWidth="2.1" />
          <path d="M13 40C21 50 43 53 52 39" fill="none" stroke={palette.edge} strokeOpacity="0.18" strokeWidth="1.4" />
        </g>

        <path d="M11 5H53L57 10H7Z" fill={palette.light} fillOpacity="0.22" />
        <path d="M14 12L20 8H44L50 12" fill="none" stroke={palette.light} strokeOpacity="0.72" strokeWidth="1.2" />

        <g filter={`url(#${id}-glyph-glow)`} transform="translate(7.4 8.1) scale(0.77)">
          <BadgeGlyph badge={badge} color={palette.ink} />
        </g>

        <path d="M20 49L32 55L44 49" fill="none" stroke={palette.edge} strokeOpacity="0.75" strokeWidth="1.15" />
        <path d="M24 52L32 57L40 52" fill="none" stroke={palette.light} strokeOpacity="0.42" strokeWidth="0.8" />

        <g aria-hidden="true">
          {Array.from({ length: markerCount }, (_, index) => {
            const x = 32 - ((markerCount - 1) * 2.8) + (index * 5.6)
            return (
              <path
                key={index}
                d={`M${x} 12L${x + 1.45} 13.45L${x} 14.9L${x - 1.45} 13.45Z`}
                fill={palette.light}
                stroke={palette.edge}
                strokeWidth="0.45"
              />
            )
          })}
        </g>
      </g>
    </svg>
  )
}
