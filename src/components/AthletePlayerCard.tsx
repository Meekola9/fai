import { useId } from 'react'
import { formatHeight } from '../data/constants'
import { overallRatingFor, type OverallRatingTone } from '../lib/overallRatings'
import type { Athlete } from '../types'

interface CardTheme {
  accent: string
  deep: string
  soft: string
  edge: string
}

const CARD_THEME: Record<OverallRatingTone, CardTheme> = {
  legend: { accent: '#a78bfa', deep: '#4c1d95', soft: '#f5d0fe', edge: '#e9d5ff' },
  dawg: { accent: '#fbbf24', deep: '#92400e', soft: '#fef3c7', edge: '#fff1a8' },
  difference: { accent: '#c6f24e', deep: '#3f6212', soft: '#ecfccb', edge: '#eaff9e' },
  developing: { accent: '#34d399', deep: '#065f46', soft: '#d1fae5', edge: '#a7f3d0' },
  building: { accent: '#94a3b8', deep: '#334155', soft: '#e2e8f0', edge: '#cbd5e1' },
  'needs-work': { accent: '#fb7185', deep: '#881337', soft: '#ffe4e6', edge: '#fecdd3' },
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

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'FAI'
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
  const gradientId = useId().replace(/:/g, '')
  const normalizedScore = typeof score === 'number' && Number.isFinite(score)
    ? Math.max(0, Math.min(100, score))
    : undefined
  const rating = overallRatingFor(normalizedScore ?? 0)
  const theme = CARD_THEME[normalizedScore === undefined ? 'building' : rating.tone]
  const nameParts = athlete.name.trim().split(/\s+/)
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
  const lastName = nameParts.at(-1) ?? athlete.name
  const positionDetail = athlete.secondaryPosition
    ? `${athlete.position} / ${athlete.secondaryPosition}`
    : athlete.position

  return (
    <section
      data-testid="athlete-player-card"
      aria-label={`${athlete.name} FAI player card`}
      className="relative mx-auto aspect-[4/5] w-full max-w-[780px] isolate overflow-hidden rounded-[1.9rem] border border-white/15 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.68)]"
      style={{
        background: `radial-gradient(circle at 22% 12%, ${theme.soft} 0%, ${theme.accent} 24%, ${theme.deep} 54%, #050607 100%)`,
        boxShadow: `0 28px 90px rgba(0,0,0,.68), 0 0 46px ${theme.accent}2d`,
      }}
    >
      <div
        className="absolute inset-[2.1%] overflow-hidden bg-[#080a0c]"
        style={{ clipPath: 'polygon(4% 0, 94% 0, 100% 5%, 100% 93%, 94% 100%, 4% 100%, 0 95%, 0 5%)' }}
      >
        <svg viewBox="0 0 600 900" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={`${gradientId}-metal`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={theme.soft} stopOpacity="0.24" />
              <stop offset="0.28" stopColor={theme.accent} stopOpacity="0.62" />
              <stop offset="0.6" stopColor={theme.deep} stopOpacity="0.92" />
              <stop offset="1" stopColor="#030405" />
            </linearGradient>
            <linearGradient id={`${gradientId}-shine`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.24" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="600" height="900" fill={`url(#${gradientId}-metal)`} />
          <path d="M0 0 390 0 260 200 0 330Z" fill={theme.soft} opacity="0.11" />
          <path d="M260 200 470 220 600 480 300 420Z" fill={theme.accent} opacity="0.2" />
          <path d="M0 330 300 420 170 720 0 610Z" fill="#020304" opacity="0.48" />
          <path d="M300 420 600 480 600 900 420 760Z" fill={theme.deep} opacity="0.5" />
          <path d="M-30 770 620 120" stroke={`url(#${gradientId}-shine)`} strokeWidth="90" opacity="0.62" />
        </svg>

        <div className="absolute inset-y-0 left-0 w-[59%] overflow-hidden border-r border-white/10">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${theme.deep}, #090b0d 68%)` }}
          />
          {athlete.photoUrl ? (
            <img
              src={athlete.photoUrl}
              alt={athlete.name}
              className="absolute inset-0 h-full w-full object-cover object-top contrast-[1.04] saturate-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.14),transparent_38%)]">
              <div
                className="flex aspect-square h-[48%] items-center justify-center rounded-full border-[0.7rem] border-white/25 text-[clamp(3.8rem,13vw,8.8rem)] font-black tracking-[-0.08em] text-white/75"
                style={{ boxShadow: `0 0 60px ${theme.accent}35` }}
              >
                {initials(athlete.name)}
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_62%,rgba(7,9,10,0.95)_100%),linear-gradient(0deg,rgba(3,4,5,0.9)_0%,transparent_28%)]" />
          <div className="absolute bottom-[3.5%] left-[5%] right-[7%] rounded-xl border border-white/15 bg-black/52 px-[4%] py-[3%] backdrop-blur-sm">
            <div className="text-[clamp(.55rem,1.35vw,.82rem)] font-black uppercase tracking-[0.18em]" style={{ color: theme.soft }}>{gradeLabel}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[clamp(.58rem,1.3vw,.82rem)] font-bold text-white/85">
              <span>{formatHeight(athlete.heightIn)}</span>
              <span>{weightLbs} lbs</span>
              <span>{positionDetail}</span>
            </div>
          </div>
        </div>

        <div className="absolute inset-y-0 right-0 w-[48%] bg-black/16">
          <div className="absolute left-[8%] right-[8%] top-[5%] flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[clamp(1.25rem,5vw,3.25rem)] font-black leading-none tracking-[-0.06em] text-white">{athlete.positionGroup}</div>
              <div className="mt-1 max-w-[13rem] text-[clamp(.58rem,1.8vw,1.08rem)] font-semibold uppercase leading-tight tracking-[0.07em] text-white/86">{archetype ?? 'Awaiting testing'}</div>
            </div>
            <div className="shrink-0 text-right">
              <div
                className="nums text-[clamp(3rem,10vw,6.7rem)] font-black leading-[0.78] tracking-[-0.08em] text-transparent"
                style={{
                  backgroundImage: `linear-gradient(150deg, #fff 0%, ${theme.edge} 30%, ${theme.accent} 62%, ${theme.deep} 100%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  filter: `drop-shadow(0 3px 0 rgba(0,0,0,.45)) drop-shadow(0 0 16px ${theme.accent}45)`,
                }}
              >
                {normalizedScore === undefined ? '—' : Math.round(normalizedScore)}
              </div>
              <div className="mt-2 text-[clamp(.45rem,1.15vw,.72rem)] font-black uppercase tracking-[0.22em]" style={{ color: theme.soft }}>
                {normalizedScore === undefined ? 'Unrated' : 'FAI Overall'}
              </div>
            </div>
          </div>

          <div className="absolute left-[9%] right-[7%] top-[28%]">
            {firstName && <div className="text-[clamp(.75rem,2.5vw,1.65rem)] font-medium uppercase italic leading-none text-white/90">{firstName}</div>}
            <div className="mt-1 break-words text-[clamp(1.25rem,4.5vw,3rem)] font-black uppercase italic leading-[0.9] tracking-[-0.045em] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]">{lastName}</div>
            <div className="mt-[7%] h-px w-[74%]" style={{ background: `linear-gradient(90deg, ${theme.edge}, transparent)` }} />
            <div className="mt-[4%] text-[clamp(.5rem,1.2vw,.75rem)] font-black uppercase tracking-[0.18em] text-white/58">Rating class</div>
            <div className="mt-1 text-[clamp(.68rem,1.75vw,1.05rem)] font-black uppercase leading-tight" style={{ color: theme.soft }}>
              {normalizedScore === undefined ? 'Profile Building' : rating.label}
            </div>
            {strongestTrait && <div className="mt-[5%] inline-flex rounded-full border border-white/20 bg-black/30 px-[7%] py-[2.5%] text-[clamp(.52rem,1.25vw,.76rem)] font-black uppercase tracking-[0.11em] text-white/88">{strongestTrait}</div>}
          </div>

          <div className="absolute bottom-[4%] left-[7%] right-[6%]">
            <div className="text-[clamp(.52rem,1.18vw,.72rem)] font-black uppercase tracking-[0.2em] text-white/55">Football Athlete Index</div>
            <div className="mt-1 truncate text-[clamp(.68rem,1.6vw,1rem)] font-black uppercase tracking-[0.06em] text-white">{teamName ?? 'FAI Program'}</div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[clamp(.48rem,1.05vw,.66rem)] font-bold uppercase tracking-[0.09em] text-white/62">
              {rankEligible && teamRank && teamCount ? <span>Team #{teamRank}/{teamCount}</span> : <span>{statusLabel ?? 'Development profile'}</span>}
              {rankEligible && groupRank && groupCount && <span>{athlete.positionGroup} #{groupRank}/{groupCount}</span>}
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
