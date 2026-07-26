import { describe, expect, it } from 'vitest'
import {
  extractPlayerTemplate,
  matchPlayerTemplate,
  type GrayFrame,
} from './filmAutoTracking'
import { summarizePlayerTrack } from './filmTracking'

function frameWithPlayer(x: number, y: number): GrayFrame {
  const width = 120
  const height = 80
  const pixels = new Uint8Array(width * height)
  pixels.fill(34)
  for (let py = -13; py <= 13; py += 1) {
    for (let px = -8; px <= 8; px += 1) {
      const targetX = x + px
      const targetY = y + py
      if (targetX < 0 || targetY < 0 || targetX >= width || targetY >= height) continue
      const head = py < -8 ? 205 - Math.abs(px) * 4 : undefined
      const jerseyNumber = Math.abs(px) <= 2 && py >= -5 && py <= 5 ? 242 : undefined
      const bodyTexture = 72 + (px + 8) * 4 + (py + 13) * 2
      pixels[targetY * width + targetX] = Math.max(0, Math.min(255, jerseyNumber ?? head ?? bodyTexture))
    }
  }
  return { width, height, pixels }
}

describe('Film auto tracking', () => {
  it('follows a selected player to the next frame inside the local search window', () => {
    const first = frameWithPlayer(42, 35)
    const template = extractPlayerTemplate(first, { x: 42 / 119, y: 35 / 79 })
    expect(template).toBeDefined()

    const next = frameWithPlayer(51, 39)
    const match = matchPlayerTemplate(next, template!, { x: 42 / 119, y: 35 / 79 })
    expect(match).toBeDefined()
    expect(match!.point.x * 119).toBeCloseTo(51, 0)
    expect(match!.point.y * 79).toBeCloseTo(39, 0)
    expect(match!.confidence).toBeGreaterThan(0.75)
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
