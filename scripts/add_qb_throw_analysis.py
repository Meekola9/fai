from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing marker: {label}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Domain types — stored inside the existing annotations JSON.
# ---------------------------------------------------------------------------
p = Path('src/types.ts')
s = p.read_text()
s = replace_once(
    s,
    "export type TrackingTeam = 'ours' | 'opponent'\n",
    """export type TrackingTeam = 'ours' | 'opponent'

export type ThrowFamily =
  | 'screen'
  | 'quick-game'
  | 'rpo'
  | 'dropback'
  | 'play-action'
  | 'rollout'
  | 'sprint-out'
  | 'boot'
  | 'deep-shot'
  | 'throwaway'
  | 'other'
export type ThrowTrajectory = 'bullet' | 'touch' | 'lob' | 'layered' | 'checkdown' | 'throwaway'
export type ThrowPlatform =
  | 'on-platform'
  | 'off-platform'
  | 'moving-left'
  | 'moving-right'
  | 'back-foot'
  | 'jump-pass'
export type ThrowArmSlot = 'overhand' | 'three-quarter' | 'sidearm' | 'underhand'
export type ThrowHandedness = 'right' | 'left'
export type ThrowLandmark =
  | 'throwingShoulder'
  | 'throwingElbow'
  | 'throwingWrist'
  | 'frontShoulder'
  | 'throwingHip'
  | 'frontHip'
  | 'backFoot'
  | 'frontFoot'

/** Coach-assisted quarterback throw breakdown saved with one film play. */
export interface ThrowAnalysis {
  quarterbackId?: string
  throwFamily?: ThrowFamily
  trajectory?: ThrowTrajectory
  platform?: ThrowPlatform
  armSlot?: ThrowArmSlot
  handedness?: ThrowHandedness
  snapTimeSec?: number
  plantTimeSec?: number
  releaseTimeSec?: number
  arrivalTimeSec?: number
  /** Air distance supplied by the coach; required for average ball-speed mph. */
  throwDistanceYards?: number
  /** Eight coach-marked 2D landmarks from the release frame. */
  landmarks?: Partial<Record<ThrowLandmark, FilmAnnotationPoint>>
  note?: string
}
""",
    'throw domain types',
)
s = replace_once(
    s,
    """  /** Coach marked this individual route as finished. */
  trackingComplete?: boolean
  points: FilmAnnotationPoint[]
""",
    """  /** Coach marked this individual route as finished. */
  trackingComplete?: boolean
  /** Special metadata record for QB timing, mechanics, speed, and throw type. */
  throwAnalysis?: ThrowAnalysis
  points: FilmAnnotationPoint[]
""",
    'throw analysis annotation field',
)
p.write_text(s)


# ---------------------------------------------------------------------------
# Film Room integration.
# ---------------------------------------------------------------------------
p = Path('src/pages/FilmRoom.tsx')
s = p.read_text()
s = replace_once(
    s,
    """  PlaySide,
  TrackingTeam,
} from '../types'
""",
    """  PlaySide,
  TrackingTeam,
  ThrowAnalysis,
  ThrowArmSlot,
  ThrowFamily,
  ThrowHandedness,
  ThrowLandmark,
  ThrowPlatform,
  ThrowTrajectory,
} from '../types'
""",
    'throw type imports',
)
s = replace_once(
    s,
    "import { BrowserPlayerAutoTracker } from '../lib/filmAutoTracking'\n",
    """import { BrowserPlayerAutoTracker } from '../lib/filmAutoTracking'
import {
  THROW_FAMILIES,
  THROW_LANDMARKS,
  computeThrowMetrics,
  isThrowAnalysisAnnotation,
  removeThrowAnalysis,
  suggestThrowFamily,
  throwAnalysisAnnotation,
  upsertThrowAnalysis,
} from '../lib/throwAnalysis'
""",
    'throw helper imports',
)
s = replace_once(
    s,
    "type FilmToolMode = 'draw' | 'track'\n",
    """type FilmToolMode = 'draw' | 'track' | 'throw'
type ThrowTimeKey = 'snapTimeSec' | 'plantTimeSec' | 'releaseTimeSec' | 'arrivalTimeSec'
""",
    'throw tool mode',
)
s = replace_once(
    s,
    """const KIND_LABEL: Record<FilmAnnotationKind, string> = {
  route: 'Route',
  trail: 'Player trail',
  zone: 'Coverage zone',
  arrow: 'Pointer',
}
""",
    """const KIND_LABEL: Record<FilmAnnotationKind, string> = {
  route: 'Route',
  trail: 'Player trail',
  zone: 'Coverage zone',
  arrow: 'Pointer',
}

const THROW_TRAJECTORY_OPTIONS: Array<{ key: ThrowTrajectory; label: string }> = [
  { key: 'bullet', label: 'Bullet' },
  { key: 'touch', label: 'Touch' },
  { key: 'lob', label: 'Lob' },
  { key: 'layered', label: 'Layered' },
  { key: 'checkdown', label: 'Checkdown' },
  { key: 'throwaway', label: 'Throwaway' },
]
const THROW_PLATFORM_OPTIONS: Array<{ key: ThrowPlatform; label: string }> = [
  { key: 'on-platform', label: 'On platform' },
  { key: 'off-platform', label: 'Off platform' },
  { key: 'moving-left', label: 'Moving left' },
  { key: 'moving-right', label: 'Moving right' },
  { key: 'back-foot', label: 'Back foot' },
  { key: 'jump-pass', label: 'Jump pass' },
]
const THROW_ARM_SLOT_OPTIONS: Array<{ key: ThrowArmSlot; label: string }> = [
  { key: 'overhand', label: 'Overhand' },
  { key: 'three-quarter', label: 'Three-quarter' },
  { key: 'sidearm', label: 'Sidearm' },
  { key: 'underhand', label: 'Underhand / shovel' },
]
const THROW_HANDEDNESS_OPTIONS: Array<{ key: ThrowHandedness; label: string }> = [
  { key: 'right', label: 'Right-handed' },
  { key: 'left', label: 'Left-handed' },
]
const THROW_TIME_LABEL: Record<ThrowTimeKey, string> = {
  snapTimeSec: 'snap',
  plantTimeSec: 'plant',
  releaseTimeSec: 'release',
  arrivalTimeSec: 'arrival',
}
""",
    'throw option constants',
)

# FilmStage props and overlay.
s = replace_once(
    s,
    """  toolMode,
  activeTrackId,
  currentTime,
""",
    """  toolMode,
  activeTrackId,
  throwAnalysis,
  activeThrowLandmark,
  currentTime,
""",
    'FilmStage destructured throw props',
)
s = replace_once(
    s,
    """  onCommitPath,
  onCommitTrackPoint,
  canDraw,
""",
    """  onCommitPath,
  onCommitTrackPoint,
  onCommitThrowPoint,
  canDraw,
""",
    'FilmStage destructured throw callback',
)
s = replace_once(
    s,
    """  toolMode: FilmToolMode
  activeTrackId?: string
  currentTime: number
""",
    """  toolMode: FilmToolMode
  activeTrackId?: string
  throwAnalysis?: ThrowAnalysis
  activeThrowLandmark?: ThrowLandmark
  currentTime: number
""",
    'FilmStage throw prop types',
)
s = replace_once(
    s,
    """  onCommitPath: (points: FilmAnnotationPoint[]) => void
  onCommitTrackPoint: (point: FilmAnnotationPoint, time: number) => void
  canDraw: boolean
""",
    """  onCommitPath: (points: FilmAnnotationPoint[]) => void
  onCommitTrackPoint: (point: FilmAnnotationPoint, time: number) => void
  onCommitThrowPoint: (point: FilmAnnotationPoint, time: number) => void
  canDraw: boolean
""",
    'FilmStage throw callback type',
)
s = replace_once(
    s,
    """      ...annotations.filter((annotation) => !isPlayerTrack(annotation)).map((a) => ({
""",
    """      ...annotations.filter((annotation) => !isPlayerTrack(annotation) && !isThrowAnalysisAnnotation(annotation)).map((a) => ({
""",
    'exclude throw record from draw paths',
)
s = replace_once(
    s,
    """      ctx.restore()
    }
  }

  // Keep the canvas backing store matched to its displayed size, then redraw.
""",
    """      ctx.restore()
    }

    const landmarks = throwAnalysis?.landmarks
    if (landmarks) {
      const segments: Array<[ThrowLandmark, ThrowLandmark]> = [
        ['throwingShoulder', 'throwingElbow'],
        ['throwingElbow', 'throwingWrist'],
        ['throwingShoulder', 'frontShoulder'],
        ['throwingHip', 'frontHip'],
        ['backFoot', 'frontFoot'],
      ]
      ctx.save()
      ctx.strokeStyle = '#fb923c'
      ctx.fillStyle = '#fb923c'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#fb923c'
      ctx.shadowBlur = 10
      for (const [fromKey, toKey] of segments) {
        const from = landmarks[fromKey]
        const to = landmarks[toKey]
        if (!from || !to) continue
        ctx.beginPath()
        ctx.moveTo(from.x * width, from.y * height)
        ctx.lineTo(to.x * width, to.y * height)
        ctx.stroke()
      }
      for (const landmark of THROW_LANDMARKS) {
        const point = landmarks[landmark.key]
        if (!point) continue
        const px = point.x * width
        const py = point.y * height
        ctx.beginPath()
        ctx.arc(px, py, landmark.key === activeThrowLandmark ? 8 : 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = landmark.key === activeThrowLandmark ? '#ffffff' : '#111827'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.font = '800 10px system-ui, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(landmark.short, px + 9, py - 7)
        ctx.fillStyle = '#fb923c'
        ctx.shadowBlur = 10
      }
      ctx.restore()
    }
  }

  // Keep the canvas backing store matched to its displayed size, then redraw.
""",
    'throw landmark overlay',
)
s = replace_once(
    s,
    "useEffect(redraw, [annotations, drawColor, drawKind, currentTime, activeTrackId])\n",
    "useEffect(redraw, [annotations, drawColor, drawKind, currentTime, activeTrackId, throwAnalysis, activeThrowLandmark])\n",
    'throw redraw dependencies',
)
s = replace_once(
    s,
    """          className={`absolute inset-0 h-full w-full ${canDraw ? (toolMode === 'track' ? 'cursor-cell' : 'cursor-crosshair') : 'pointer-events-none'}`}
""",
    """          className={`absolute inset-0 h-full w-full ${canDraw ? (toolMode === 'track' ? 'cursor-cell' : toolMode === 'throw' ? 'cursor-copy' : 'cursor-crosshair') : 'pointer-events-none'}`}
""",
    'throw canvas cursor',
)
s = replace_once(
    s,
    """            if (toolMode === 'track') {
              videoRef.current?.pause()
              onCommitTrackPoint(point, videoRef.current?.currentTime ?? currentTime)
              return
            }
""",
    """            if (toolMode === 'track') {
              videoRef.current?.pause()
              onCommitTrackPoint(point, videoRef.current?.currentTime ?? currentTime)
              return
            }
            if (toolMode === 'throw') {
              videoRef.current?.pause()
              onCommitThrowPoint(point, videoRef.current?.currentTime ?? currentTime)
              return
            }
""",
    'throw canvas click handling',
)

# FilmRoom state and derived values.
s = replace_once(
    s,
    """  const [trackingMessage, setTrackingMessage] = useState<string>()

  const [opponentFilter, setOpponentFilter] = useState('')
""",
    """  const [trackingMessage, setTrackingMessage] = useState<string>()
  const [activeThrowLandmark, setActiveThrowLandmark] = useState<ThrowLandmark>('throwingShoulder')
  const [throwMessage, setThrowMessage] = useState<string>()

  const [opponentFilter, setOpponentFilter] = useState('')
""",
    'throw analysis state',
)
s = replace_once(
    s,
    """  const activeStats = activeTrack ? summarizePlayerTrack(activeTrack.points) : undefined

  useEffect(() => {
""",
    """  const activeStats = activeTrack ? summarizePlayerTrack(activeTrack.points) : undefined
  const throwRecord = throwAnalysisAnnotation(pending)
  const throwAnalysis = throwRecord?.throwAnalysis ?? {}
  const throwMetrics = computeThrowMetrics(throwAnalysis)
  const suggestedThrowFamily = suggestThrowFamily(throwAnalysis, form.call)
  const throwLandmarkCount = Object.values(throwAnalysis.landmarks ?? {}).filter(Boolean).length
  const quarterbacks = roster.filter((athlete) => athlete.positionGroup === 'QB')

  useEffect(() => {
""",
    'throw derived values',
)

# Throw mutations after manual tracking point handler.
s = replace_once(
    s,
    """  function seekVideo(nextTime: number) {
""",
    """  function updateThrowAnalysis(patch: Partial<ThrowAnalysis>) {
    setPending((current) => {
      const existing = throwAnalysisAnnotation(current)?.throwAnalysis ?? {}
      return upsertThrowAnalysis(current, { ...existing, ...patch })
    })
  }

  function markThrowTime(key: ThrowTimeKey) {
    const time = Math.round((videoRef.current?.currentTime ?? videoTime) * 1000) / 1000
    updateThrowAnalysis({ [key]: time })
    setThrowMessage(`${THROW_TIME_LABEL[key][0].toUpperCase()}${THROW_TIME_LABEL[key].slice(1)} marked at ${formatTrackTime(time)}.`)
  }

  function commitThrowLandmarkPoint(point: FilmAnnotationPoint, time: number) {
    setPending((current) => {
      const existing = throwAnalysisAnnotation(current)?.throwAnalysis ?? {}
      const landmarks = { ...(existing.landmarks ?? {}), [activeThrowLandmark]: { ...point, t: time } }
      return upsertThrowAnalysis(current, {
        ...existing,
        releaseTimeSec: existing.releaseTimeSec ?? Math.round(time * 1000) / 1000,
        landmarks,
      })
    })
    const label = THROW_LANDMARKS.find((item) => item.key === activeThrowLandmark)?.label ?? 'Landmark'
    setThrowMessage(`${label} marked on the release frame.`)
  }

  function clearThrowBreakdown() {
    setPending((current) => removeThrowAnalysis(current))
    setActiveThrowLandmark('throwingShoulder')
    setThrowMessage('Throw analysis cleared from this unsaved breakdown.')
  }

  function seekVideo(nextTime: number) {
""",
    'throw mutation functions',
)
s = replace_once(
    s,
    """    setTrackingMessage(undefined)
    setVideoTime(0)
""",
    """    setTrackingMessage(undefined)
    setActiveThrowLandmark('throwingShoulder')
    setThrowMessage(undefined)
    setVideoTime(0)
""",
    'reset throw state',
)
s = replace_once(
    s,
    """    const firstTrack = annotations.find(isPlayerTrack)
    setActiveTrackId(firstTrack?.id)
""",
    """    const firstTrack = annotations.find(isPlayerTrack)
    const savedThrow = throwAnalysisAnnotation(annotations)
    setActiveTrackId(firstTrack?.id)
""",
    'edit saved throw lookup',
)
s = replace_once(
    s,
    """    setToolMode(firstTrack ? 'track' : 'draw')
    setTrackingMessage(firstTrack ? 'Saved player tracking loaded. Select a player and continue correcting keyframes.' : undefined)
""",
    """    setToolMode(firstTrack ? 'track' : savedThrow ? 'throw' : 'draw')
    setTrackingMessage(firstTrack ? 'Saved player tracking loaded. Select a player and continue correcting keyframes.' : undefined)
    setThrowMessage(savedThrow ? 'Saved quarterback throw analysis loaded.' : undefined)
""",
    'edit throw tool mode',
)
s = replace_once(
    s,
    """  function numberField(value: string): number | undefined {
    if (value === '') return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return (
""",
    """  function numberField(value: string): number | undefined {
    if (value === '') return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  function metricText(value: number | undefined, digits: number, suffix: string): string {
    return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—'
  }

  return (
""",
    'metric display helper',
)

# FilmStage wiring.
s = replace_once(
    s,
    """            toolMode={toolMode}
            activeTrackId={activeTrackId}
            currentTime={videoTime}
""",
    """            toolMode={toolMode}
            activeTrackId={activeTrackId}
            throwAnalysis={throwAnalysis}
            activeThrowLandmark={activeThrowLandmark}
            currentTime={videoTime}
""",
    'FilmStage throw values',
)
s = replace_once(
    s,
    """            onCommitPath={commitPath}
            onCommitTrackPoint={commitTrackPoint}
            canDraw={canEdit}
""",
    """            onCommitPath={commitPath}
            onCommitTrackPoint={commitTrackPoint}
            onCommitThrowPoint={commitThrowLandmarkPoint}
            canDraw={canEdit}
""",
    'FilmStage throw callback wiring',
)

# Tool button and panel.
s = replace_once(
    s,
    """              <button
                type="button"
                onClick={() => setToolMode('track')}
                className={`rounded-lg border px-3 py-2 text-xs font-black ${toolMode === 'track' ? 'border-fai bg-fai/10 text-chalk' : 'border-line text-muted'}`}
              >
                ◎ Track players
              </button>
              {playerTracks.length > 0 && <Pill tone="fai">{playerTracks.length} tracked</Pill>}
""",
    """              <button
                type="button"
                onClick={() => setToolMode('track')}
                className={`rounded-lg border px-3 py-2 text-xs font-black ${toolMode === 'track' ? 'border-fai bg-fai/10 text-chalk' : 'border-line text-muted'}`}
              >
                ◎ Track players
              </button>
              <button
                type="button"
                onClick={() => { stopAutoFollow('ready', undefined, false); setAutoArmed(false); setToolMode('throw') }}
                className={`rounded-lg border px-3 py-2 text-xs font-black ${toolMode === 'throw' ? 'border-flame bg-flame/10 text-chalk' : 'border-line text-muted'}`}
              >
                🎯 Throw analysis
              </button>
              {playerTracks.length > 0 && <Pill tone="fai">{playerTracks.length} tracked</Pill>}
              {throwRecord && <Pill tone="gold">QB throw</Pill>}
""",
    'throw analysis tool button',
)
throw_panel = r'''
          {canEdit && toolMode === 'throw' && (
            <div className="space-y-4 rounded-xl border border-flame/35 bg-flame/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-chalk">QB throw mechanics, speed, and type</div>
                  <div className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted">
                    Mark snap, plant, release, and arrival. Enter air distance for average ball speed. At the release frame, choose each landmark below and tap it on the video.
                  </div>
                </div>
                <Pill tone={throwLandmarkCount === THROW_LANDMARKS.length ? 'fai' : 'gold'}>{throwLandmarkCount}/8 landmarks</Pill>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <select
                  value={throwAnalysis.quarterbackId ?? ''}
                  onChange={(event) => updateThrowAnalysis({ quarterbackId: event.target.value || undefined })}
                  className={selectClass}
                  aria-label="Throw quarterback"
                >
                  <option value="">Unassigned quarterback</option>
                  {quarterbacks.map((athlete) => <option key={athlete.id} value={athlete.id}>{athlete.name}</option>)}
                </select>
                <select
                  value={throwAnalysis.throwFamily ?? ''}
                  onChange={(event) => updateThrowAnalysis({ throwFamily: (event.target.value || undefined) as ThrowFamily | undefined })}
                  className={selectClass}
                  aria-label="Throw family"
                >
                  <option value="">Throw family…</option>
                  {THROW_FAMILIES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
                <select
                  value={throwAnalysis.trajectory ?? ''}
                  onChange={(event) => updateThrowAnalysis({ trajectory: (event.target.value || undefined) as ThrowTrajectory | undefined })}
                  className={selectClass}
                  aria-label="Throw trajectory"
                >
                  <option value="">Ball type…</option>
                  {THROW_TRAJECTORY_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
                <select
                  value={throwAnalysis.platform ?? ''}
                  onChange={(event) => updateThrowAnalysis({ platform: (event.target.value || undefined) as ThrowPlatform | undefined })}
                  className={selectClass}
                  aria-label="Throw platform"
                >
                  <option value="">Platform…</option>
                  {THROW_PLATFORM_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
                <select
                  value={throwAnalysis.armSlot ?? ''}
                  onChange={(event) => updateThrowAnalysis({ armSlot: (event.target.value || undefined) as ThrowArmSlot | undefined })}
                  className={selectClass}
                  aria-label="Throw arm slot"
                >
                  <option value="">Arm slot…</option>
                  {THROW_ARM_SLOT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
                <select
                  value={throwAnalysis.handedness ?? ''}
                  onChange={(event) => updateThrowAnalysis({ handedness: (event.target.value || undefined) as ThrowHandedness | undefined })}
                  className={selectClass}
                  aria-label="Throw handedness"
                >
                  <option value="">Throwing hand…</option>
                  {THROW_HANDEDNESS_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {([
                  ['snapTimeSec', 'Mark snap'],
                  ['plantTimeSec', 'Mark plant'],
                  ['releaseTimeSec', 'Mark release'],
                  ['arrivalTimeSec', 'Mark arrival'],
                ] as Array<[ThrowTimeKey, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={label}
                    onClick={() => markThrowTime(key)}
                    className="rounded-lg border border-line bg-panel px-3 py-2 text-xs font-black text-chalk hover:border-flame/50"
                  >
                    {label}
                    {typeof throwAnalysis[key] === 'number' && <span className="ml-2 text-flame nums">{formatTrackTime(throwAnalysis[key] as number)}</span>}
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={throwAnalysis.throwDistanceYards ?? ''}
                  onChange={(event) => updateThrowAnalysis({ throwDistanceYards: numberField(event.target.value) })}
                  placeholder="Air distance (yds)"
                  aria-label="Throw distance yards"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel-2/40 px-3 py-2 text-[11px] text-muted">
                <span>Suggested family: <strong className="text-chalk">{THROW_FAMILIES.find((item) => item.key === suggestedThrowFamily)?.label}</strong></span>
                <button type="button" onClick={() => updateThrowAnalysis({ throwFamily: suggestedThrowFamily })} className="rounded-md border border-flame/40 px-2 py-1 font-black text-flame">Use suggestion</button>
                {typeof throwAnalysis.releaseTimeSec === 'number' && (
                  <button type="button" onClick={() => seekVideo(throwAnalysis.releaseTimeSec as number)} className="rounded-md border border-line px-2 py-1 font-black text-chalk">Jump to release</button>
                )}
                <span className="ml-auto">Speed = coach-entered air yards ÷ release-to-arrival time.</span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Throw analysis metrics">
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Time to throw</div><div className="text-sm font-black text-fai nums">{metricText(throwMetrics.timeToThrowSec, 2, 's')}</div></div>
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Plant → release</div><div className="text-sm font-black text-chalk nums">{metricText(throwMetrics.plantToReleaseSec, 2, 's')}</div></div>
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Ball flight</div><div className="text-sm font-black text-chalk nums">{metricText(throwMetrics.flightTimeSec, 2, 's')}</div></div>
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Average ball speed</div><div className="text-sm font-black text-flame nums">{metricText(throwMetrics.averageBallSpeedMph, 1, ' mph')}</div></div>
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Elbow angle</div><div className="text-sm font-black text-chalk nums">{metricText(throwMetrics.elbowAngleDeg, 0, '°')}</div></div>
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Arm-slot angle</div><div className="text-sm font-black text-chalk nums">{metricText(throwMetrics.armSlotAngleDeg, 0, '°')}</div></div>
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Shoulder–hip split</div><div className="text-sm font-black text-chalk nums">{metricText(throwMetrics.shoulderHipSeparationDeg, 0, '°')}</div></div>
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Base width</div><div className="text-sm font-black text-chalk nums">{metricText(throwMetrics.baseWidthPct, 1, '% frame')}</div></div>
                <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Stride-line angle</div><div className="text-sm font-black text-chalk nums">{metricText(throwMetrics.strideLineAngleDeg, 0, '°')}</div></div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-black text-chalk">Release-frame landmarks</div>
                  <div className="text-[10px] text-muted">Choose a landmark, then tap it on the paused video.</div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {THROW_LANDMARKS.map((landmark) => (
                    <button
                      key={landmark.key}
                      type="button"
                      onClick={() => setActiveThrowLandmark(landmark.key)}
                      className={`rounded-lg border px-2 py-2 text-[11px] font-black ${activeThrowLandmark === landmark.key ? 'border-flame bg-flame/15 text-flame' : throwAnalysis.landmarks?.[landmark.key] ? 'border-up/40 text-up' : 'border-line text-muted'}`}
                    >
                      {landmark.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={throwAnalysis.note ?? ''}
                onChange={(event) => updateThrowAnalysis({ note: event.target.value || undefined })}
                placeholder="Mechanics note: sequencing, front side, base, follow-through…"
                aria-label="Throw mechanics note"
                className={inputClass + ' min-h-20 w-full resize-y'}
              />
              {throwMetrics.timingWarning && <div className="rounded-lg border border-down/40 bg-down/5 p-2 text-xs font-bold text-down">{throwMetrics.timingWarning}</div>}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted">2D angles depend on the Hudl camera view and are not laboratory-grade 3D biomechanics.</span>
                <button type="button" onClick={clearThrowBreakdown} disabled={!throwRecord} className="ml-auto rounded-lg border border-down/40 px-3 py-2 text-xs font-bold text-down disabled:opacity-40">Clear throw analysis</button>
              </div>
              {throwMessage && <div className="text-xs font-bold text-flame">{throwMessage}</div>}
            </div>
          )}

'''
s = replace_once(
    s,
    """          {canEdit && toolMode === 'track' && (
""",
    throw_panel + """          {canEdit && toolMode === 'track' && (
""",
    'throw analysis panel',
)

# Hide the metadata annotation from the ordinary drawing chip list.
s = replace_once(
    s,
    """              {pending.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pending.map((annotation, index) => {
""",
    """              {pending.some((annotation) => !isThrowAnalysisAnnotation(annotation)) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pending.filter((annotation) => !isThrowAnalysisAnnotation(annotation)).map((annotation) => {
""",
    'draw chips exclude throw record',
)
s = replace_once(
    s,
    """                          onClick={() => setPending((prev) => prev.filter((_, i) => i !== index))}
""",
    """                          onClick={() => setPending((prev) => prev.filter((item) => item.id !== annotation.id))}
""",
    'draw chip removal by id',
)

# Saved-play summary.
s = replace_once(
    s,
    """            {recent.map((play) => {
              const carrier = roster.find((item) => item.id === play.ballCarrierId)
              return (
""",
    """            {recent.map((play) => {
              const carrier = roster.find((item) => item.id === play.ballCarrierId)
              const savedThrow = throwAnalysisAnnotation(play.annotations ?? [])?.throwAnalysis
              const savedThrowMetrics = savedThrow ? computeThrowMetrics(savedThrow) : undefined
              return (
""",
    'saved throw summary values',
)
s = replace_once(
    s,
    """                  {play.call && <Pill tone={play.call === 'run' ? 'gold' : 'fai'}>{labelFor('call', play.call)}</Pill>}
                  {play.concept && <span className="text-xs text-muted">{labelFor('concept', play.concept)}</span>}
""",
    """                  {play.call && <Pill tone={play.call === 'run' ? 'gold' : 'fai'}>{labelFor('call', play.call)}</Pill>}
                  {savedThrow?.throwFamily && <Pill tone="gold">🎯 {THROW_FAMILIES.find((item) => item.key === savedThrow.throwFamily)?.label ?? savedThrow.throwFamily}</Pill>}
                  {typeof savedThrowMetrics?.averageBallSpeedMph === 'number' && <span className="text-xs font-black text-flame nums">{savedThrowMetrics.averageBallSpeedMph.toFixed(1)} mph</span>}
                  {play.concept && <span className="text-xs text-muted">{labelFor('concept', play.concept)}</span>}
""",
    'saved throw summary display',
)
p.write_text(s)
