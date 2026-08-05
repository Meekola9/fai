// ---------------------------------------------------------------------------
// Chief-to-King — turns a coach's per-opponent worksheet into an attack plan.
//
// The rule (coach's own framework):
//   1. Identify the King — the player everything flows through.
//   2. Identify the Chiefs — the 2-3 players who make the King effective.
//   3. Find the weakest Chief — worst matchup / least awareness / poorest
//      technique / smallest package of responsibilities.
//   4. Attack that matchup repeatedly — make the King compensate (widen,
//      rotate, chase, communicate more, or abandon his assignment).
//   5. Attack the King after he breaks structure — once he's impatient,
//      isolated, or predictable, hit him with the counter.
// ---------------------------------------------------------------------------
import type { ChiefKingPlan, KingPosition } from '../types'

export const KING_POSITION_LABEL: Record<KingPosition, string> = {
  qb: 'Star quarterback',
  mlb: 'Elite middle linebacker',
  de: 'Elite defensive end',
  safety: 'Elite safety',
  skill: 'Featured skill player',
  other: 'Linchpin',
}

/** The position-specific attack, straight from the coach's examples. */
const POSITION_PLAY: Record<KingPosition, string> = {
  mlb: 'Attack the weaker overhang and perimeter until the linebacker widens, then run counter, power, or split-zone back underneath him.',
  de: 'Attack away from him and use screens or split flow until he starts chasing, then trap, wham, or read him.',
  safety: 'Win underneath against weaker defenders until he starts driving downhill, then take the shot behind him.',
  qb: 'Attack the weakest protector, eliminate his checkdown and secondary targets, and make him hold the ball before bringing the pressure designed for him.',
  skill: 'Bracket or rotate help to him and take away his best route/run, forcing the offense to win with someone else — then hit the counter when they force it back to him.',
  other: 'Take away his primary job, make the offense/defense operate without him, and counter once they lean on him out of rhythm.',
}

export interface ChiefKingPlaybook {
  king: string
  kingPositionLabel: string
  weakestChief?: string
  /** The 5-step rule applied with the plan's names. */
  steps: string[]
  positionPlay: string
  /** One-line summary for the sideline alert. */
  alertDetail: string
  /** True once King, at least one Chief, and the weakest Chief are set. */
  complete: boolean
  /** What the coach still needs to fill in, when incomplete. */
  missing: string[]
}

export function buildChiefKingPlaybook(plan: ChiefKingPlan): ChiefKingPlaybook {
  const kingPositionLabel = KING_POSITION_LABEL[plan.kingPosition]
  const weakest = plan.chiefs.find((c) => c.id === plan.weakestChiefId)
  const weakestName = weakest ? `${weakest.label}${weakest.role ? ` (${weakest.role})` : ''}` : undefined

  const missing: string[] = []
  if (!plan.kingLabel.trim()) missing.push('the King')
  if (plan.chiefs.length === 0) missing.push('at least one Chief')
  if (!weakest) missing.push('which Chief is weakest')
  const complete = missing.length === 0

  const chiefList = plan.chiefs.map((c) => c.label).join(', ') || '—'
  const positionPlay = POSITION_PLAY[plan.kingPosition]

  const steps = [
    `King: ${plan.kingLabel || '—'} (${kingPositionLabel}) — everything flows through him.`,
    `Chiefs: ${chiefList} — the players who make him effective.`,
    weakestName
      ? `Weakest Chief: ${weakestName} — the matchup to attack.`
      : 'Weakest Chief: pick the supporting player with the worst matchup.',
    weakestName
      ? `Attack ${weakestName} repeatedly until ${plan.kingLabel || 'the King'} has to compensate — widen, rotate, chase, communicate more, or leave his assignment.`
      : 'Attack that matchup repeatedly to make the King compensate.',
    `Once ${plan.kingLabel || 'the King'} breaks structure (impatient, isolated, predictable), hit the counter.`,
  ]

  const alertDetail = complete
    ? `Attack ${weakestName} → force ${plan.kingLabel} (${kingPositionLabel}) to break structure → counter. ${positionPlay}`
    : `Set up the plan — still need ${missing.join(', ')}.`

  return { king: plan.kingLabel, kingPositionLabel, weakestChief: weakestName, steps, positionPlay, alertDetail, complete, missing }
}

/** The plan for a given opponent, if one exists. */
export function planForOpponent(plans: readonly ChiefKingPlan[], opponent?: string): ChiefKingPlan | undefined {
  if (!opponent) return undefined
  return plans.find((p) => p.opponent === opponent)
}
