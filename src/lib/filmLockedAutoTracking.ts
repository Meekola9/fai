import type { FilmAnnotationPoint } from '../types'
import {
  compensatePointForCamera,
  estimateFrameSharpness,
  estimateGlobalTransform,
  extractPlayerTemplate,
  matchPlayerTemplate,
  relativeBlurLevel,
  rgbaToGray,
  type AutoTrackSample,
  type GrayFrame,
  type PlayerTemplate,
} from './filmAutoTracking'
import {
  decideAutoFollow,
  predictAutoFollowPoint,
  type AutoFollowDecision,
  type AutoFollowState,
} from './filmAutoFollowPolicy'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export interface LockedAutoTrackResult {
  sample?: AutoTrackSample
  decision: AutoFollowDecision
}

/**
 * Browser tracker that keeps one logical athlete identity locked for the life of
 * the tracker. It predicts player motion, expands the search only when needed,
 * and refuses to adopt a distant crossing-player match.
 */
export class LockedBrowserPlayerAutoTracker {
  private readonly canvas = document.createElement('canvas')
  private readonly context = this.canvas.getContext('2d', { willReadFrequently: true })
  private readonly video: HTMLVideoElement
  private readonly processingWidth: number
  private template?: PlayerTemplate
  private previousFrame?: GrayFrame
  private currentScale = 1
  private referenceSharpness = 0
  private state?: AutoFollowState

  constructor(video: HTMLVideoElement, processingWidth = 360) {
    this.video = video
    this.processingWidth = processingWidth
  }

  private captureFrame(): GrayFrame | undefined {
    const sourceWidth = this.video.videoWidth || this.video.clientWidth
    const sourceHeight = this.video.videoHeight || this.video.clientHeight
    if (!this.context || sourceWidth <= 0 || sourceHeight <= 0 || this.video.readyState < 2) return undefined
    const width = Math.max(160, Math.min(this.processingWidth, sourceWidth))
    const height = Math.max(90, Math.round(width * sourceHeight / sourceWidth))
    this.canvas.width = width
    this.canvas.height = height
    try {
      this.context.drawImage(this.video, 0, 0, width, height)
      const image = this.context.getImageData(0, 0, width, height)
      return rgbaToGray(image.data, width, height)
    } catch {
      return undefined
    }
  }

  initialize(trackId: string, point: Pick<FilmAnnotationPoint, 'x' | 'y'>): boolean {
    const frame = this.captureFrame()
    if (!frame) return false
    const template = extractPlayerTemplate(frame, point)
    if (!template) return false
    this.template = template
    this.previousFrame = frame
    this.currentScale = 1
    this.referenceSharpness = estimateFrameSharpness(frame)
    this.state = {
      lockedTrackId: trackId,
      acceptedPoint: { x: point.x, y: point.y },
      velocity: { x: 0, y: 0 },
      lowConfidenceFrames: 0,
      recoveryLevel: 0,
    }
    return true
  }

  get lockedTrackId(): string | undefined {
    return this.state?.lockedTrackId
  }

  get acceptedPoint(): Pick<FilmAnnotationPoint, 'x' | 'y'> | undefined {
    return this.state?.acceptedPoint
  }

  trackCurrentFrame(): LockedAutoTrackResult | undefined {
    if (!this.template || !this.state) return undefined
    const frame = this.captureFrame()
    if (!frame) return undefined

    const estimatedCamera = this.previousFrame
      ? estimateGlobalTransform(this.previousFrame, frame, this.state.acceptedPoint)
      : { dx: 0, dy: 0, scale: 1, confidence: 0 }
    const camera = estimatedCamera.confidence >= 0.18
      ? estimatedCamera
      : { dx: 0, dy: 0, scale: 1, confidence: estimatedCamera.confidence }

    const motionPrediction = predictAutoFollowPoint(this.state)
    const predictedPoint = compensatePointForCamera(motionPrediction, camera)
    const predictedScale = clamp(this.currentScale * camera.scale, 0.62, 1.7)
    const sharpness = estimateFrameSharpness(frame)
    const blurLevel = relativeBlurLevel(sharpness, this.referenceSharpness)

    const baseDecision = decideAutoFollow(this.state, undefined, frame.width)
    const normalRadius = Math.round(clamp(
      16 + Math.hypot(camera.dx * frame.width, camera.dy * frame.height) * 0.45 + blurLevel * 12,
      16,
      48,
    ))
    const searchRadius = this.state.recoveryLevel > 0
      ? baseDecision.searchRadiusPx
      : normalRadius

    const match = matchPlayerTemplate(frame, this.template, predictedPoint, searchRadius, {
      initialScale: predictedScale,
      blurLevel,
    })
    const decision = decideAutoFollow(
      this.state,
      match ? {
        point: match.point,
        confidence: match.confidence,
        cameraConfidence: camera.confidence,
        blurLevel,
      } : undefined,
      frame.width,
    )
    this.previousFrame = frame
    this.state = decision.state

    if (decision.action !== 'accept' || !match) return { decision }

    this.currentScale = match.playerScale
    if (blurLevel < 0.32 && sharpness > 0) {
      this.referenceSharpness = this.referenceSharpness > 0
        ? this.referenceSharpness * 0.96 + sharpness * 0.04
        : sharpness
    }

    return {
      decision,
      sample: {
        ...match,
        camera,
        blurLevel,
        compensated: camera.confidence >= 0.25 && (
          Math.hypot(camera.dx, camera.dy) > 0.003
          || Math.abs(camera.scale - 1) > 0.006
        ),
      },
    }
  }
}
