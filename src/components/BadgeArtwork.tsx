import { BADGE_ART } from '../lib/badgeArt'
import type { BadgeGroup, BadgeTier, PlayerBadgeDefinition } from '../lib/badges'

const TIER_PALETTE: Record<BadgeTier, {
  edge: string
  light: string
  mid: string
  dark: string
  ink: string
}> = {
  bronze: { edge: '#fb923c', light: '#fdba74', mid: '#c2410c', dark: '#431407', ink: '#fff7ed' },
  silver: { edge: '#e2e8f0', light: '#f8fafc', mid: '#94a3b8', dark: '#1e293b', ink: '#f8fafc' },
  gold: { edge: '#fcd34d', light: '#fef3c7', mid: '#d97706', dark: '#451a03', ink: '#fffbeb' },
  elite: { edge: '#67e8f9', light: '#cffafe', mid: '#0891b2', dark: '#083344', ink: '#ecfeff' },
  legend: { edge: '#c4b5fd', light: '#ede9fe', mid: '#7c3aed', dark: '#2e1065', ink: '#faf5ff' },
}

const FRAME_PATH: Record<BadgeTier, string> = {
  bronze: 'M32 3L55 16V48L32 61L9 48V16Z',
  silver: 'M20 4H44L60 20V44L44 60H20L4 44V20Z',
  gold: 'M32 3L57 13V31C57 46 47 56 32 61C17 56 7 46 7 31V13Z',
  elite: 'M32 2L39 9L49 6L53 16L62 20L58 31L62 42L53 47L49 58L38 55L32 62L25 55L14 58L10 47L2 42L6 31L2 20L11 16L15 6L25 9Z',
  legend: 'M32 2L39 10L49 5L52 16L62 20L57 31L62 42L52 47L48 59L37 55L32 63L26 55L15 59L12 47L2 42L7 31L2 20L12 16L15 5L25 10Z',
}

function GroupPattern({ group, color }: { group: BadgeGroup; color: string }) {
  if (group === 'testing') {
    return (
      <g opacity="0.2" stroke={color} strokeWidth="1">
        <path d="M11 21H53M11 32H53M11 43H53M21 11V53M32 11V53M43 11V53" />
      </g>
    )
  }
  if (group === 'performance') {
    return (
      <g opacity="0.18" stroke={color} strokeWidth="1">
        <path d="M32 7V18M32 46V57M7 32H18M46 32H57M14 14L22 22M42 42L50 50M50 14L42 22M22 42L14 50" />
      </g>
    )
  }
  if (group === 'club') {
    return (
      <g opacity="0.18" stroke={color} strokeWidth="1.2">
        <path d="M8 19H42M5 27H49M8 35H55M15 43H58" />
      </g>
    )
  }
  if (group === 'progress') {
    return (
      <g opacity="0.18" fill="none" stroke={color} strokeWidth="1.2">
        <path d="M12 46L23 35L31 40L46 22L54 28M46 22H55V31" />
      </g>
    )
  }
  if (group === 'signature') {
    return (
      <g opacity="0.2" fill="none" stroke={color} strokeWidth="1.1">
        <path d="M14 40C10 30 18 15 32 15C46 15 54 30 50 40" />
        <path d="M20 46C16 38 22 26 32 26C42 26 48 38 44 46" />
      </g>
    )
  }
  return (
    <g opacity="0.18" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M16 47C9 39 9 25 16 17M48 47C55 39 55 25 48 17M17 17L12 13M47 17L52 13" />
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
  // Signature badges are unique per archetype, so they carry a name monogram
  // and a small star instead of a fixed vector mark.
  if (badge.group === 'signature') {
    return (
      <g fill={color} stroke="none">
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="24"
          fontWeight="950"
          letterSpacing="-1"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {monogram(badge.name)}
        </text>
        <path
          d="M32 6L34 12L40 12L35 16L37 22L32 18L27 22L29 16L24 12L30 12Z"
          stroke="none"
        />
      </g>
    )
  }

  const art = BADGE_ART[badge.id]
  if (!art) {
    return (
      <text x="32" y="38" textAnchor="middle" fontSize="17" fontWeight="900" fill={color}>
        FAI
      </text>
    )
  }

  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth="3"
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
  const frame = FRAME_PATH[badge.tier]
  const id = `badge-${badge.id.replace(/[^a-z0-9]/gi, '-')}`

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
        <linearGradient id={`${id}-metal`} x1="8" y1="5" x2="55" y2="59" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.light} />
          <stop offset="0.28" stopColor={palette.edge} />
          <stop offset="0.58" stopColor={palette.mid} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="0" cy="0" r="1" gradientTransform="translate(25 20) rotate(48) scale(39)">
          <stop offset="0" stopColor={palette.light} stopOpacity="0.28" />
          <stop offset="0.5" stopColor={palette.dark} stopOpacity="0.72" />
          <stop offset="1" stopColor="#050914" stopOpacity="0.96" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <path d={frame} />
        </clipPath>
        <filter id={`${id}-shadow`} x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor={palette.edge} floodOpacity="0.42" />
        </filter>
      </defs>

      <g filter={`url(#${id}-shadow)`}>
        <path d={frame} fill={`url(#${id}-metal)`} stroke={palette.edge} strokeWidth="1.4" />
        <path d={frame} fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="0.8" transform="translate(1.92 2.92) scale(0.94)" />
        <g clipPath={`url(#${id}-clip)`}>
          <circle cx="32" cy="32" r="24" fill={`url(#${id}-core)`} stroke={palette.edge} strokeOpacity="0.55" strokeWidth="1.2" />
          <GroupPattern group={badge.group} color={palette.edge} />
          <path d="M14 18C23 10 42 8 51 18" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" />
        </g>
        <g transform="translate(6.5 6.5) scale(0.797)">
          <BadgeGlyph badge={badge} color={palette.ink} />
        </g>
        <circle cx="32" cy="32" r="27" fill="none" stroke={palette.edge} strokeOpacity="0.34" strokeWidth="0.8" strokeDasharray="1.5 3" />
        <circle cx="32" cy="6.5" r="1.2" fill={palette.light} />
        <circle cx="57.5" cy="32" r="1.2" fill={palette.light} />
        <circle cx="32" cy="57.5" r="1.2" fill={palette.light} />
        <circle cx="6.5" cy="32" r="1.2" fill={palette.light} />
      </g>
    </svg>
  )
}
