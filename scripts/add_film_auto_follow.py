from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing marker: {label}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Domain metadata for automatic points and 11-player formation grouping
# ---------------------------------------------------------------------------
p = Path('src/types.ts')
s = p.read_text()
s = replace_once(
    s,
    """export interface FilmAnnotationPoint {
  x: number // 0-1 across the frame width
  y: number // 0-1 down the frame height
  t?: number // optional seconds from the play's start, for trails / speed
}
""",
    """export interface FilmAnnotationPoint {
  x: number // 0-1 across the frame width
  y: number // 0-1 down the frame height
  t?: number // optional seconds from the play's start, for trails / speed
  /** Whether the coach placed this point or the browser tracker generated it. */
  source?: 'manual' | 'auto'
  /** 0-1 visual match confidence for automatic points. */
  confidence?: number
}
""",
    'film point metadata',
)
s = replace_once(
    s,
    """export type FilmAnnotationKind = 'route' | 'trail' | 'zone' | 'arrow'

/** A route line, defender trail, coverage zone, or pointer drawn over film. */
""",
    """export type FilmAnnotationKind = 'route' | 'trail' | 'zone' | 'arrow'
export type TrackingTeam = 'ours' | 'opponent'

/** A route line, defender trail, coverage zone, or pointer drawn over film. */
""",
    'tracking team type',
)
s = replace_once(
    s,
    """  /** Unit assignment used to color and group a timed player track. */
  trackingSide?: PlaySide
  points: FilmAnnotationPoint[]
""",
    """  /** Unit assignment used to color and group a timed player track. */
  trackingSide?: PlaySide
  /** Whether the tracked player belongs to our team or the opponent. */
  trackingTeam?: TrackingTeam
  /** Position/formation label such as X, Z, LT, Mike, or Boundary CB. */
  formationRole?: string
  /** Coach marked this individual route as finished. */
  trackingComplete?: boolean
  points: FilmAnnotationPoint[]
""",
    'track formation metadata',
)
p.write_text(s)


# ---------------------------------------------------------------------------
# Browser-side visual template tracker (one player at a time)
# ---------------------------------------------------------------------------
Path('src/lib/filmAutoTracking.ts').write_text(r'''import type { FilmAnnotationPoint } from '../types'

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
  private template?: PlayerTemplate
  private lastPoint?: Pick<FilmAnnotationPoint, 'x' | 'y'>

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly processingWidth = 360,
  ) {}

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
''')


# ---------------------------------------------------------------------------
# Tracking utilities retain point provenance and provide live stats
# ---------------------------------------------------------------------------
p = Path('src/lib/filmTracking.ts')
s = p.read_text()
s = replace_once(
    s,
    """  FilmAnnotationPoint,
  PlaySide,
} from '../types'
""",
    """  FilmAnnotationPoint,
  PlaySide,
  TrackingTeam,
} from '../types'
""",
    'film tracking type import',
)
s = replace_once(
    s,
    """  label: string
  side: PlaySide
}): FilmAnnotation {
""",
    """  label: string
  side: PlaySide
  team?: TrackingTeam
  role?: string
}): FilmAnnotation {
""",
    'create track input',
)
s = replace_once(
    s,
    """    tracking: true,
    trackingSide: input.side,
    points: [],
""",
    """    tracking: true,
    trackingSide: input.side,
    trackingTeam: input.team ?? 'opponent',
    formationRole: input.role?.trim() || undefined,
    trackingComplete: false,
    points: [],
""",
    'create track metadata',
)
s = replace_once(
    s,
    """    .map((point) => ({
      x: clampUnit(point.x),
      y: clampUnit(point.y),
      t: cleanTime(point.t),
    }))
""",
    """    .map((point) => ({
      x: clampUnit(point.x),
      y: clampUnit(point.y),
      t: cleanTime(point.t),
      source: point.source,
      confidence: typeof point.confidence === 'number' && Number.isFinite(point.confidence)
        ? clampUnit(point.confidence)
        : undefined,
    }))
""",
    'preserve auto metadata',
)
s = replace_once(
    s,
    """  point: Pick<FilmAnnotationPoint, 'x' | 'y'>,
""",
    """  point: Pick<FilmAnnotationPoint, 'x' | 'y'> & Partial<Pick<FilmAnnotationPoint, 'source' | 'confidence'>>,
""",
    'upsert metadata input',
)
s = replace_once(
    s,
    """    y: clampUnit(point.y),
    t: nextTime,
  }
""",
    """    y: clampUnit(point.y),
    t: nextTime,
    source: point.source,
    confidence: typeof point.confidence === 'number' ? clampUnit(point.confidence) : undefined,
  }
""",
    'upsert metadata fields',
)
s += r'''

export interface PlayerTrackStats {
  confirmedPoints: number
  autoFrames: number
  manualCorrections: number
  durationSec: number
  screenDistancePct: number
  averageConfidence: number
}

/** Live measurements that do not pretend screen pixels are calibrated yards. */
export function summarizePlayerTrack(points: readonly FilmAnnotationPoint[]): PlayerTrackStats {
  const keyframes = trackKeyframes(points)
  let distance = 0
  let confidenceTotal = 0
  let confidenceCount = 0
  let manualPoints = 0
  let autoFrames = 0
  for (let index = 0; index < keyframes.length; index += 1) {
    const point = keyframes[index]
    if (point.source === 'auto') autoFrames += 1
    if (point.source === 'manual') manualPoints += 1
    if (point.source === 'auto' && typeof point.confidence === 'number') {
      confidenceTotal += point.confidence
      confidenceCount += 1
    }
    if (index > 0) {
      const previous = keyframes[index - 1]
      distance += Math.hypot(point.x - previous.x, point.y - previous.y)
    }
  }
  return {
    confirmedPoints: keyframes.length,
    autoFrames,
    manualCorrections: Math.max(0, manualPoints - 1),
    durationSec: keyframes.length > 1 ? keyframes[keyframes.length - 1].t - keyframes[0].t : 0,
    screenDistancePct: distance * 100,
    averageConfidence: confidenceCount > 0 ? confidenceTotal / confidenceCount : 0,
  }
}
'''
p.write_text(s)


# ---------------------------------------------------------------------------
# Unit tests for visual matching and live stats
# ---------------------------------------------------------------------------
Path('src/lib/filmAutoTracking.test.ts').write_text(r'''import { describe, expect, it } from 'vitest'
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
      const stripe = ((px + 8) % 5 === 0 || (py + 13) % 7 === 0) ? 225 : 118
      pixels[targetY * width + targetX] = stripe
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
''')


# ---------------------------------------------------------------------------
# Film Room integration
# ---------------------------------------------------------------------------
p = Path('src/pages/FilmRoom.tsx')
s = p.read_text()
s = replace_once(
    s,
    """  PlayCall,
  PlaySide,
} from '../types'
""",
    """  PlayCall,
  PlaySide,
  TrackingTeam,
} from '../types'
""",
    'FilmRoom tracking team import',
)
s = replace_once(
    s,
    """  trackTrailAt,
  upsertTrackKeyframe,
} from '../lib/filmTracking'
""",
    """  trackTrailAt,
  upsertTrackKeyframe,
  summarizePlayerTrack,
} from '../lib/filmTracking'
import { BrowserPlayerAutoTracker } from '../lib/filmAutoTracking'
""",
    'FilmRoom auto tracker import',
)
s = replace_once(
    s,
    """type FormState = Partial<FilmPlay>
type FilmToolMode = 'draw' | 'track'
""",
    """type FormState = Partial<FilmPlay>
type FilmToolMode = 'draw' | 'track'
type AutoTrackingStatus = 'idle' | 'armed' | 'ready' | 'running' | 'lost' | 'complete' | 'error'
type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: { mediaTime: number }) => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}
""",
    'FilmRoom auto tracker types',
)

formation_component = r'''
function FormationBoard({ tracks }: { tracks: FilmAnnotation[] }) {
  const located = tracks
    .map((track) => ({ track, start: trackKeyframes(track.points)[0] }))
    .filter((item): item is { track: FilmAnnotation; start: FilmAnnotationPoint & { t: number } } => Boolean(item.start))

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#12331f]" data-testid="formation-board">
      <div className="flex items-center justify-between border-b border-white/15 bg-black/20 px-3 py-2">
        <div className="text-xs font-black uppercase tracking-wider text-white">Formation + route map</div>
        <div className="text-[11px] font-bold text-white/70">{located.length}/11 located</div>
      </div>
      <div className="relative aspect-video overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-white/50" />
        {[20, 40, 60, 80].map((position) => (
          <div key={position} className="absolute inset-y-0 border-l border-white/20" style={{ left: `${position}%` }} />
        ))}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 56.25" preserveAspectRatio="none" aria-hidden="true">
          {located.map(({ track }) => {
            const route = trackKeyframes(track.points)
            if (route.length < 2) return null
            return (
              <polyline
                key={`route-${track.id}`}
                points={route.map((point) => `${point.x * 100},${point.y * 56.25}`).join(' ')}
                fill="none"
                stroke={track.color ?? TRACK_COLORS[track.trackingSide ?? 'offense']}
                strokeWidth="0.65"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            )
          })}
        </svg>
        {located.map(({ track, start }) => (
          <div
            key={track.id}
            data-testid="formation-player"
            className="absolute grid h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-black/85 px-1 text-[9px] font-black text-white shadow-lg"
            style={{ left: `${start.x * 100}%`, top: `${start.y * 100}%` }}
            title={track.label ?? track.formationRole ?? 'Tracked player'}
          >
            {(track.formationRole || track.label || '?').slice(0, 5)}
          </div>
        ))}
      </div>
      <div className="border-t border-white/15 bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-white/65">
        Starting dots form the alignment. Lines show each saved route in the camera view.
      </div>
    </div>
  )
}

'''
s = replace_once(s, "const selectClass =\n", formation_component + "const selectClass =\n", 'formation board component')

s = replace_once(
    s,
    """  const objectUrlRef = useRef<string | null>(null)

  const [sourceLabel, setSourceLabel] = useState<string>('')
""",
    """  const objectUrlRef = useRef<string | null>(null)
  const autoTrackerRef = useRef<BrowserPlayerAutoTracker | null>(null)
  const autoFrameRequestRef = useRef<number>()
  const autoTimerRef = useRef<number>()
  const autoRunningRef = useRef(false)
  const activeTrackIdRef = useRef<string>()
  const autoLastMediaTimeRef = useRef(-1)
  const lowConfidenceFramesRef = useRef(0)

  const [sourceLabel, setSourceLabel] = useState<string>('')
""",
    'auto tracking refs',
)
s = replace_once(
    s,
    """  const [trackLabel, setTrackLabel] = useState('')
  const [trackSide, setTrackSide] = useState<PlaySide>('offense')
  const [videoTime, setVideoTime] = useState(0)
""",
    """  const [trackLabel, setTrackLabel] = useState('')
  const [trackRole, setTrackRole] = useState('')
  const [trackTeam, setTrackTeam] = useState<TrackingTeam>('opponent')
  const [trackSide, setTrackSide] = useState<PlaySide>('offense')
  const [formationStartTime, setFormationStartTime] = useState<number>()
  const [autoStatus, setAutoStatus] = useState<AutoTrackingStatus>('idle')
  const [autoConfidence, setAutoConfidence] = useState(0)
  const [autoFrameCount, setAutoFrameCount] = useState(0)
  const [autoArmed, setAutoArmed] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
""",
    'auto and formation state',
)
s = replace_once(
    s,
    """  const playerTracks = pending.filter(isPlayerTrack)
  const activeTrack = playerTracks.find((track) => track.id === activeTrackId)

  // Release any object URL / capture stream when the page unmounts.
""",
    """  const playerTracks = pending.filter(isPlayerTrack)
  const activeTrack = playerTracks.find((track) => track.id === activeTrackId)
  const formationTracks = playerTracks.filter((track) =>
    (track.trackingTeam ?? 'opponent') === trackTeam && (track.trackingSide ?? 'offense') === trackSide,
  )
  const formationLocated = formationTracks.filter((track) => trackKeyframes(track.points).length > 0)
  const completedRoutes = formationTracks.filter((track) => track.trackingComplete).length
  const activeStats = activeTrack ? summarizePlayerTrack(activeTrack.points) : undefined

  useEffect(() => {
    activeTrackIdRef.current = activeTrackId
  }, [activeTrackId])

  // Release any object URL / capture stream when the page unmounts.
""",
    'derived formation and stats',
)
s = replace_once(
    s,
    """    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
""",
    """    return () => {
      const video = videoRef.current as FrameCallbackVideo | null
      if (autoFrameRequestRef.current !== undefined) video?.cancelVideoFrameCallback?.(autoFrameRequestRef.current)
      if (autoTimerRef.current !== undefined) window.clearTimeout(autoTimerRef.current)
      autoRunningRef.current = false
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
""",
    'auto cleanup',
)

functions = r'''
  function cancelAutoLoop() {
    const video = videoRef.current as FrameCallbackVideo | null
    if (autoFrameRequestRef.current !== undefined) {
      video?.cancelVideoFrameCallback?.(autoFrameRequestRef.current)
      autoFrameRequestRef.current = undefined
    }
    if (autoTimerRef.current !== undefined) {
      window.clearTimeout(autoTimerRef.current)
      autoTimerRef.current = undefined
    }
  }

  function stopAutoFollow(
    status: AutoTrackingStatus = 'ready',
    message?: string,
    pauseVideo = true,
  ) {
    autoRunningRef.current = false
    cancelAutoLoop()
    if (pauseVideo) videoRef.current?.pause()
    setAutoStatus(status)
    if (message) setTrackingMessage(message)
  }

  function processAutoFrame(mediaTime: number) {
    if (!autoRunningRef.current) return
    const video = videoRef.current
    const tracker = autoTrackerRef.current
    const trackId = activeTrackIdRef.current
    if (!video || !tracker || !trackId) {
      stopAutoFollow('error', 'Auto-follow stopped because the active player or video was unavailable.')
      return
    }
    if (mediaTime <= autoLastMediaTimeRef.current + 0.002) {
      scheduleAutoFrame()
      return
    }
    autoLastMediaTimeRef.current = mediaTime
    const sample = tracker.trackCurrentFrame()
    if (!sample) {
      setAutoArmed(true)
      stopAutoFollow('lost', 'FAI could not read the next frame. Tap the player to correct and automatically resume.')
      return
    }

    const point: FilmAnnotationPoint = {
      ...sample.point,
      t: mediaTime,
      source: 'auto',
      confidence: sample.confidence,
    }
    setPending((current) => current.map((annotation) =>
      annotation.id === trackId
        ? { ...annotation, points: upsertTrackKeyframe(annotation.points, mediaTime, point) }
        : annotation,
    ))
    setVideoTime(mediaTime)
    setAutoConfidence(sample.confidence)
    setAutoFrameCount((count) => count + 1)

    lowConfidenceFramesRef.current = sample.confidence < 0.48
      ? lowConfidenceFramesRef.current + 1
      : 0
    if (lowConfidenceFramesRef.current >= 4) {
      setAutoArmed(true)
      stopAutoFollow(
        'lost',
        `Tracking confidence fell to ${Math.round(sample.confidence * 100)}%. Tap the player once to correct and continue.`,
      )
      return
    }
    if (video.ended || (Number.isFinite(video.duration) && video.currentTime >= video.duration)) {
      stopAutoFollow('complete', 'Auto-follow reached the end of the clip.')
      return
    }
    scheduleAutoFrame()
  }

  function scheduleAutoFrame() {
    if (!autoRunningRef.current) return
    const video = videoRef.current as FrameCallbackVideo | null
    if (!video) return
    if (video.requestVideoFrameCallback) {
      autoFrameRequestRef.current = video.requestVideoFrameCallback((_now, metadata) => {
        autoFrameRequestRef.current = undefined
        processAutoFrame(metadata.mediaTime)
      })
      return
    }
    autoTimerRef.current = window.setTimeout(() => {
      autoTimerRef.current = undefined
      processAutoFrame(video.currentTime)
    }, 34)
  }

  function startAutoFollowFromPoint(point: Pick<FilmAnnotationPoint, 'x' | 'y'>, time: number) {
    const video = videoRef.current
    if (!video || !activeTrackIdRef.current) {
      setTrackingMessage('Load a clip and select a player track before starting auto-follow.')
      return
    }
    cancelAutoLoop()
    const tracker = new BrowserPlayerAutoTracker(video)
    if (!tracker.initialize(point)) {
      setAutoStatus('error')
      setTrackingMessage('FAI could not lock onto that frame. Wait for the video to load, then tap the player again.')
      return
    }
    autoTrackerRef.current = tracker
    autoRunningRef.current = true
    autoLastMediaTimeRef.current = time - 0.001
    lowConfidenceFramesRef.current = 0
    setAutoFrameCount(0)
    setAutoConfidence(1)
    setAutoArmed(false)
    setAutoStatus('running')
    setTrackingMessage('Auto-follow is running. FAI will stop and ask for a correction if confidence drops.')
    scheduleAutoFrame()
    void video.play().catch(() => {
      stopAutoFollow('error', 'Playback was blocked. Press Play, then start auto-follow again.')
    })
  }

  function startAutoFollow() {
    const video = videoRef.current
    if (!video || !activeTrack) {
      setTrackingMessage('Start or select a player track first.')
      return
    }
    const position = trackPositionAt(activeTrack.points, video.currentTime)
      ?? trackKeyframes(activeTrack.points).at(-1)
    if (!position) {
      setTrackingMessage('Tap the player on the video once before starting auto-follow.')
      return
    }
    startAutoFollowFromPoint(position, video.currentTime)
  }

  function armAutoFollow() {
    if (!activeTrack) {
      setTrackingMessage('Start or select a player track first.')
      return
    }
    stopAutoFollow('armed', undefined, true)
    setAutoArmed(true)
    setAutoStatus('armed')
    setTrackingMessage('Auto-follow armed. Tap the player at the current frame; FAI will begin following immediately.')
  }

'''
s = replace_once(s, "  function stopStream() {\n", functions + "  function stopStream() {\n", 'auto functions')

s = replace_once(
    s,
    """  function loadFile(file: File) {
    setCaptureError(undefined)
""",
    """  function loadFile(file: File) {
    stopAutoFollow('idle', undefined, false)
    setAutoArmed(false)
    setCaptureError(undefined)
""",
    'stop auto on load',
)
s = replace_once(
    s,
    """  async function startScreenCapture() {
    setCaptureError(undefined)
""",
    """  async function startScreenCapture() {
    stopAutoFollow('idle', undefined, false)
    setAutoArmed(false)
    setCaptureError(undefined)
""",
    'stop auto on capture',
)
s = replace_once(
    s,
    """  function createTrack() {
    const athlete = roster.find((item) => item.id === trackAthleteId)
    const label = trackLabel.trim() || athlete?.name || `Player ${playerTracks.length + 1}`
    const track = createPlayerTrack({
      id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      athleteId: athlete?.id,
      label,
      side: trackSide,
    })
    setPending((current) => [...current, track])
    setActiveTrackId(track.id)
    setTrackLabel('')
    setTrackingMessage(`Tracking ${label}. Pause on a clear frame, then tap the player.`)
  }
""",
    """  function createTrack() {
    if (formationTracks.length >= 11) {
      setTrackingMessage('This team/unit already has 11 player tracks. Delete or change one before adding another.')
      return
    }
    stopAutoFollow('idle', undefined, false)
    setAutoArmed(false)
    const athlete = trackTeam === 'ours' ? roster.find((item) => item.id === trackAthleteId) : undefined
    const role = trackRole.trim()
    const label = trackLabel.trim() || athlete?.name || role || `Player ${formationTracks.length + 1}`
    const track = createPlayerTrack({
      id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      athleteId: athlete?.id,
      label,
      side: trackSide,
      team: trackTeam,
      role,
    })
    setPending((current) => [...current, track])
    setActiveTrackId(track.id)
    setTrackLabel('')
    setTrackRole('')
    setAutoStatus('idle')
    if (formationStartTime !== undefined) seekVideo(formationStartTime)
    setTrackingMessage(`Player ${formationTracks.length + 1} of 11 ready: ${label}. Arm auto-follow, then tap the player.`)
  }
""",
    'expanded create track',
)
s = replace_once(
    s,
    """  function commitTrackPoint(point: FilmAnnotationPoint, time: number) {
    if (!activeTrackId) {
      setTrackingMessage('Start or select a player track before placing a keyframe.')
      return
    }
    setPending((current) => current.map((annotation) =>
      annotation.id === activeTrackId
        ? { ...annotation, points: upsertTrackKeyframe(annotation.points, time, point) }
        : annotation,
    ))
    setVideoTime(time)
    setTrackingMessage(`Keyframe saved at ${formatTrackTime(time)}. Advance the clip and correct the player again.`)
  }
""",
    """  function commitTrackPoint(point: FilmAnnotationPoint, time: number) {
    if (!activeTrackId) {
      setTrackingMessage('Start or select a player track before placing a keyframe.')
      return
    }
    if (autoRunningRef.current) stopAutoFollow('ready', undefined, false)
    const manualPoint: FilmAnnotationPoint = { ...point, t: time, source: 'manual', confidence: 1 }
    setPending((current) => current.map((annotation) =>
      annotation.id === activeTrackId
        ? { ...annotation, points: upsertTrackKeyframe(annotation.points, time, manualPoint) }
        : annotation,
    ))
    setVideoTime(time)
    setAutoConfidence(1)
    if (autoArmed) {
      window.setTimeout(() => startAutoFollowFromPoint(manualPoint, time), 0)
    } else {
      setAutoStatus('ready')
      setTrackingMessage(`Manual point saved at ${formatTrackTime(time)}. Start auto-follow or advance and correct manually.`)
    }
  }
""",
    'manual point auto resume',
)
s = replace_once(
    s,
    """  function seekVideo(nextTime: number) {
    const video = videoRef.current
""",
    """  function seekVideo(nextTime: number) {
    if (autoRunningRef.current) stopAutoFollow('ready', 'Auto-follow paused because the video was scrubbed.', false)
    const video = videoRef.current
""",
    'stop auto on scrub',
)
s = replace_once(
    s,
    """  function deleteActiveTrack() {
    if (!activeTrackId) return
""",
    """  function finishActiveRoute() {
    if (!activeTrackId) return
    stopAutoFollow('complete', undefined, true)
    setAutoArmed(false)
    setPending((current) => current.map((annotation) =>
      annotation.id === activeTrackId ? { ...annotation, trackingComplete: true } : annotation,
    ))
    const label = activeTrack?.label ?? 'Player route'
    setTrackingMessage(`${label} saved in this breakdown. Start the next player; Save Play persists all routes.`)
    if (formationStartTime !== undefined) seekVideo(formationStartTime)
  }

  function deleteActiveTrack() {
    if (!activeTrackId) return
    stopAutoFollow('idle', undefined, false)
""",
    'finish route function',
)
s = replace_once(
    s,
    """    setTrackingMessage(undefined)
    setVideoTime(0)
    setVideoPlaying(false)
""",
    """    stopAutoFollow('idle', undefined, false)
    setAutoArmed(false)
    setAutoFrameCount(0)
    setAutoConfidence(0)
    setFormationStartTime(undefined)
    setTrackingMessage(undefined)
    setVideoTime(0)
    setVideoPlaying(false)
""",
    'reset auto state',
)
s = replace_once(
    s,
    """    const firstTrack = annotations.find(isPlayerTrack)
    setActiveTrackId(firstTrack?.id)
    setToolMode(firstTrack ? 'track' : 'draw')
""",
    """    const firstTrack = annotations.find(isPlayerTrack)
    setActiveTrackId(firstTrack?.id)
    if (firstTrack) {
      setTrackTeam(firstTrack.trackingTeam ?? 'opponent')
      setTrackSide(firstTrack.trackingSide ?? 'offense')
      setFormationStartTime(trackKeyframes(firstTrack.points)[0]?.t)
    }
    setToolMode(firstTrack ? 'track' : 'draw')
""",
    'restore formation selection',
)

s = replace_once(
    s,
    """          Break down film, tag formations &amp; plays, coach-track players with timed keyframes,
          chart routes and trails, and build the opponent tendency report.
""",
    """          Select an 11-player unit, auto-follow one athlete at a time, save every route,
          and generate a screenshot-ready formation and route map.
""",
    'Film Room description',
)

old_panel_start = """          {canEdit && toolMode === 'track' && (
            <div className=\"space-y-4 rounded-xl border border-fai/30 bg-fai/5 p-4\">"""
new_panel_start = """          {canEdit && toolMode === 'track' && (
            <div className=\"space-y-4 rounded-xl border border-fai/30 bg-fai/5 p-4\">"""
s = replace_once(s, old_panel_start, new_panel_start, 'tracking panel start')

s = replace_once(
    s,
    """                    <div className="text-sm font-black text-chalk">Coach-assisted player tracking</div>
                    <div className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">
                      Start a player, pause on a clear frame, then tap the player on the video. Add corrections as the play develops; FAI interpolates movement between confirmed keyframes.
                    </div>
""",
    """                    <div className="text-sm font-black text-chalk">11-player auto-follow and formation builder</div>
                    <div className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">
                      Set the pre-snap frame, create one player, arm auto-follow, and tap that player once. FAI follows frame-by-frame until confidence drops. Finish the route, rewind, and repeat until all 11 are mapped.
                    </div>
""",
    'tracking panel intro',
)
s = replace_once(
    s,
    """                <Pill tone="gold">30 fps step</Pill>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
""",
    """                <Pill tone={formationLocated.length === 11 ? 'fai' : 'gold'}>{formationLocated.length}/11 located</Pill>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <select value={trackTeam} onChange={(event) => setTrackTeam(event.target.value as TrackingTeam)} className={selectClass} aria-label="Formation team">
                  <option value="opponent">Opponent</option>
                  <option value="ours">Our team</option>
                </select>
                <select value={trackSide} onChange={(event) => setTrackSide(event.target.value as PlaySide)} className={selectClass} aria-label="Formation unit">
                  <option value="offense">Offense</option>
                  <option value="defense">Defense</option>
                  <option value="special">Special teams</option>
                </select>
                <button type="button" onClick={() => { setFormationStartTime(videoTime); setTrackingMessage(`Formation start set at ${formatTrackTime(videoTime)}.`) }} className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-black text-gold">
                  Set formation start
                </button>
                <button type="button" onClick={() => formationStartTime !== undefined && seekVideo(formationStartTime)} disabled={formationStartTime === undefined} className="rounded-lg border border-line px-3 py-2 text-xs font-black text-chalk disabled:opacity-40">
                  Return to start {formationStartTime !== undefined ? formatTrackTime(formationStartTime) : ''}
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
""",
    'formation setup controls',
)
s = replace_once(
    s,
    """                  <option value="">Generic / opponent player</option>
                  {roster.map((athlete) => (
""",
    """                  <option value="">{trackTeam === 'ours' ? 'Unassigned roster athlete' : 'Opponent / generic player'}</option>
                  {trackTeam === 'ours' && roster.map((athlete) => (
""",
    'team roster choice',
)
s = replace_once(
    s,
    """                <input
                  value={trackLabel}
                  onChange={(event) => setTrackLabel(event.target.value)}
                  placeholder="Label or jersey (optional)"
                  className={inputClass}
                  aria-label="Player track label"
                />
                <select
                  value={trackSide}
                  onChange={(event) => setTrackSide(event.target.value as PlaySide)}
                  className={selectClass}
                  aria-label="Player track side"
                >
                  <option value="offense">Offense</option>
                  <option value="defense">Defense</option>
                  <option value="special">Special teams</option>
                </select>
""",
    """                <input
                  value={trackRole}
                  onChange={(event) => setTrackRole(event.target.value)}
                  placeholder="Position: X, LT, Mike…"
                  className={inputClass}
                  aria-label="Formation position"
                />
                <input
                  value={trackLabel}
                  onChange={(event) => setTrackLabel(event.target.value)}
                  placeholder="Name or jersey (optional)"
                  className={inputClass}
                  aria-label="Player track label"
                />
""",
    'role and label fields',
)
s = replace_once(
    s,
    """                  Start player track
""",
    """                  Add player {formationTracks.length + 1}/11
""",
    'start track label',
)
s = replace_once(
    s,
    """              {playerTracks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {playerTracks.map((track) => {
""",
    """              {formationTracks.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {formationTracks.map((track) => {
""",
    'formation track list',
)
s = replace_once(
    s,
    """                      <button
                        key={track.id}
                        type="button"
                        onClick={() => setActiveTrackId(track.id)}
                        className={`rounded-xl border px-3 py-2 text-left ${activeTrackId === track.id ? 'border-fai bg-panel text-chalk' : 'border-line bg-panel-2/40 text-muted'}`}
""",
    """                      <button
                        key={track.id}
                        type="button"
                        onClick={() => { stopAutoFollow('ready', undefined, false); setAutoArmed(false); setActiveTrackId(track.id) }}
                        className={`rounded-xl border px-3 py-2 text-left ${activeTrackId === track.id ? 'border-fai bg-panel text-chalk' : 'border-line bg-panel-2/40 text-muted'}`}
""",
    'safe track selection',
)
s = replace_once(
    s,
    """                        <span className="text-xs font-black">{track.label ?? 'Tracked player'}</span>
                        <span className="ml-2 text-[10px]">{count} {count === 1 ? 'keyframe' : 'keyframes'}</span>
""",
    """                        <span className="text-xs font-black">{track.formationRole ? `${track.formationRole} · ` : ''}{track.label ?? 'Tracked player'}</span>
                        <span className="ml-2 text-[10px]">{count} points {track.trackingComplete ? '· saved ✓' : ''}</span>
""",
    'track card details',
)
s = replace_once(
    s,
    """                  No players tracked yet. Create the first player above.
""",
    """                  No players in this team/unit yet. Add player 1 of 11 above.
""",
    'empty formation tracks',
)

s = replace_once(
    s,
    """              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
                <button type="button" onClick={() => stepFrame(-1)} className="rounded-lg border border-line px-3 py-2 text-xs font-black text-chalk" aria-label="Previous frame">− 1 frame</button>
""",
    """              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
                <button type="button" onClick={autoArmed ? () => { setAutoArmed(false); setAutoStatus('ready') } : armAutoFollow} disabled={!activeTrack || autoStatus === 'running'} className="rounded-lg border border-fai/50 bg-fai/10 px-3 py-2 text-xs font-black text-fai disabled:opacity-40">
                  {autoArmed ? 'Cancel auto arm' : 'Arm auto-follow'}
                </button>
                <button type="button" onClick={startAutoFollow} disabled={!activeTrack || autoStatus === 'running' || trackKeyframes(activeTrack.points).length === 0} className="rounded-lg border border-up/40 bg-up/10 px-3 py-2 text-xs font-black text-up disabled:opacity-40">▶ Auto follow now</button>
                <button type="button" onClick={() => stopAutoFollow('ready', 'Auto-follow paused.')} disabled={autoStatus !== 'running'} className="rounded-lg border border-down/40 px-3 py-2 text-xs font-black text-down disabled:opacity-40">■ Stop</button>
                <button type="button" onClick={() => stepFrame(-1)} className="rounded-lg border border-line px-3 py-2 text-xs font-black text-chalk" aria-label="Previous frame">− 1 frame</button>
""",
    'auto tracking controls',
)
s = replace_once(
    s,
    """                  <button type="button" onClick={removeCurrentKeyframe} disabled={!activeTrack} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted disabled:opacity-40">Remove current keyframe</button>
                  <button type="button" onClick={deleteActiveTrack} disabled={!activeTrack} className="rounded-lg border border-down/40 px-3 py-2 text-xs font-bold text-down disabled:opacity-40">Delete player track</button>
""",
    """                  <button type="button" onClick={finishActiveRoute} disabled={!activeTrack || !activeStats?.confirmedPoints} className="rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-black text-gold disabled:opacity-40">Finish &amp; save route</button>
                  <button type="button" onClick={removeCurrentKeyframe} disabled={!activeTrack} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted disabled:opacity-40">Remove current point</button>
                  <button type="button" onClick={deleteActiveTrack} disabled={!activeTrack} className="rounded-lg border border-down/40 px-3 py-2 text-xs font-bold text-down disabled:opacity-40">Delete player track</button>
""",
    'finish route controls',
)
s = replace_once(
    s,
    """              {trackingMessage && <div className="text-xs font-bold text-gold">{trackingMessage}</div>}
            </div>
""",
    """              {activeTrack && activeStats && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Live tracking stats">
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Status</div><div className="text-xs font-black text-fai">{autoStatus}</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Confidence</div><div className="text-xs font-black text-chalk nums">{Math.round((autoStatus === 'running' ? autoConfidence : activeStats.averageConfidence) * 100)}%</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Auto frames</div><div className="text-xs font-black text-chalk nums">{Math.max(autoFrameCount, activeStats.autoFrames)}</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Duration</div><div className="text-xs font-black text-chalk nums">{activeStats.durationSec.toFixed(2)}s</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Screen distance</div><div className="text-xs font-black text-chalk nums">{activeStats.screenDistancePct.toFixed(1)}%</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Corrections</div><div className="text-xs font-black text-chalk nums">{activeStats.manualCorrections}</div></div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel-2/40 px-3 py-2 text-[11px] font-bold text-muted">
                <span>{completedRoutes}/11 routes finished</span>
                <span className={formationLocated.length === 11 ? 'text-up' : 'text-gold'}>{formationLocated.length === 11 ? 'Formation ready ✓' : `${11 - formationLocated.length} locations remaining`}</span>
              </div>
              <FormationBoard tracks={formationTracks} />
              {trackingMessage && <div className="text-xs font-bold text-gold">{trackingMessage}</div>}
            </div>
""",
    'live stats and formation board',
)
p.write_text(s)


# ---------------------------------------------------------------------------
# Browser workflow: build a complete 11-player formation one route at a time
# ---------------------------------------------------------------------------
Path('e2e/film-formation-builder.spec.ts').write_text(r'''import { test, expect } from '@playwright/test'

test('coach can locate 11 players one route at a time and generate a formation map', async ({ page }) => {
  await page.goto('/#/film')
  await expect(page.getByRole('heading', { name: /Film Room/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Track players/i }).click()
  await page.getByRole('button', { name: 'Set formation start' }).click()

  const canvas = page.locator('canvas').first()
  const positions = [
    [60, 90], [90, 90], [120, 90], [150, 90], [180, 90],
    [210, 90], [240, 90], [80, 130], [140, 130], [200, 130], [260, 130],
  ]
  for (let index = 0; index < 11; index += 1) {
    await page.getByLabel('Formation position').fill(`P${index + 1}`)
    await page.getByLabel('Player track label').fill(`Player ${index + 1}`)
    await page.getByRole('button', { name: new RegExp(`Add player ${index + 1}/11`) }).click()
    await canvas.click({ position: { x: positions[index][0], y: positions[index][1] } })
    await page.getByRole('button', { name: 'Finish & save route' }).click()
  }

  await expect(page.getByText('11/11 located')).toBeVisible()
  await expect(page.getByText('Formation ready ✓')).toBeVisible()
  await expect(page.getByTestId('formation-player')).toHaveCount(11)
})
''')
