import { formatHeight } from '../data/constants'
import { overallRatingFor } from '../lib/overallRatings'
import { playerUsageDefinition, playerUsagePlanLine } from '../lib/playerUsage'
import type { Athlete } from '../types'

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
  const normalizedScore = typeof score === 'number' && Number.isFinite(score)
    ? Math.max(0, Math.min(100, score))
    : undefined
  const rating = overallRatingFor(normalizedScore ?? 0)
  const usage = playerUsageDefinition(athlete.usage)
  const positionDetail = athlete.secondaryPosition
    ? `${athlete.position} / ${athlete.secondaryPosition}`
    : athlete.position

  return (
    <section
      data-testid="athlete-player-card"
      aria-label={`${athlete.name} FAI player card`}
      className="relative mx-auto w-full max-w-[980px] overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_18px_50px_rgba(0,0,0,0.24)]"
    >
      <div className="h-1 w-full bg-fai" aria-hidden="true" />
      <div className="grid md:grid-cols-[280px_1fr]">
        <div className="relative min-h-[290px] overflow-hidden border-b border-line bg-panel-2 md:border-b-0 md:border-r">
          {athlete.photoUrl ? (
            <img
              src={athlete.photoUrl}
              alt={athlete.name}
              className="absolute inset-0 h-full w-full object-cover object-top grayscale-[0.08]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-36 w-36 place-items-center rounded-full border border-line bg-panel text-5xl font-black tracking-[-0.06em] text-chalk">
                {initials(athlete.name)}
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-16">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">{teamName ?? 'FAI Program'}</div>
            <div className="mt-1 text-sm font-bold text-white">{gradeLabel}</div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-fai">Athlete dossier · {athlete.positionGroup}</div>
              <h1 className="mt-2 break-words text-[clamp(2rem,6vw,4.4rem)] font-black leading-[0.9] tracking-[-0.065em] text-chalk">
                {athlete.name}
              </h1>
              <div className="mt-3 text-sm font-extrabold text-chalk">{archetype ?? 'Profile building'}</div>
              <div className="mt-1 text-xs text-muted">{positionDetail}</div>
            </div>

            <div className="shrink-0 border-l border-line pl-5 text-right">
              <div className="nums text-[clamp(3.2rem,9vw,6rem)] font-black leading-[0.78] tracking-[-0.08em] text-fai">
                {normalizedScore === undefined ? '—' : Math.round(normalizedScore)}
              </div>
              <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted">FAI overall</div>
              <div className="mt-1 text-xs font-extrabold text-chalk">
                {normalizedScore === undefined ? 'Unrated' : rating.label}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <div className="bg-panel-2 px-3 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Height</div>
              <div className="mt-1 text-base font-black nums text-chalk">{formatHeight(athlete.heightIn)}</div>
            </div>
            <div className="bg-panel-2 px-3 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Weight</div>
              <div className="mt-1 text-base font-black nums text-chalk">{weightLbs} lbs</div>
            </div>
            <div className="bg-panel-2 px-3 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Best trait</div>
              <div className="mt-1 truncate text-base font-black text-chalk">{strongestTrait ?? 'Pending'}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="border-l-[3px] border-fai bg-ink/45 px-4 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Deployment</div>
              <div className="mt-1 text-sm font-black text-chalk">{usage.label}</div>
              <div className="mt-1 text-xs font-bold text-fai">{playerUsagePlanLine(athlete.usage)}</div>
            </div>
            <div className="bg-panel-2 px-4 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Coach plan</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{usage.gamePlan}</div>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-5">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Status</div>
              <div className="mt-1 text-xs font-bold text-chalk">{statusLabel ?? 'Development profile'}</div>
            </div>
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[10px] font-bold text-muted">
              {rankEligible && teamRank && teamCount ? <span>Team #{teamRank}/{teamCount}</span> : null}
              {rankEligible && groupRank && groupCount ? <span>{athlete.positionGroup} #{groupRank}/{groupCount}</span> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
