import type { FilmAnnotationPoint } from '../types'

export interface AutoFollowObservation {
  point: Pick<FilmAnnotationPoint, 'x' | 'y'>
  confidence: number
  cameraConfidence: number
  blurLevel: number
}

export interface AutoFollowState {
  lockedTrackId: string
  acceptedPoint: Pick<FilmAnnotationPoint, 'x' | 'y'>
  velocity: Pick<FilmAnnotationPoint, 'x' | 'y'>
  lowConfidenceFrames: number
  recoveryLevel: 0 | 1 | 2
}

export interface AutoFollowDecision {
  action: 'accept' | 'recover' | 'pause-for-correction'
  state: AutoFollowState
  predictedPoint: Pick<FilmAnnotationPoint, 'x' | 'y'>
  searchRadiusPx: number
  reason?: string
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function predictAutoFollowPoint(state: AutoFollowState): Pick<FilmAnnotationPoint, 'x' | 'y'> {
  return {
    x: clamp(state.acceptedPoint.x + state.velocity.x, 0, 1),
    y: clamp(state.acceptedPoint.y + state.velocity.y, 0, 1),
  }
}

export function decideAutoFollow(
  state: AutoFollowState,
  observation: AutoFollowObservation | undefined,
  frameWidth: number,
): AutoFollowDecision {
  const predictedPoint = predictAutoFollowPoint(state)
  const width = Math.max(160, frameWidth)

  if (!observation) {
    const nextLevel = Math.min(2, state.recoveryLevel + 1) as 0 | 1 | 2
    if (state.lowConfidenceFrames >= 5 || nextLevel === 2) {
      return {
        action: 'pause-for-correction',
        predictedPoint,
        searchRadiusPx: Math.round(width * 0.18),
        reason: 'No reliable match remained for the locked athlete.',
        state: { ...state, lowConfidenceFrames: state.lowConfidenceFrames + 1, recoveryLevel: nextLevel },
      }
    }
    return {
      action: 'recover',
      predictedPoint,
      searchRadiusPx: Math.round(width * (nextLevel === 1 ? 0.11 : 0.18)),
      state: { ...state, lowConfidenceFrames: state.lowConfidenceFrames + 1, recoveryLevel: nextLevel },
    }
  }

  const threshold = observation.blurLevel >= 0.55 ? 0.42 : 0.52
  const displacement = Math.hypot(
    observation.point.x - predictedPoint.x,
    observation.point.y - predictedPoint.y,
  )
  const maxDisplacement = observation.cameraConfidence >= 0.3 ? 0.16 : 0.11
  const reliable = observation.confidence >= threshold && displacement <= maxDisplacement

  if (!reliable) {
    const lowConfidenceFrames = state.lowConfidenceFrames + 1
    const recoveryLevel = Math.min(2, state.recoveryLevel + 1) as 0 | 1 | 2
    if (lowConfidenceFrames >= (observation.blurLevel >= 0.55 ? 7 : 4) || recoveryLevel === 2) {
      return {
        action: 'pause-for-correction',
        predictedPoint,
        searchRadiusPx: Math.round(width * 0.18),
        reason: displacement > maxDisplacement
          ? 'The best match moved outside the locked athlete motion envelope.'
          : 'Tracking confidence remained below the identity-lock threshold.',
        state: { ...state, lowConfidenceFrames, recoveryLevel },
      }
    }
    return {
      action: 'recover',
      predictedPoint,
      searchRadiusPx: Math.round(width * (recoveryLevel === 1 ? 0.11 : 0.18)),
      state: { ...state, lowConfidenceFrames, recoveryLevel },
    }
  }

  const measuredVelocity = {
    x: observation.point.x - state.acceptedPoint.x,
    y: observation.point.y - state.acceptedPoint.y,
  }
  return {
    action: 'accept',
    predictedPoint: observation.point,
    searchRadiusPx: Math.round(width * 0.07),
    state: {
      ...state,
      acceptedPoint: observation.point,
      velocity: {
        x: state.velocity.x * 0.55 + measuredVelocity.x * 0.45,
        y: state.velocity.y * 0.55 + measuredVelocity.y * 0.45,
      },
      lowConfidenceFrames: 0,
      recoveryLevel: 0,
    },
  }
}
