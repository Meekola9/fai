import type {
  FilmAnnotation,
  FilmAnnotationPoint,
  PlayCall,
  ThrowAnalysis,
  ThrowFamily,
  ThrowLandmark,
} from '../types'

export const THROW_ANALYSIS_LABEL = 'QB Throw Analysis'
export const YARDS_PER_SECOND_TO_MPH = 2.0454545455

export const THROW_FAMILIES: Array<{ key: ThrowFamily; label: string }> = [
  { key: 'screen', label: 'Screen' },
  { key: 'quick-game', label: 'Quick game' },
  { key: 'rpo', label: 'RPO' },
  { key: 'dropback', label: 'Dropback' },
  { key: 'play-action', label: 'Play action' },
  { key: 'rollout', label: 'Rollout' },
  { key: 'sprint-out', label: 'Sprint out' },
  { key: 'boot', label: 'Boot' },
  { key: 'deep-shot', label: 'Deep shot' },
  { key: 'throwaway', label: 'Throwaway' },
  { key: 'other', label: 'Other' },
]

export const THROW_LANDMARKS: Array<{ key: ThrowLandmark; label: string; short: string }> = [
  { key: 'throwingShoulder', label: 'Throwing shoulder', short: 'TS' },
  { key: 'throwingElbow', label: 'Throwing elbow', short: 'TE' },
  { key: 'throwingWrist', label: 'Throwing wrist / ball', short: 'TW' },
  { key: 'frontShoulder', label: 'Front shoulder', short: 'FS' },
  { key: 'throwingHip', label: 'Throwing-side hip', short: 'TH' },
  { key: 'frontHip', label: 'Front hip', short: 'FH' },
  { key: 'backFoot', label: 'Back foot', short: 'BF' },
  { key: 'frontFoot', label: 'Front foot', short: 'FF' },
]

export interface ThrowMetrics {
  timeToThrowSec?: number
  plantToReleaseSec?: number
  flightTimeSec?: number
  averageBallSpeedMph?: number
  elbowAngleDeg?: number
  armSlotAngleDeg?: number
  shoulderHipSeparationDeg?: number
  baseWidthPct?: number
  strideLineAngleDeg?: number
  timingWarning?: string
}

function positiveDifference(end?: number, start?: number): number | undefined {
  if (typeof end !== 'number' || typeof start !== 'number') return undefined
  const value = end - start
  return value > 0 ? value : undefined
}

function angleAt(
  a?: FilmAnnotationPoint,
  vertex?: FilmAnnotationPoint,
  c?: FilmAnnotationPoint,
): number | undefined {
  if (!a || !vertex || !c) return undefined
  const ax = a.x - vertex.x
  const ay = a.y - vertex.y
  const cx = c.x - vertex.x
  const cy = c.y - vertex.y
  const aLength = Math.hypot(ax, ay)
  const cLength = Math.hypot(cx, cy)
  if (aLength < 1e-6 || cLength < 1e-6) return undefined
  const cosine = Math.max(-1, Math.min(1, (ax * cx + ay * cy) / (aLength * cLength)))
  return Math.acos(cosine) * 180 / Math.PI
}

function lineAngle(a?: FilmAnnotationPoint, b?: FilmAnnotationPoint): number | undefined {
  if (!a || !b) return undefined
  if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-6) return undefined
  return Math.atan2(-(b.y - a.y), b.x - a.x) * 180 / Math.PI
}

function undirectedAngleDifference(a?: number, b?: number): number | undefined {
  if (typeof a !== 'number' || typeof b !== 'number') return undefined
  let difference = Math.abs(a - b) % 180
  if (difference > 90) difference = 180 - difference
  return difference
}

export function computeThrowMetrics(analysis: ThrowAnalysis): ThrowMetrics {
  const timeToThrowSec = positiveDifference(analysis.releaseTimeSec, analysis.snapTimeSec)
  const plantToReleaseSec = positiveDifference(analysis.releaseTimeSec, analysis.plantTimeSec)
  const flightTimeSec = positiveDifference(analysis.arrivalTimeSec, analysis.releaseTimeSec)
  const averageBallSpeedMph =
    flightTimeSec && typeof analysis.throwDistanceYards === 'number' && analysis.throwDistanceYards > 0
      ? analysis.throwDistanceYards / flightTimeSec * YARDS_PER_SECOND_TO_MPH
      : undefined

  const landmarks = analysis.landmarks ?? {}
  const elbowAngleDeg = angleAt(
    landmarks.throwingShoulder,
    landmarks.throwingElbow,
    landmarks.throwingWrist,
  )
  const armLine = lineAngle(landmarks.throwingShoulder, landmarks.throwingWrist)
  const armSlotAngleDeg = typeof armLine === 'number'
    ? Math.min(90, Math.abs(((armLine % 180) + 180) % 180 > 90
      ? 180 - (((armLine % 180) + 180) % 180)
      : ((armLine % 180) + 180) % 180))
    : undefined
  const shoulderAngle = lineAngle(landmarks.throwingShoulder, landmarks.frontShoulder)
  const hipAngle = lineAngle(landmarks.throwingHip, landmarks.frontHip)
  const shoulderHipSeparationDeg = undirectedAngleDifference(shoulderAngle, hipAngle)
  const baseWidthPct = landmarks.backFoot && landmarks.frontFoot
    ? Math.abs(landmarks.frontFoot.x - landmarks.backFoot.x) * 100
    : undefined
  const strideLineAngleDeg = lineAngle(landmarks.backFoot, landmarks.frontFoot)

  let timingWarning: string | undefined
  const sequence = [
    analysis.snapTimeSec,
    analysis.plantTimeSec,
    analysis.releaseTimeSec,
    analysis.arrivalTimeSec,
  ].filter((value): value is number => typeof value === 'number')
  if (sequence.some((value, index) => index > 0 && value < sequence[index - 1])) {
    timingWarning = 'Timeline markers are out of order. Expected snap → plant → release → arrival.'
  }

  return {
    timeToThrowSec,
    plantToReleaseSec,
    flightTimeSec,
    averageBallSpeedMph,
    elbowAngleDeg,
    armSlotAngleDeg,
    shoulderHipSeparationDeg,
    baseWidthPct,
    strideLineAngleDeg,
    timingWarning,
  }
}

export function suggestThrowFamily(analysis: ThrowAnalysis, call?: PlayCall): ThrowFamily {
  if (call === 'screen') return 'screen'
  if (call === 'rpo') return 'rpo'
  if (analysis.trajectory === 'throwaway') return 'throwaway'
  if (analysis.platform === 'moving-left' || analysis.platform === 'moving-right') return 'rollout'
  const metrics = computeThrowMetrics(analysis)
  if ((analysis.throwDistanceYards ?? 0) >= 25 && (metrics.timeToThrowSec ?? 0) >= 2.4) return 'deep-shot'
  if ((metrics.timeToThrowSec ?? Number.POSITIVE_INFINITY) <= 1.8) return 'quick-game'
  return 'dropback'
}

export function isThrowAnalysisAnnotation(annotation: FilmAnnotation): boolean {
  return Boolean(annotation.throwAnalysis)
}

export function throwAnalysisAnnotation(annotations: readonly FilmAnnotation[]): FilmAnnotation | undefined {
  return annotations.find(isThrowAnalysisAnnotation)
}

export function upsertThrowAnalysis(
  annotations: readonly FilmAnnotation[],
  analysis: ThrowAnalysis,
): FilmAnnotation[] {
  const current = throwAnalysisAnnotation(annotations)
  const annotation: FilmAnnotation = {
    id: current?.id ?? 'throw-analysis',
    kind: 'arrow',
    label: THROW_ANALYSIS_LABEL,
    color: '#fb923c',
    points: [],
    throwAnalysis: analysis,
  }
  return current
    ? annotations.map((item) => item.id === current.id ? annotation : item)
    : [...annotations, annotation]
}

export function removeThrowAnalysis(annotations: readonly FilmAnnotation[]): FilmAnnotation[] {
  return annotations.filter((annotation) => !isThrowAnalysisAnnotation(annotation))
}
