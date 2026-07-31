import type { ThrowAnalysis } from '../types'
import { computeThrowMetrics, type ThrowMetrics } from './throwAnalysis'

export type QbMechanicsCategory =
  | 'timing'
  | 'upper-body'
  | 'separation'
  | 'base'
  | 'stride'
  | 'release'

export type QbMechanicsSeverity = 'strength' | 'watch' | 'priority'

export interface QbMechanicsFinding {
  category: QbMechanicsCategory
  label: string
  severity: QbMechanicsSeverity
  value?: number
  unit?: string
  summary: string
  coachingCue: string
}

export interface QbMechanicsReport {
  score: number
  completeness: number
  metrics: ThrowMetrics
  findings: QbMechanicsFinding[]
  strengths: QbMechanicsFinding[]
  priorities: QbMechanicsFinding[]
}

interface RangeRule {
  idealMin: number
  idealMax: number
  watchMin: number
  watchMax: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function rangeScore(value: number, rule: RangeRule): number {
  if (value >= rule.idealMin && value <= rule.idealMax) return 100
  if (value < rule.watchMin || value > rule.watchMax) return 45
  const distance = value < rule.idealMin
    ? (rule.idealMin - value) / Math.max(0.001, rule.idealMin - rule.watchMin)
    : (value - rule.idealMax) / Math.max(0.001, rule.watchMax - rule.idealMax)
  return Math.round(100 - clamp(distance, 0, 1) * 40)
}

function severityForScore(score: number): QbMechanicsSeverity {
  if (score >= 88) return 'strength'
  if (score >= 68) return 'watch'
  return 'priority'
}

function finding(
  category: QbMechanicsCategory,
  label: string,
  value: number | undefined,
  unit: string,
  rule: RangeRule,
  summaries: { strength: string; watch: string; priority: string },
  cues: { strength: string; watch: string; priority: string },
): { finding?: QbMechanicsFinding; score?: number } {
  if (typeof value !== 'number' || !Number.isFinite(value)) return {}
  const score = rangeScore(value, rule)
  const severity = severityForScore(score)
  return {
    score,
    finding: {
      category,
      label,
      severity,
      value,
      unit,
      summary: summaries[severity],
      coachingCue: cues[severity],
    },
  }
}

export function buildQbMechanicsReport(analysis: ThrowAnalysis): QbMechanicsReport {
  const metrics = computeThrowMetrics(analysis)
  const evaluated = [
    finding(
      'timing',
      'Plant-to-release',
      metrics.plantToReleaseSec,
      's',
      { idealMin: 0.18, idealMax: 0.42, watchMin: 0.12, watchMax: 0.62 },
      {
        strength: 'The ball is leaving on time after the base is established.',
        watch: 'The transition from plant to release is usable but inconsistent.',
        priority: 'The release is disconnected from the plant or requires extra reset time.',
      },
      {
        strength: 'Preserve the same plant-to-fire rhythm under pressure.',
        watch: 'Finish the final step and begin the throw without a pause.',
        priority: 'Use catch-rock-fire and one-hitch timing drills to remove the reset.',
      },
    ),
    finding(
      'upper-body',
      'Elbow angle',
      metrics.elbowAngleDeg,
      '°',
      { idealMin: 75, idealMax: 115, watchMin: 55, watchMax: 135 },
      {
        strength: 'The throwing arm is organized in a strong release window.',
        watch: 'The elbow position is workable but may vary with platform changes.',
        priority: 'The arm is entering a stressed or inefficient release position.',
      },
      {
        strength: 'Keep the wrist stacked and let the elbow follow the torso.',
        watch: 'Match the elbow to the shoulder turn instead of forcing the slot.',
        priority: 'Use half-kneeling and no-stride throws to rebuild arm organization.',
      },
    ),
    finding(
      'separation',
      'Hip–shoulder separation',
      metrics.shoulderHipSeparationDeg,
      '°',
      { idealMin: 18, idealMax: 48, watchMin: 8, watchMax: 62 },
      {
        strength: 'The lower body is creating useful rotational stretch before release.',
        watch: 'Rotational sequencing is present but not consistently timed.',
        priority: 'The hips and shoulders are opening together or becoming over-separated.',
      },
      {
        strength: 'Keep the front side stable while the hips initiate rotation.',
        watch: 'Lead with the belt buckle and delay the chest slightly.',
        priority: 'Use step-behind separation throws and medicine-ball shotputs.',
      },
    ),
    finding(
      'base',
      'Base width',
      metrics.baseWidthPct,
      '% frame',
      { idealMin: 9, idealMax: 22, watchMin: 5, watchMax: 30 },
      {
        strength: 'The base is wide enough to transfer force without restricting rotation.',
        watch: 'The base can support the throw but may lose consistency by concept.',
        priority: 'The base is too narrow for control or too wide for efficient rotation.',
      },
      {
        strength: 'Maintain the same base width through hitch and reset movements.',
        watch: 'Land under the hips and avoid drifting outside the frame.',
        priority: 'Use mirror drops and freeze-at-plant reps to standardize the base.',
      },
    ),
    finding(
      'stride',
      'Stride-line angle',
      typeof metrics.strideLineAngleDeg === 'number' ? Math.abs(metrics.strideLineAngleDeg) : undefined,
      '°',
      { idealMin: 0, idealMax: 18, watchMin: 0, watchMax: 35 },
      {
        strength: 'The front foot is landing on a direct force-transfer line.',
        watch: 'The stride is slightly open or closed but remains recoverable.',
        priority: 'The stride line is redirecting force away from the target window.',
      },
      {
        strength: 'Keep the toe and knee tracking through the target line.',
        watch: 'Shorten the stride and land through the instep.',
        priority: 'Use target-line tape and controlled reset throws.',
      },
    ),
    finding(
      'release',
      'Arm-slot angle',
      metrics.armSlotAngleDeg,
      '°',
      { idealMin: 35, idealMax: 78, watchMin: 18, watchMax: 88 },
      {
        strength: 'The release slot is repeatable and compatible with the throwing platform.',
        watch: 'The slot is functional but may be compensating for posture or pressure.',
        priority: 'The release slot is extreme enough to reduce consistency or clearance.',
      },
      {
        strength: 'Let the slot emerge from posture rather than forcing it.',
        watch: 'Stack the head over the base before accelerating the arm.',
        priority: 'Use posture-first throws and vary launch points without changing arm order.',
      },
    ),
  ]

  const findings = evaluated.flatMap((item) => item.finding ? [item.finding] : [])
  const scores = evaluated.flatMap((item) => typeof item.score === 'number' ? [item.score] : [])
  const score = scores.length > 0
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : 0
  const completeness = Math.round(scores.length / evaluated.length * 100)

  return {
    score,
    completeness,
    metrics,
    findings,
    strengths: findings.filter((item) => item.severity === 'strength'),
    priorities: findings
      .filter((item) => item.severity === 'priority')
      .sort((a, b) => (a.value ?? 0) - (b.value ?? 0)),
  }
}

export function compareQbMechanics(
  baseline: ThrowAnalysis,
  current: ThrowAnalysis,
): { scoreDelta: number; improved: QbMechanicsCategory[]; regressed: QbMechanicsCategory[] } {
  const before = buildQbMechanicsReport(baseline)
  const after = buildQbMechanicsReport(current)
  const severityRank: Record<QbMechanicsSeverity, number> = { priority: 0, watch: 1, strength: 2 }
  const beforeByCategory = new Map(before.findings.map((item) => [item.category, item]))
  const improved: QbMechanicsCategory[] = []
  const regressed: QbMechanicsCategory[] = []

  for (const item of after.findings) {
    const previous = beforeByCategory.get(item.category)
    if (!previous) continue
    const delta = severityRank[item.severity] - severityRank[previous.severity]
    if (delta > 0) improved.push(item.category)
    if (delta < 0) regressed.push(item.category)
  }

  return { scoreDelta: after.score - before.score, improved, regressed }
}
