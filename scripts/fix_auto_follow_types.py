from pathlib import Path

p = Path('src/lib/filmAutoTracking.ts')
s = p.read_text()
old = """export class BrowserPlayerAutoTracker {
  private readonly canvas = document.createElement('canvas')
  private readonly context = this.canvas.getContext('2d', { willReadFrequently: true })
  private template?: PlayerTemplate
  private lastPoint?: Pick<FilmAnnotationPoint, 'x' | 'y'>

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly processingWidth = 360,
  ) {}
"""
new = """export class BrowserPlayerAutoTracker {
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
"""
if old not in s:
    raise SystemExit('Auto tracker constructor marker not found')
p.write_text(s.replace(old, new, 1))

p = Path('src/pages/FilmRoom.tsx')
s = p.read_text()
s = s.replace('const autoFrameRequestRef = useRef<number>()', 'const autoFrameRequestRef = useRef<number | undefined>(undefined)', 1)
s = s.replace('const autoTimerRef = useRef<number>()', 'const autoTimerRef = useRef<number | undefined>(undefined)', 1)
s = s.replace('const activeTrackIdRef = useRef<string>()', 'const activeTrackIdRef = useRef<string | undefined>(undefined)', 1)
p.write_text(s)
