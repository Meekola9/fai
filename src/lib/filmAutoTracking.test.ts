import { describe, expect, it } from 'vitest'
import {
  compensatePointForCamera,
  estimateFrameSharpness,
  estimateGlobalTransform,
  extractPlayerTemplate,
  matchPlayerTemplate,
  relativeBlurLevel,
  type GrayFrame,
} from './filmAutoTracking'
import { summarizePlayerTrack } from './filmTracking'

function frameWithPlayer(x: number, y: number, scale = 1): GrayFrame {
  const width = 120
  const height = 80
  const pixels = new Uint8Array(width * height)
  for (let py = 0; py < height; py += 1) {
    for (let px = 0; px < width; px += 1) {
      pixels[py * width + px] = (28 + px * 7 + py * 11 + (px * py) % 37) % 118
    }
  }

  const halfWidth = Math.round(8 * scale)
  const halfHeight = Math.round(13 * scale)
  for (let py = -halfHeight; py <= halfHeight; py += 1) {
    for (let px = -halfWidth; px <= halfWidth; px += 1) {
      const targetX = x + px
      const targetY = y + py
      if (targetX < 0 || targetY < 0 || targetX >= width || targetY >= height) continue
      const normalizedX = px / Math.max(1, scale)
      const normalizedY = py / Math.max(1, scale)
      const head = normalizedY < -8 ? 205 - Math.abs(normalizedX) * 4 : undefined
      const jerseyNumber = Math.abs(normalizedX) <= 2 && normalizedY >= -5 && normalizedY <= 5 ? 242 : undefined
      const bodyTexture = 72 + (normalizedX + 8) * 4 + (normalizedY + 13) * 2
      pixels[targetY * width + targetX] = Math.max(0, Math.min(255, jerseyNumber ?? head ?? bodyTexture))
    }
  }
  return { width, height, pixels }
}

function texturedFrame(width = 120, height = 80): GrayFrame {
  const pixels = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      pixels[y * width + x] = (x * 17 + y * 29 + (x * y * 3) % 83) % 256
    }
  }
  return { width, height, pixels }
}

function transformedFrame(source: GrayFrame, dx: number, dy: number, scale: number): GrayFrame {
  const pixels = new Uint8Array(source.pixels.length)
  const centerX = (source.width - 1) / 2
  const centerY = (source.height - 1) / 2
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceX = centerX + (x - centerX - dx) / scale
      const sourceY = centerY + (y - centerY - dy) / scale
      const roundedX = Math.round(sourceX)
      const roundedY = Math.round(sourceY)
      pixels[y * source.width + x] = roundedX >= 0
        && roundedY >= 0
        && roundedX < source.width
        && roundedY < source.height
        ? source.pixels[roundedY * source.width + roundedX]
        : 0
    }
  }
  return { ...source, pixels }
}

function horizontalBlur(frame: GrayFrame, radius = 2): GrayFrame {
  const pixels = new Uint8Array(frame.pixels.length)
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      let sum = 0
      let count = 0
      for (let offset = -radius; offset <= radius; offset += 1) {
        const px = Math.max(0, Math.min(frame.width - 1, x + offset))
        sum += frame.pixels[y * frame.width + px]
        count += 1
      }
      pixels[y * frame.width + x] = Math.round(sum / count)
    }
  }
  return { ...frame, pixels }
}

describe('Film auto tracking', () => {
  it('follows a selected player to the next frame inside the local search window', () => {
    const first = frameWithPlayer(42, 35)
    const template = extractPlayerTemplate(first, { x: 42 / 119, y: 35 / 79 })
    expect(template).toBeDefined()

    const next = frameWithPlayer(51, 39)
    const match = matchPlayerTemplate(next, template!, { x: 42 / 119, y: 35 / 79 })
    expect(match).toBeDefined()
    expect(Math.abs(match!.point.x * 119 - 51)).toBeLessThanOrEqual(1)
    expect(Math.abs(match!.point.y * 79 - 39)).toBeLessThanOrEqual(1)
    expect(match!.confidence).toBeGreaterThan(0.68)
  })

  it('estimates whole-frame shake and zoom before predicting the player location', () => {
    const first = texturedFrame()
    const next = transformedFrame(first, 8, -8, 1.03)
    const motion = estimateGlobalTransform(first, next)

    expect(motion.dx * 119).toBeCloseTo(8, 0)
    expect(motion.dy * 79).toBeCloseTo(-8, 0)
    expect(motion.scale).toBeCloseTo(1.03, 2)
    expect(motion.confidence).toBeGreaterThan(0.2)

    const predicted = compensatePointForCamera({ x: 0.35, y: 0.62 }, motion)
    expect(predicted.x).toBeGreaterThan(0.4)
    expect(predicted.y).toBeLessThan(0.55)
  })

  it('adapts player scale and remains usable on a motion-blurred frame', () => {
    const first = frameWithPlayer(42, 35)
    const template = extractPlayerTemplate(first, { x: 42 / 119, y: 35 / 79 })
    expect(template).toBeDefined()

    const sharpNext = frameWithPlayer(51, 39, 1.16)
    const blurredNext = horizontalBlur(sharpNext, 1)
    const blur = relativeBlurLevel(
      estimateFrameSharpness(blurredNext),
      estimateFrameSharpness(sharpNext),
    )
    const match = matchPlayerTemplate(
      blurredNext,
      template!,
      { x: 42 / 119, y: 35 / 79 },
      36,
      { initialScale: 1.12, blurLevel: Math.max(0.45, blur) },
    )

    expect(blur).toBeGreaterThan(0)
    expect(match).toBeDefined()
    expect(Math.abs(match!.point.x * 119 - 51)).toBeLessThanOrEqual(1)
    expect(Math.abs(match!.point.y * 79 - 39)).toBeLessThanOrEqual(1)
    expect(match!.playerScale).toBeGreaterThan(1.02)
    expect(match!.confidence).toBeGreaterThan(0.5)
  })

  it('summarizes auto frames, corrections, confidence, duration, and screen distance', () => {
    const stats = summarizePlayerTrack([
      { x: 0.1, y: 0.2, t: 1, source: 'manual', confidence: 1 },
      { x: 0.2, y: 0.2, t: 1.1, source: 'auto', confidence: 0.9 },
      { x: 0.3, y: 0.3, t: 1.2, source: 'manual', confidence: 1 },
      { x: 0.4, y: 0.3, t: 1.3, source: 'auto', confidence: 0.7 },
    ])
    expect(stats.confirmedPoints).toBe(4)
    expect(stats.autoFrames).toBe(2)
    expect(stats.manualCorrections).toBe(1)
    expect(stats.durationSec).toBeCloseTo(0.3)
    expect(stats.screenDistancePct).toBeGreaterThan(30)
    expect(stats.averageConfidence).toBeCloseTo(0.8)
  })
})
