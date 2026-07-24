import { formatHeight } from '../data/constants'
import { overallRatingFor, type OverallRatingTone } from '../lib/overallRatings'
import type { Athlete } from '../types'

interface CardTheme {
  accent: string
  accentDeep: string
  accentSoft: string
  edge: string
  number: string
}

const CARD_THEME: Record<OverallRatingTone, CardTheme> = {
  legend: {
    accent: '#a78bfa',
    accentDeep: '#5b21b6',
    accentSoft: '#ddd6fe',
    edge: '#f5d0fe',
    number: '#f5d0fe',
  },
  dawg: {
    accent: '#fbbf24',
    accentDeep: '#b45309',
    accentSoft: '#fef3c7',
    edge: '#fff1a8',
    number: '#ffe675',
  },
  difference: {
    accent: '#c6f24e',
    accentDeep: '#4d7c0f',
    accentSoft: '#ecfccb',
    edge: '#eaff9e',
    number: '#e7ff91',
  },
  developing: {
    accent: '#34d399',
    accentDeep: '#047857',
    accentSoft: '#d1fae5',
    edge: '#a7f3d0',
    number: '#a7f3d0',
  },
  building: {
    accent: '#94a3b8',
    accentDeep: '#334155',
    accentSoft: '#e2e8f0',
    edge: '#cbd5e1',
    number: '#e2e8f0',
  },
  'needs-work': {
    accent: '#fb7185',
    accentDeep: '#9f1239',
    accentSoft: '#ffe4e6',
    edge: '#fecdd3',
    number: '#fecdd3',
  },
}

export interface AthletePlayerCardProps {
  athlete: Athlete
  score?: number
  archetype?: string
  teamName?: string
  gradeLabel: string
  weightLbs: number
  rankEligible?: boolean
  teamRank?: number
  teamCount?: number
  groupRank?: number
  groupCount?: number
  strongestTrait?: string
  statusLabel?: string
}

function athleteInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'FAI'
}

function FacetedMetal({ theme }: { theme: CardTheme }) {
  return (
    <svg viewBox="0 0 600 900" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="fai-metal-main" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.accentSoft} stopOpacity="0.22" />
          <stop offset="0.24" stopColor={theme.accent} stopOpacity="0.55" />
          <stop offset="0.52" stopColor={theme.accentDeep} stopOpacity="0.9" />
          <stop offset="0.78" stopColor="#050607" stopOpacity="0.92" />
          <stop offset="1" stopColor={theme.accent} stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="fai-metal-shine" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.54" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="600" height="900" fill="url(#fai-metal-main)" />
      <path d="M0 0 390 0 260 200 0 330Z" fill={theme.accentSoft} opacity="0.12" />
      <path d="M390 0 600 0 600 280 470 220Z" fill="#fff" opacity="0.08" />
      <path d="M260 200 470 220 600 480 300 420Z" fill={theme.accent} opacity="0.2" />
      <path d="M0 330 300 420 170 720 0 610Z" fill="#020304" opacity="0.45" />
      <path d="M300 420 600 480 600 900 420 760Z" fill={theme.accentDeep} opacity="0.45" />
      <path d="M170 720 420 760 600 900 0 900Z" fill="#000" opacity="0.54" />
      <path d="M-30 770 620 120" stroke="url(#fai-metal-shine)" strokeWidth="90" opacity="0.68" />
      <g fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2">
        <path d="M30 840C140 670 205 610 320 535S510 390 585 220" />
        <path d="M70 890C180 705 245 645 355 570S520 430 610 300" />
        <path d="M-10 790C105 630 170 570 280 500S470 350 560 175" />
      </g>
    </svg>
  )
}

function FaiWireMark({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 160 160" className="h-full w-full" aria-hidden="true">
      <path
        d="M80 8 137 30v45c0 38-23 62-57 77C46 137 23 113 23 75V30L80 8Z"
        fill="none"
        stroke={accent}
        strokeWidth="4"
        opacity="0.92"
      />
      <path d="M49 111 70 47h24l21 64M57 86h50" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M80 21 123 38v35c0 28-15 48-43 63-28-15-43-35-43-63V38L80 21Z" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.48" />
    </svg>
  )
}

export function AthletePlayerCard({
  athlete,
  score,
  archetype,
  teamName,
  gradeLabel,
  weightLbs,
  rankEligible = false,
  teamRank,
  teamCount,
  groupRank,
  groupCount,
  strongestTrait,
  statusLabel,
}: AthletePlayerCardProps) {
  const normalizedScore = typeof score === 'number' && Number.isFinite(score)
    ? Math.max(0, Math.min(100, score))
    : undefined
  const rating = overallRatingFor(normalizedScore ?? 0)
  const theme = CARD_THEME[normalizedScore === undefined ? 'building' : rating.tone]
  const scoreText = normalizedScore === undefined ? '—' : String(Math.round(normalizedScore))
  const initials = athleteInitials(athlete.name)
  const positionLabel = athlete.positionGroup || athlete.position
  const positionDetail = athlete.secondaryPosition
    ? `${athlete.position} / ${athlete.secondaryPosition}`
    : athlete.position
  const nameParts = athlete.name.trim().split(/\s+/)
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
  const lastName = nameParts.at(-1) ?? athlete.name

  return (
    <section
      data-testid="athlete-player-card"
      className="relative mx-auto aspect-[4/5] w-full max-w-[780px] isolate overflow-hidden rounded-[1.9rem] border border-white/15 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.68)]"
      style={{
        background: `radial-gradient(circle at 22% 12%, ${theme.accentSoft} 0%, ${theme.accent} 24%, ${theme.accentDeep} 52%, #050607 100%)`,
        boxShadow: `0 28px 90px rgba(0,0,0,.68), 0 0 46px ${theme.accent}2d`,
      }}
      aria-label={`${athlete.name} FAI player card`}
    >
      <div className="absolute inset-[2.1%] overflow-hidden bg-[#080a0c]" style={{ clipPath: 'polygon(4% 0, 94% 0, 100% 5%, 100% 93%, 94% 100%, 4% 100%, 0 95%, 0 5%)' }}>
        <div className="absolute inset-0 opacity-95"><FacetedMetal theme={theme} /></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.2),transparent_25%),linear-gradient(120deg,transparent_44%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.72)_100%)]" />

        <div className="absolute inset-y-0 left-0 w-[59%] overflow-hidden" style={{ clipPath: 'polygon(0 0, 95% 0, 100% 4%, 100% 100%, 0 100%)' }}>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(255,255,255,.15), transparent 24%), repeating-linear-gradient(0deg, transparent 0 42px, rgba(255,255,255,.055) 43px 44px), linear-gradient(135deg, ${theme.accentDeep}, #090b0d 68%)`,
            }}
          />
          <div className="absolute inset-x-0 top-[12%] h-px bg-white/20" />
          <div className="absolute inset-x-0 top-[20%] h-px bg-white/10" />
          <div className="absolute inset-x-0 top-[28%] h-px bg-white/10" />
          {athlete.photoUrl ? (
            <img
              src={athlete.photoUrl}
              alt={athlete.name}
              className="absolute inset-0 h-full w-full object-cover object-top contrast-[1.04] saturate-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.14),transparent_38%)]">
              <div
                className="flex h-[48%] aspect-square items-center justify-center rounded-full border-[0.7rem] border-white/25 text-[clamp(3.8rem,13vw,8.8rem)] font-black tracking-[-0.08em] text-white/75"
                style={{ boxShadow: `0 0 60px ${theme.accent}35` }}
              >
                {initials}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_62%,rgba(7,9,10,0.94)_100%),linear-gradient(0deg,rgba(3,4,5,0.88)_0%,transparent_25%)]" />

          <div className="absolute bottom-[3.5%] left-[5%] right-[7%] rounded-xl border border-white/15 bg-black/48 px-[4%] py-[3%] backdrop-blur-sm">
            <div className="text-[clamp(.55rem,1.35vw,.82rem)] font-black uppercase tracking-[0.18em]" style={{ color: theme.accentSoft }}>
              {gradeLabel}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[clamp(.58rem,1.3vw,.82rem)] font-bold text-white/85">
              <span>{formatHeight(athlete.heightIn)}</span>
              <span>{weightLbs} lbs</span>
              <span>{positionDetail}</span>
            </div>
          </div>
        </div>

        <div className="absolute inset-y-0 right-0 w-[48%] overflow-hidden border-l border-white/10 bg-black/20">
          <div className="absolute inset-0"><FacetedMetal theme={theme} /></div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.48))]" />

          <div className="absolute left-[8%] right-[8%] top-[5%] flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[clamp(1.25rem,5vw,3.25rem)] font-black leading-none tracking-[-0.06em] text-white">{positionLabel}</div>
              <div className="mt-1 max-w-[13rem] text-[clamp(.58rem,1.8vw,1.08rem)] font-semibold uppercase leading-tight tracking-[0.07em] text-white/86">
                {archetype ?? 'Awaiting testing'}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div
                className="nums text-[clamp(3rem,10vw,6.7rem)] font-black leading-[0.78] tracking-[-0.08em] text-transparent"
                style={{
                  backgroundImage: `linear-gradient(150deg, #fff 0%, ${theme.number} 30%, ${theme.accent} 58%, #8a5b00 100%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  filter: `drop-shadow(0 3px 0 rgba(0,0,0,.45)) drop-shadow(0 0 16px ${theme.accent}45)`,
                }}
              >
                {scoreText}
              </div>
              <div className="mt-2 text-[clamp(.45rem,1.15vw,.72rem)] font-black uppercase tracking-[0.22em]" style={{ color: theme.accentSoft }}>
                {normalizedScore === undefined ? 'Unrated' : 'FAI Overall'}
              </div>
            </div>
          </div>

          <div className="absolute left-[9%] right-[7%] top-[27%]">
            {firstName && (
              <div className="text-[clamp(.75rem,2.5vw,1.65rem)] font-medium uppercase italic leading-none tracking-[0.02em] text-white/90">
                {firstName}
              </div>
            )}
            <div className="mt-1 break-words text-[clamp(1.25rem,4.5vw,3rem)] font-black uppercase italic leading-[0.9] tracking-[-0.045em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]">
              {lastName}
            </div>
            <div className="mt-[7%] h-px w-[74%]" style={{ background: `linear-gradient(90deg, ${theme.edge}, transparent)` }} />
            <div className="mt-[4%] text-[clamp(.5rem,1.2vw,.75rem)] font-black uppercase tracking-[0.18em] text-white/58">Rating class</div>
            <div className="mt-1 text-[clamp(.68rem,1.75vw,1.05rem)] font-black uppercase leading-tight" style={{ color: theme.accentSoft }}>
              {normalizedScore === undefined ? 'Profile Building' : rating.label}
            </div>
            {strongestTrait && (
              <div className="mt-[5%] inline-flex rounded-full border border-white/20 bg-black/30 px-[7%] py-[2.5%] text-[clamp(.52rem,1.25vw,.76rem)] font-black uppercase tracking-[0.11em] text-white/88">
                {strongestTrait}
              </div>
            )}
          </div>

          <div className="absolute bottom-[4%] left-[7%] right-[6%]">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[clamp(.52rem,1.18vw,.72rem)] font-black uppercase tracking-[0.2em] text-white/55">Football Athlete Index</div>
                <div className="mt-1 truncate text-[clamp(.68rem,1.6vw,1rem)] font-black uppercase tracking-[0.06em] text-white">
                  {teamName ?? 'FAI Program'}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[clamp(.48rem,1.05vw,.66rem)] font-bold uppercase tracking-[0.09em] text-white/62">
                  {rankEligible && teamRank && teamCount ? <span>Team #{teamRank}/{teamCount}</span> : <span>{statusLabel ?? 'Development profile'}</span>}
                  {rankEligible && groupRank && groupCount && <span>{positionLabel} #{groupRank}/{groupCount}</span>}
                </div>
              </div>
              <div className="h-[clamp(3.5rem,10vw,6rem)] w-[clamp(3.5rem,10vw,6rem)] shrink-0 opacity-90">
                <FaiWireMark accent={theme.edge} />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 border border-white/18" style={{ clipPath: 'polygon(4% 0, 94% 0, 100% 5%, 100% 93%, 94% 100%, 4% 100%, 0 95%, 0 5%)' }} />
        <div className="absolute left-[1.4%] top-[1.2%] text-[clamp(.42rem,1vw,.62rem)] font-black uppercase tracking-[0.28em] text-white/55">FAI · Athlete Card</div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_0%,rgba(255,255,255,0.07)_38%,transparent_50%)]" />
    </section>
  )
}
