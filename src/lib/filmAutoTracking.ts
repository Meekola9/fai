import type { FilmAnnotationPoint } from '../types'

export interface GrayFrame {
  width: number
  height: number
  pixels: Uint8Array
}

export interface PlayerTemplate {
  width: number
  height: number
  pixels: Uint8Array
  mean: number
  variance: number
}

export interface AutoTrackSample {
  point: Pick<FilmAnnotationPoint, 'x' | 'y'>
  confidence: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function templateStats(pixels: Uint8Array): Pick<PlayerTemplate, 'mean' | 'variance'> {
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

function patchAt(
  frame: GrayFrame,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): Uint8Array {
  const halfW = Math.floor(width / 2)
  const halfH = Math.floor(height / 2)
  const left = clamp(Math.round(centerX) - halfW, 0, Math.max(0, frame.width - width))
  const top = clamp(Math.round(centerY) - halfH, 0, Math.max(0, frame.height - height))
  const patch = new Uint8Array(width * height)
  let target = 0
  for (let y = 0; y < height; y += 1) {
    const offset = (top + y) * frame.width + left
    for (let x = 0; x < width; x += 1) patch[target++] = frame.pixels[offset + x]
  }
  return patch
}

export function extractPlayerTemplate(
  frame: GrayFrame,
  point: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  width = 18,
  height = 28,
): PlayerTemplate | undefined {
  if (frame.width < width || frame.height < height) return undefined
  const pixels = patchAt(frame, point.x * (frame.width - 1), point.y * (frame.height - 1), width, height)
  return { width, height, pixels, ...templateStats(pixels) }
}

function correlationAt(
  frame: GrayFrame,
  template: PlayerTemplate,
  centerX: number,
  centerY: number,
): number {
  const halfW = Math.floor(template.width / 2)
  const halfH = Math.floor(template.height / 2)
  const left = Math.round(centerX) - halfW
  const top = Math.round(centerY) - halfH
  if (left < 0 || top < 0 || left + template.width > frame.width || top + template.height > frame.height) return -1

  let sum = 0
  let sumSq = 0
  let cross = 0
  let index = 0
  for (let y = 0; y < template.height; y += 1) {
    const offset = (top + y) * frame.width + left
    for (let x = 0; x < template.width; x += 1) {
      const value = frame.pixels[offset + x]
      sum += value
      sumSq += value * value
      cross += value * template.pixels[index++]
    }
  }
  const count = template.pixels.length
  const candidateVariance = Math.max(1, sumSq - (sum * sum) / count)
  const numerator = cross - sum * template.mean
  return clamp(numerator / Math.sqrt(candidateVariance * template.variance), -1, 1)
}

export function matchPlayerTemplate(
  frame: GrayFrame,
  template: PlayerTemplate,
  previous: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  searchRadius = 34,
): AutoTrackSample | undefined {
  const previousX = previous.x * (frame.width - 1)
  const previousY = previous.y * (frame.height - 1)
  const halfW = Math.floor(template.width / 2)
  const halfH = Math.floor(template.height / 2)
  const minX = Math.max(halfW, Math.round(previousX - searchRadius))
  const maxX = Math.min(frame.width - halfW - 1, Math.round(previousX + searchRadius))
  const minY = Math.max(halfH, Math.round(previousY - searchRadius))
  const maxY = Math.min(frame.height - halfH - 1, Math.round(previousY + searchRadius))
  if (minX > maxX || minY > maxY) return undefined

  let bestScore = -1
  let secondScore = -1
  let bestX = previousX
  let bestY = previousY

  const consider = (x: number, y: number) => {
    const score = correlationAt(frame, template, x, y)
    if (score > bestScore) {
      secondScore = bestScore
      bestScore = score
      bestX = x
      bestY = y
    } else if (score > secondScore) {
      secondScore = score
    }
  }

  for (let y = minY; y <= maxY; y += 2) {
    for (let x = minX; x <= maxX; x += 2) consider(x, y)
  }
  const coarseX = bestX
  const coarseY = bestY
  for (let y = Math.max(minY, coarseY - 2); y <= Math.min(maxY, coarseY + 2); y += 1) {
    for (let x = Math.max(minX, coarseX - 2); x <= Math.min(maxX, coarseX + 2); x += 1) consider(x, y)
  }

  const correlationConfidence = clamp((bestScore + 1) / 2, 0, 1)
  const separation = clamp((bestScore - secondScore) * 3, 0, 1)
  const confidence = clamp(correlationConfidence * (0.82 + separation * 0.18), 0, 1)
  return {
    point: {
      x: clamp(bestX / Math.max(1, frame.width - 1), 0, 1),
      y: clamp(bestY / Math.max(1, frame.height - 1), 0, 1),
    },
    confidence,
  }
}

function blendTemplate(
  template: PlayerTemplate,
  frame: GrayFrame,
  point: Pick<FilmAnnotationPoint, 'x' | 'y'>,
  amount = 0.08,
): PlayerTemplate {
  const current = patchAt(
    frame,
    point.x * (frame.width - 1),
    point.y * (frame.height - 1),
    template.width,
    template.height,
  )
  const pixels = new Uint8Array(template.pixels.length)
  for (let index = 0; index < pixels.length; index += 1) {
    pixels[index] = Math.round(template.pixels[index] * (1 - amount) + current[index] * amount)
  }
  return { ...template, pixels, ...templateStats(pixels) }
}

/**
 * Lightweight browser tracker for uploaded clips and screen capture. It tracks
 * only one selected player at a time, using a local visual template and a
 * bounded search around the last confirmed location.
 */
export class BrowserPlayerAutoTracker {
  private readonly canvas = document.createElement('canvas')
  private readonly context = this.canvas.getContext('2d', { willReadFrequently: true })
  private readonly video: HTMLVideoElement
  private readonly processingWidth: number
  private template?: PlayerTemplate
  private lastPoint?: Pick<FilmAnnotationPoint, 'x' | 'y'>

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
    this.lastPoint = { x: point.x, y: point.y }
    return true
  }

  trackCurrentFrame(): AutoTrackSample | undefined {
    if (!this.template || !this.lastPoint) return undefined
    const frame = this.captureFrame()
    if (!frame) return undefined
    const match = matchPlayerTemplate(frame, this.template, this.lastPoint)
    if (!match) return undefined
    this.lastPoint = match.point
    if (match.confidence >= 0.72) this.template = blendTemplate(this.template, frame, match.point)
    return match
  }
}
