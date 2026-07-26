import type { FilmAnnotationPoint } from '../types'

export interface GrayFrame {
  width: number
  height: number
  pixels: Uint8Array
}

interface PixelStats {
  mean: number
  variance: number
}

export interface PlayerTemplate {
  width: number
  height: number
  pixels: Uint8Array
  blurredPixels: Uint8Array
  mean: number
  variance: number
  blurredMean: number
  blurredVariance: number
}

export interface CameraMotionEstimate {
  /** Whole-frame horizontal movement, normalized to frame width. */
  dx: number
  /** Whole-frame vertical movement, normalized to frame height. */
  dy: number
  /** Per-frame camera zoom ratio around the frame center. */
  scale: number
  confidence: number
}

export interface PlayerMatch {
  point: Pick<FilmAnnotationPoint, 'x' | 'y'>
  confidence: number
  playerScale: number
}

export interface AutoTrackSample extends PlayerMatch {
  camera: CameraMotionEstimate
  blurLevel: number
  compensated: boolean
}

export interface PlayerMatchOptions {
  initialScale?: number
  blurLevel?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function statsFor(pixels: Uint8Array): PixelStats {
  let sum = 0
  let sumSq = 0
  for (const value of pixels) {
    sum += value
    sumSq += value * value
  }
  const mean = pixels.length > 0 ? sum / pixels.length : 0
  return {
    mean,
    variance: Math.max(1, sumSq - pixels.length * mean * mean),
  }
}

function sampleGray(frame: GrayFrame, x: number, y: number): number {
  const left = clamp(Math.floor(x), 0, frame.width - 1)
  const top = clamp(Math.floor(y), 0, frame.height - 1)
  const right = Math.min(frame.width - 1, left + 1)
  const bottom = Math.min(frame.height - 1, top + 1)
  const fx = clamp(x - left, 0, 1)
  const fy = clamp(y - top, 0, 1)
  const topValue = frame.pixels[top * frame.width + left] * (1 - fx)
    + frame.pixels[top * frame.width + right] * fx
  const bottomValue = frame.pixels[bottom * frame.width + left] * (1 - fx)
    + frame.pixels[bottom * frame.width + right] * fx
  return topValue * (1 - fy) + bottomValue * fy
}

function blurPixels(pixels: Uint8Array, width: number, height: number): Uint8Array {
  const blurred = new Uint8Array(pixels.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      let count = 0
      for (let oy = -1; oy <= 1; oy += 1) {
        const py = clamp(y + oy, 0, height - 1)
        for (let ox = -1; ox <= 1; ox += 1) {
          const px = clamp(x + ox, 0, width - 1)
          sum += pixels[py * width + px]
          count += 1
        }
      }
      blurred[y * width + x] = Math.round(sum / count)
    }
  }
  return blurred
}

function blurredFrame(frame: GrayFrame): GrayFrame {
  return { ...frame, pixels: blurPixels(frame.pixels, frame.width, frame.height) }
}

export function rgbaToGray(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): GrayFrame {
  const pixels = new Uint8Array(width * height)
  for (let source = 0, target = 0; source < data.length; source += 4, target += 1) {
    pixels[target] = Math.round(data[source] * 0.299 + data[source + 1] * 0.587 + data[source + 2] * 0.114)
  }
  return { width, height, pixels }
}

function resampledPatch(
  frame: GrayFrame,
  centerX: number,
  centerY: number,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): Uint8Array | undefined {
  const left = centerX - sourceWidth / 2
  const top = centerY - sourceHeight / 2
  if (
    left < 0
    || top < 0
    || left + sourceWidth >= frame.width
    || top + sourceHeight >= frame.height
  ) return undefined

  const patch = new Uint8Array(targetWidth * targetHeight)
  let index = 0
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = top + ((y + 0.5) / targetHeight) * sourceHeight - 0.5
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = left + ((x + 0.5) / targetWidth) * sourceWidth - 0.5
      patch[index++] = Math.round(sampleGray(frame, sourceX, sourceY))
    }
  }
  return patch
}

function templateFromPixels(width: number, height: number, pixels: Uint8Array): PlayerTemplate {
  const blurredPixels = blurPixels(pixels, width, height)
  const rawStats = statsFor(pixels)
  const blurStats = statsFor(blurredPixels)
  return {
    width,
    height,
    pixels,
    blurredPixels,
    mean: rawStats.mean,
    variance: rawStats.variance,
    blurredMean: blurStats.mean,
    blurredVariance: blurStats.variance,
  }
}

export function extractPlayerTemplate(
  frame: GrayFrame,
  point: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  width = 18,
  height = 28,
): PlayerTemplate | undefined {
  if (frame.width < width + 2 || frame.height < height + 2) return undefined
  const pixels = resampledPatch(
    frame,
    point.x * (frame.width - 1),
    point.y * (frame.height - 1),
    width,
    height,
    width,
    height,
  )
  return pixels ? templateFromPixels(width, height, pixels) : undefined
}

function normalizedCorrelation(
  candidate: Uint8Array,
  reference: Uint8Array,
  referenceMean: number,
  referenceVariance: number,
): number {
  let sum = 0
  let sumSq = 0
  let cross = 0
  for (let index = 0; index < candidate.length; index += 1) {
    const value = candidate[index]
    sum += value
    sumSq += value * value
    cross += value * reference[index]
  }
  const count = candidate.length
  const candidateVariance = Math.max(1, sumSq - (sum * sum) / count)
  const numerator = cross - sum * referenceMean
  return clamp(numerator / Math.sqrt(candidateVariance * referenceVariance), -1, 1)
}

function correlationAt(
  frame: GrayFrame,
  softFrame: GrayFrame,
  template: PlayerTemplate,
  centerX: number,
  centerY: number,
  playerScale: number,
  blurLevel: number,
): number {
  const sourceWidth = template.width * playerScale
  const sourceHeight = template.height * playerScale
  const rawCandidate = resampledPatch(
    frame,
    centerX,
    centerY,
    sourceWidth,
    sourceHeight,
    template.width,
    template.height,
  )
  if (!rawCandidate) return -1
  const softCandidate = resampledPatch(
    softFrame,
    centerX,
    centerY,
    sourceWidth,
    sourceHeight,
    template.width,
    template.height,
  )
  if (!softCandidate) return -1

  const raw = normalizedCorrelation(rawCandidate, template.pixels, template.mean, template.variance)
  const soft = normalizedCorrelation(
    softCandidate,
    template.blurredPixels,
    template.blurredMean,
    template.blurredVariance,
  )
  const softWeight = clamp(0.16 + blurLevel * 0.7, 0.16, 0.82)
  return raw * (1 - softWeight) + soft * softWeight
}

function uniqueScales(initialScale: number, factors: number[]): number[] {
  return [...new Set(factors.map((factor) => Math.round(clamp(initialScale * factor, 0.62, 1.7) * 1000) / 1000))]
}

export function matchPlayerTemplate(
  frame: GrayFrame,
  template: PlayerTemplate,
  previous: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  searchRadius = 34,
  options: PlayerMatchOptions = {},
): PlayerMatch | undefined {
  const previousX = previous.x * (frame.width - 1)
  const previousY = previous.y * (frame.height - 1)
  const initialScale = clamp(options.initialScale ?? 1, 0.62, 1.7)
  const blurLevel = clamp(options.blurLevel ?? 0, 0, 1)
  const softFrame = blurredFrame(frame)
  const coarseScales = uniqueScales(initialScale, [0.9, 1, 1.1])
  const maxScale = Math.max(...coarseScales)
  const halfW = Math.ceil(template.width * maxScale / 2) + 1
  const halfH = Math.ceil(template.height * maxScale / 2) + 1
  const minX = Math.max(halfW, Math.round(previousX - searchRadius))
  const maxX = Math.min(frame.width - halfW - 1, Math.round(previousX + searchRadius))
  const minY = Math.max(halfH, Math.round(previousY - searchRadius))
  const maxY = Math.min(frame.height - halfH - 1, Math.round(previousY + searchRadius))
  if (minX > maxX || minY > maxY) return undefined

  let bestScore = -1
  let secondScore = -1
  let bestX = previousX
  let bestY = previousY
  let bestScale = initialScale

  const consider = (x: number, y: number, scale: number) => {
    const score = correlationAt(frame, softFrame, template, x, y, scale, blurLevel)
    if (score > bestScore) {
      secondScore = bestScore
      bestScore = score
      bestX = x
      bestY = y
      bestScale = scale
    } else if (score > secondScore) {
      secondScore = score
    }
  }

  const spatialStep = blurLevel > 0.58 ? 3 : 4
  for (const scale of coarseScales) {
    for (let y = minY; y <= maxY; y += spatialStep) {
      for (let x = minX; x <= maxX; x += spatialStep) consider(x, y, scale)
    }
  }

  const refineScales = uniqueScales(bestScale, [0.96, 1, 1.04])
  const coarseX = bestX
  const coarseY = bestY
  for (const scale of refineScales) {
    for (let y = Math.max(minY, coarseY - 3); y <= Math.min(maxY, coarseY + 3); y += 1) {
      for (let x = Math.max(minX, coarseX - 3); x <= Math.min(maxX, coarseX + 3); x += 1) {
        consider(x, y, scale)
      }
    }
  }

  if (bestScore < -0.25) return undefined
  const correlationConfidence = clamp((bestScore + 1) / 2, 0, 1)
  const separation = clamp((bestScore - secondScore) * 2.5, 0, 1)
  const blurPenalty = 1 - blurLevel * 0.08
  const confidence = clamp(correlationConfidence * (0.9 + separation * 0.1) * blurPenalty, 0, 1)
  return {
    point: {
      x: clamp(bestX / Math.max(1, frame.width - 1), 0, 1),
      y: clamp(bestY / Math.max(1, frame.height - 1), 0, 1),
    },
    confidence,
    playerScale: bestScale,
  }
}

function gradientAt(frame: GrayFrame, x: number, y: number): number {
  const gx = Math.abs(sampleGray(frame, x + 1, y) - sampleGray(frame, x - 1, y))
  const gy = Math.abs(sampleGray(frame, x, y + 1) - sampleGray(frame, x, y - 1))
  return gx + gy
}

export function estimateFrameSharpness(frame: GrayFrame): number {
  let total = 0
  let count = 0
  for (let y = 3; y < frame.height - 3; y += 4) {
    for (let x = 3; x < frame.width - 3; x += 4) {
      total += gradientAt(frame, x, y)
      count += 1
    }
  }
  return count > 0 ? total / count : 0
}

export function relativeBlurLevel(currentSharpness: number, referenceSharpness: number): number {
  if (referenceSharpness <= 0) return 0
  const relativeLoss = 1 - currentSharpness / referenceSharpness
  return clamp(relativeLoss, 0, 1)
}

interface TransformCandidate {
  dxPx: number
  dyPx: number
  scale: number
  score: number
}

function transformScore(
  previous: GrayFrame,
  current: GrayFrame,
  dxPx: number,
  dyPx: number,
  scale: number,
  excludePoint?: Pick<FilmAnnotationPoint, 'x' | 'y'>,
): number {
  const centerX = (previous.width - 1) / 2
  const centerY = (previous.height - 1) / 2
  let total = 0
  let samples = 0
  const step = Math.max(9, Math.round(previous.width / 28))

  for (let y = step; y < previous.height - step; y += step) {
    for (let x = step; x < previous.width - step; x += step) {
      if (excludePoint) {
        const nx = x / Math.max(1, previous.width - 1)
        const ny = y / Math.max(1, previous.height - 1)
        if (Math.abs(nx - excludePoint.x) < 0.14 && Math.abs(ny - excludePoint.y) < 0.2) continue
      }
      const previousGradient = gradientAt(previous, x, y)
      if (previousGradient < 9) continue
      const targetX = centerX + (x - centerX) * scale + dxPx
      const targetY = centerY + (y - centerY) * scale + dyPx
      if (targetX < 2 || targetY < 2 || targetX >= current.width - 2 || targetY >= current.height - 2) continue
      const currentGradient = gradientAt(current, targetX, targetY)
      const intensityDifference = Math.abs(sampleGray(previous, x, y) - sampleGray(current, targetX, targetY))
      total += Math.abs(previousGradient - currentGradient) + intensityDifference * 0.22
      samples += 1
    }
  }
  return samples >= 16 ? total / samples : Number.POSITIVE_INFINITY
}

export function estimateGlobalTransform(
  previous: GrayFrame,
  current: GrayFrame,
  excludePoint?: Pick<FilmAnnotationPoint, 'x' | 'y'>,
): CameraMotionEstimate {
  if (previous.width !== current.width || previous.height !== current.height) {
    return { dx: 0, dy: 0, scale: 1, confidence: 0 }
  }

  let best: TransformCandidate = { dxPx: 0, dyPx: 0, scale: 1, score: Number.POSITIVE_INFINITY }
  let secondScore = Number.POSITIVE_INFINITY
  const consider = (dxPx: number, dyPx: number, scale: number) => {
    const score = transformScore(previous, current, dxPx, dyPx, scale, excludePoint)
    if (score < best.score) {
      secondScore = best.score
      best = { dxPx, dyPx, scale, score }
    } else if (score < secondScore) {
      secondScore = score
    }
  }

  for (const scale of [0.97, 1, 1.03]) {
    for (let dy = -24; dy <= 24; dy += 8) {
      for (let dx = -24; dx <= 24; dx += 8) consider(dx, dy, scale)
    }
  }

  const coarse = best
  for (const scale of [coarse.scale - 0.012, coarse.scale, coarse.scale + 0.012]) {
    for (let dy = coarse.dyPx - 4; dy <= coarse.dyPx + 4; dy += 2) {
      for (let dx = coarse.dxPx - 4; dx <= coarse.dxPx + 4; dx += 2) consider(dx, dy, scale)
    }
  }

  if (!Number.isFinite(best.score)) return { dx: 0, dy: 0, scale: 1, confidence: 0 }
  const quality = clamp(1 - best.score / 115, 0, 1)
  const separation = Number.isFinite(secondScore)
    ? clamp((secondScore - best.score) / Math.max(1, secondScore) * 8, 0, 1)
    : 0
  const confidence = clamp(quality * 0.78 + separation * 0.22, 0, 1)
  return {
    dx: best.dxPx / Math.max(1, current.width - 1),
    dy: best.dyPx / Math.max(1, current.height - 1),
    scale: clamp(best.scale, 0.93, 1.07),
    confidence,
  }
}

export function compensatePointForCamera(
  point: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  motion: CameraMotionEstimate,
): Pick<FilmAnnotationPoint, 'x' | 'y'> {
  return {
    x: clamp(0.5 + (point.x - 0.5) * motion.scale + motion.dx, 0, 1),
    y: clamp(0.5 + (point.y - 0.5) * motion.scale + motion.dy, 0, 1),
  }
}

function blendTemplate(
  template: PlayerTemplate,
  frame: GrayFrame,
  point: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  playerScale: number,
  amount = 0.06,
): PlayerTemplate {
  const current = resampledPatch(
    frame,
    point.x * (frame.width - 1),
    point.y * (frame.height - 1),
    template.width * playerScale,
    template.height * playerScale,
    template.width,
    template.height,
  )
  if (!current) return template
  const pixels = new Uint8Array(template.pixels.length)
  for (let index = 0; index < pixels.length; index += 1) {
    pixels[index] = Math.round(template.pixels[index] * (1 - amount) + current[index] * amount)
  }
  return templateFromPixels(template.width, template.height, pixels)
}

/**
 * One-player browser tracker with whole-frame pan/tilt compensation, adaptive
 * player scale for camera zoom, and blur-tolerant dual-template comparison.
 */
export class BrowserPlayerAutoTracker {
  private readonly canvas = document.createElement('canvas')
  private readonly context = this.canvas.getContext('2d', { willReadFrequently: true })
  private readonly video: HTMLVideoElement
  private readonly processingWidth: number
  private template?: PlayerTemplate
  private previousFrame?: GrayFrame
  private lastPoint?: Pick<FilmAnnotationPoint, 'x' | 'y'>
  private currentScale = 1
  private referenceSharpness = 0

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

  initialize(point: Pick<FilmAnnotationPoint, 'x' | 'y'>): boolean {
    const frame = this.captureFrame()
    if (!frame) return false
    const template = extractPlayerTemplate(frame, point)
    if (!template) return false
    this.template = template
    this.previousFrame = frame
    this.lastPoint = { x: point.x, y: point.y }
    this.currentScale = 1
    this.referenceSharpness = estimateFrameSharpness(frame)
    return true
  }

  trackCurrentFrame(): AutoTrackSample | undefined {
    if (!this.template || !this.lastPoint) return undefined
    const frame = this.captureFrame()
    if (!frame) return undefined

    const estimatedCamera = this.previousFrame
      ? estimateGlobalTransform(this.previousFrame, frame, this.lastPoint)
      : { dx: 0, dy: 0, scale: 1, confidence: 0 }
    const camera = estimatedCamera.confidence >= 0.18
      ? estimatedCamera
      : { dx: 0, dy: 0, scale: 1, confidence: estimatedCamera.confidence }
    const predictedPoint = compensatePointForCamera(this.lastPoint, camera)
    const predictedScale = clamp(this.currentScale * camera.scale, 0.62, 1.7)
    const sharpness = estimateFrameSharpness(frame)
    const blurLevel = relativeBlurLevel(sharpness, this.referenceSharpness)
    const cameraShiftPx = Math.hypot(camera.dx * frame.width, camera.dy * frame.height)
    const searchRadius = Math.round(clamp(
      16 + cameraShiftPx * 0.45 + blurLevel * 12 + (camera.confidence < 0.28 ? 10 : 0),
      16,
      48,
    ))
    const match = matchPlayerTemplate(frame, this.template, predictedPoint, searchRadius, {
      initialScale: predictedScale,
      blurLevel,
    })
    this.previousFrame = frame
    if (!match) return undefined

    this.lastPoint = match.point
    this.currentScale = match.playerScale
    if (match.confidence >= 0.72 && blurLevel < 0.48) {
      this.template = blendTemplate(this.template, frame, match.point, match.playerScale)
    }
    if (blurLevel < 0.32 && sharpness > 0) {
      this.referenceSharpness = this.referenceSharpness > 0
        ? this.referenceSharpness * 0.96 + sharpness * 0.04
        : sharpness
    }

    const compensated = camera.confidence >= 0.25 && (
      Math.hypot(camera.dx, camera.dy) > 0.003
      || Math.abs(camera.scale - 1) > 0.006
    )
    return {
      ...match,
      camera,
      blurLevel,
      compensated,
    }
  }
}
