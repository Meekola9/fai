import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Card, Pill, SectionTitle, StatTile } from '../components/ui'
import HudlImportWizard from '../components/HudlImportWizard'
import type {
  FilmAnnotation,
  FilmAnnotationKind,
  FilmAnnotationPoint,
  FilmPlay,
  PlayCall,
  PlaySide,
} from '../types'
import {
  CONCEPTS_BY_CALL,
  FORMATIONS,
  PERSONNEL,
  PLAY_CALLS,
  buildTendencyReport,
  labelFor,
  opponentsFromFilm,
  type TendencyGroup,
} from '../lib/filmAnalysis'
import {
  TRACK_COLORS,
  TRACK_FRAME_SECONDS,
  createPlayerTrack,
  formatTrackTime,
  isPlayerTrack,
  removeTrackKeyframe,
  trackKeyframes,
  trackPositionAt,
  trackTrailAt,
  upsertTrackKeyframe,
} from '../lib/filmTracking'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const KIND_COLOR: Record<FilmAnnotationKind, string> = {
  route: '#22d3ee',
  trail: '#fbbf24',
  zone: '#a855f7',
  arrow: '#f8fafc',
}

const KIND_LABEL: Record<FilmAnnotationKind, string> = {
  route: 'Route',
  trail: 'Player trail',
  zone: 'Coverage zone',
  arrow: 'Pointer',
}

type FormState = Partial<FilmPlay>
type FilmToolMode = 'draw' | 'track'

const EMPTY_FORM: FormState = {
  side: 'offense',
  date: todayIso(),
}

// ---------------------------------------------------------------------------
// Film stage: video (uploaded file or live screen capture) + a drawing overlay
// for routes / player trails. Points are stored normalized 0-1 to the frame.
// ---------------------------------------------------------------------------

function FilmStage({
  videoRef,
  annotations,
  drawKind,
  drawColor,
  toolMode,
  activeTrackId,
  currentTime,
  onTimeChange,
  onCommitPath,
  onCommitTrackPoint,
  canDraw,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  annotations: FilmAnnotation[]
  drawKind: FilmAnnotationKind
  drawColor: string
  toolMode: FilmToolMode
  activeTrackId?: string
  currentTime: number
  onTimeChange: (time: number) => void
  onCommitPath: (points: FilmAnnotationPoint[]) => void
  onCommitTrackPoint: (point: FilmAnnotationPoint, time: number) => void
  canDraw: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef<FilmAnnotationPoint[] | null>(null)
  const [, forceTick] = useState(0)

  function pointFrom(event: React.PointerEvent): FilmAnnotationPoint {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    }
  }

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const paths: { points: FilmAnnotationPoint[]; color: string; kind: FilmAnnotationKind }[] = [
      ...annotations.filter((annotation) => !isPlayerTrack(annotation)).map((a) => ({
        points: a.points,
        color: a.color ?? KIND_COLOR[a.kind],
        kind: a.kind,
      })),
    ]
    if (drawingRef.current && drawingRef.current.length > 0) {
      paths.push({ points: drawingRef.current, color: drawColor, kind: drawKind })
    }

    for (const path of paths) {
      if (path.points.length === 0) continue
      ctx.lineWidth = 3
      ctx.strokeStyle = path.color
      ctx.fillStyle = path.color
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.shadowColor = path.color
      ctx.shadowBlur = 8
      ctx.beginPath()
      path.points.forEach((point, index) => {
        const px = point.x * width
        const py = point.y * height
        if (index === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.stroke()
      // Start dot + end marker so a route reads directionally.
      const first = path.points[0]
      ctx.shadowBlur = 0
      ctx.beginPath()
      ctx.arc(first.x * width, first.y * height, 5, 0, Math.PI * 2)
      ctx.fill()
      const last = path.points[path.points.length - 1]
      if (path.points.length > 1) {
        ctx.beginPath()
        ctx.arc(last.x * width, last.y * height, 3.5, 0, Math.PI * 2)
        ctx.strokeStyle = '#0b0f14'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    for (const track of annotations.filter(isPlayerTrack)) {
      const color = track.color ?? TRACK_COLORS[track.trackingSide ?? 'offense']
      const trail = trackTrailAt(track.points, currentTime)
      const position = trackPositionAt(track.points, currentTime)
      if (trail.length > 1) {
        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = track.id === activeTrackId ? 4 : 2.5
        ctx.globalAlpha = track.id === activeTrackId ? 0.95 : 0.7
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()
        trail.forEach((point, index) => {
          const px = point.x * width
          const py = point.y * height
          if (index === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
        ctx.restore()
      }
      if (!position) continue

      const px = position.x * width
      const py = position.y * height
      const radius = track.id === activeTrackId ? 11 : 8
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = track.id === activeTrackId ? 18 : 10
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(px, py, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = track.id === activeTrackId ? '#ffffff' : '#0b0f14'
      ctx.lineWidth = track.id === activeTrackId ? 3 : 2
      ctx.stroke()

      const label = track.label?.trim()
      if (label) {
        ctx.font = '700 12px system-ui, sans-serif'
        const labelWidth = ctx.measureText(label).width + 12
        const labelX = Math.min(width - labelWidth - 4, Math.max(4, px + radius + 5))
        const labelY = Math.max(18, py - radius - 4)
        ctx.fillStyle = 'rgba(5, 10, 16, 0.82)'
        ctx.fillRect(labelX, labelY - 15, labelWidth, 20)
        ctx.fillStyle = '#f8fafc'
        ctx.fillText(label, labelX + 6, labelY)
      }
      ctx.restore()
    }
  }

  // Keep the canvas backing store matched to its displayed size, then redraw.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(rect.width))
      canvas.height = Math.max(1, Math.round(rect.height))
      redraw()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(redraw, [annotations, drawColor, drawKind, currentTime, activeTrackId])

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-black">
      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full bg-black"
          controls
          playsInline
          onLoadedMetadata={(event) => onTimeChange(event.currentTarget.currentTime)}
          onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime)}
          onSeeked={(event) => onTimeChange(event.currentTarget.currentTime)}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full ${canDraw ? (toolMode === 'track' ? 'cursor-cell' : 'cursor-crosshair') : 'pointer-events-none'}`}
          style={{ touchAction: 'none' }}
          onPointerDown={(event) => {
            if (!canDraw) return
            const point = pointFrom(event)
            if (toolMode === 'track') {
              videoRef.current?.pause()
              onCommitTrackPoint(point, videoRef.current?.currentTime ?? currentTime)
              return
            }
            ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
            drawingRef.current = [point]
            forceTick((n) => n + 1)
          }}
          onPointerMove={(event) => {
            if (!canDraw || toolMode !== 'draw' || !drawingRef.current) return
            drawingRef.current.push(pointFrom(event))
            redraw()
          }}
          onPointerUp={() => {
            if (!canDraw || toolMode !== 'draw' || !drawingRef.current) return
            const points = drawingRef.current
            drawingRef.current = null
            if (points.length >= 2) onCommitPath(points)
            forceTick((n) => n + 1)
          }}
        />
      </div>
    </div>
  )
}

function ShareBar({ group }: { group: TendencyGroup }) {
  const runPct = Math.round(group.runShare * 100)
  const passPct = 100 - runPct
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/50">
      <div className="h-full bg-flame/80" style={{ width: `${runPct}%` }} title={`Run ${runPct}%`} />
      <div className="h-full bg-fai/80" style={{ width: `${passPct}%` }} title={`Pass ${passPct}%`} />
    </div>
  )
}

function TendencyTable({ title, groups }: { title: string; groups: TendencyGroup[] }) {
  if (groups.length === 0) return null
  return (
    <Card className="p-5">
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.key} className="rounded-xl border border-line bg-panel-2/30 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-sm font-black text-chalk">{group.label}</div>
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span className="nums">{group.plays} plays</span>
                <span>·</span>
                <span className="nums">{group.avgGain > 0 ? '+' : ''}{group.avgGain} avg</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="w-16 shrink-0 text-right text-xs font-black text-flame nums">
                {Math.round(group.runShare * 100)}% run
              </span>
              <div className="flex-1"><ShareBar group={group} /></div>
              <span className="w-16 shrink-0 text-xs font-black text-fai nums">
                {Math.round(group.passShare * 100)}% pass
              </span>
            </div>
            {(group.topFormations.length > 0 || group.topConcepts.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.topFormations.slice(0, 2).map((item) => (
                  <Pill key={`f-${item.key}`} tone="gold">
                    {item.label} · {Math.round(item.share * 100)}%
                  </Pill>
                ))}
                {group.topConcepts.slice(0, 2).map((item) => (
                  <Pill key={`c-${item.key}`} tone="fai">
                    {item.label} · {item.count}
                  </Pill>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

const selectClass =
  'rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-chalk outline-none focus:border-fai'
const inputClass = selectClass + ' placeholder:text-muted'

export default function FilmRoom() {
  const { data, canEdit, addFilmPlay, updateFilmPlay, deleteFilmPlay } = useStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [sourceLabel, setSourceLabel] = useState<string>('')
  const [captureError, setCaptureError] = useState<string>()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, setPending] = useState<FilmAnnotation[]>([])
  const [drawKind, setDrawKind] = useState<FilmAnnotationKind>('route')
  const [drawAthleteId, setDrawAthleteId] = useState('')
  const [toolMode, setToolMode] = useState<FilmToolMode>('draw')
  const [activeTrackId, setActiveTrackId] = useState<string>()
  const [trackAthleteId, setTrackAthleteId] = useState('')
  const [trackLabel, setTrackLabel] = useState('')
  const [trackSide, setTrackSide] = useState<PlaySide>('offense')
  const [videoTime, setVideoTime] = useState(0)
  const [trackingMessage, setTrackingMessage] = useState<string>()

  const [opponentFilter, setOpponentFilter] = useState('')

  const roster = useMemo(
    () => [...data.athletes].sort((a, b) => a.name.localeCompare(b.name)),
    [data.athletes],
  )
  const opponents = useMemo(() => opponentsFromFilm(data.filmPlays), [data.filmPlays])
  const report = useMemo(
    () => buildTendencyReport(data.filmPlays, { opponent: opponentFilter || undefined }),
    [data.filmPlays, opponentFilter],
  )
  const recent = useMemo(
    () =>
      [...data.filmPlays]
        .sort((a, b) => `${b.date ?? ''}${b.createdAt ?? ''}`.localeCompare(`${a.date ?? ''}${a.createdAt ?? ''}`))
        .slice(0, 14),
    [data.filmPlays],
  )

  const conceptOptions = form.call ? CONCEPTS_BY_CALL[form.call] ?? [] : []
  const playerTracks = pending.filter(isPlayerTrack)
  const activeTrack = playerTracks.find((track) => track.id === activeTrackId)

  // Release any object URL / capture stream when the page unmounts.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function loadFile(file: File) {
    setCaptureError(undefined)
    stopStream()
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    const video = videoRef.current
    if (video) {
      video.srcObject = null
      video.src = url
      void video.play().catch(() => undefined)
    }
    setSourceLabel(file.name)
    setVideoTime(0)
    setForm((prev) => ({ ...prev, filmLabel: prev.filmLabel || file.name }))
  }

  async function startScreenCapture() {
    setCaptureError(undefined)
    const media = navigator.mediaDevices as MediaDevices & {
      getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>
    }
    if (!media?.getDisplayMedia) {
      setCaptureError('Screen capture is not supported in this browser.')
      return
    }
    try {
      const stream = await media.getDisplayMedia({ video: true, audio: false })
      stopStream()
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.src = ''
        video.srcObject = stream
        void video.play().catch(() => undefined)
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => setSourceLabel(''))
      setSourceLabel('Live screen capture')
    } catch (error: unknown) {
      setCaptureError(error instanceof Error ? error.message : 'Screen capture was cancelled.')
    }
  }

  function commitPath(points: FilmAnnotationPoint[]) {
    const annotation: FilmAnnotation = {
      id: `anno-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: drawKind,
      athleteId: drawAthleteId || undefined,
      color: KIND_COLOR[drawKind],
      points,
    }
    setPending((prev) => [...prev, annotation])
  }

  function createTrack() {
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

  function commitTrackPoint(point: FilmAnnotationPoint, time: number) {
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

  function stepFrame(direction: -1 | 1) {
    const video = videoRef.current
    if (!video) return
    video.pause()
    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : Number.POSITIVE_INFINITY
    const next = Math.max(0, Math.min(duration, (video.currentTime || 0) + direction * TRACK_FRAME_SECONDS))
    try {
      video.currentTime = next
    } catch {
      return
    }
    setVideoTime(next)
  }

  function removeCurrentKeyframe() {
    if (!activeTrackId) return
    setPending((current) => current.map((annotation) =>
      annotation.id === activeTrackId
        ? { ...annotation, points: removeTrackKeyframe(annotation.points, videoTime) }
        : annotation,
    ))
    setTrackingMessage(`Removed the keyframe nearest ${formatTrackTime(videoTime)}, when one existed.`)
  }

  function deleteActiveTrack() {
    if (!activeTrackId) return
    setPending((current) => current.filter((annotation) => annotation.id !== activeTrackId))
    setActiveTrackId(undefined)
    setTrackingMessage('Player track removed.')
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setPending([])
    setEditingId(null)
    setActiveTrackId(undefined)
    setTrackingMessage(undefined)
    setVideoTime(0)
  }

  function savePlay() {
    const video = videoRef.current
    const time = video && Number.isFinite(video.currentTime) ? video.currentTime : undefined
    const payload: Omit<FilmPlay, 'id' | 'createdAt'> = {
      ...form,
      filmLabel: form.filmLabel || sourceLabel || undefined,
      videoTimeSec: editingId ? form.videoTimeSec : time && time > 0 ? Math.round(time * 10) / 10 : undefined,
      annotations: pending.length > 0 ? pending : undefined,
    }
    if (editingId) {
      updateFilmPlay({ ...(payload as FilmPlay), id: editingId })
    } else {
      addFilmPlay(payload)
    }
    resetForm()
  }

  function editPlay(play: FilmPlay) {
    setEditingId(play.id)
    setForm({ ...play })
    const annotations = play.annotations ?? []
    setPending(annotations)
    const firstTrack = annotations.find(isPlayerTrack)
    setActiveTrackId(firstTrack?.id)
    setToolMode(firstTrack ? 'track' : 'draw')
    setTrackingMessage(firstTrack ? 'Saved player tracking loaded. Select a player and continue correcting keyframes.' : undefined)
    setOpponentFilter('')
    const video = videoRef.current
    if (video && typeof play.videoTimeSec === 'number' && !video.srcObject) {
      video.currentTime = play.videoTimeSec
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function jumpTo(play: FilmPlay) {
    const video = videoRef.current
    if (video && typeof play.videoTimeSec === 'number' && !video.srcObject) {
      video.currentTime = play.videoTimeSec
      void video.play().catch(() => undefined)
    }
  }

  function setField<K extends keyof FilmPlay>(key: K, value: FilmPlay[K] | undefined) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function numberField(value: string): number | undefined {
    if (value === '') return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-chalk">
          Film <span className="text-fai">Room</span>
        </h1>
        <div className="mt-1 text-xs text-muted">
          Break down film, tag formations &amp; plays, coach-track players with timed keyframes,
          chart routes and trails, and build the opponent tendency report.
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Plays charted" value={report.totalPlays} accent="fai" />
        <StatTile label="Run rate" value={`${Math.round(report.runShare * 100)}%`} accent="flame" />
        <StatTile label="Pass rate" value={`${Math.round(report.passShare * 100)}%`} accent="fai" />
        <StatTile label="Opponents" value={opponents.length} accent="gold" />
      </div>

      <HudlImportWizard />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          <FilmStage
            videoRef={videoRef}
            annotations={pending}
            drawKind={drawKind}
            drawColor={KIND_COLOR[drawKind]}
            toolMode={toolMode}
            activeTrackId={activeTrackId}
            currentTime={videoTime}
            onTimeChange={setVideoTime}
            onCommitPath={commitPath}
            onCommitTrackPoint={commitTrackPoint}
            canDraw={canEdit}
          />
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <label className="cursor-pointer rounded-lg border border-line bg-panel px-3 py-2 text-sm font-bold text-chalk hover:border-fai/40">
                  Upload clip
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) loadFile(file)
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void startScreenCapture()}
                  className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-bold text-chalk hover:border-fai/40"
                >
                  ▶ Capture screen
                </button>
              </>
            )}
            {sourceLabel && <Pill tone="fai">{sourceLabel}</Pill>}
            {captureError && <span className="text-xs text-down">{captureError}</span>}
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel-2/30 p-2">
              <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted">Film tools</span>
              <button
                type="button"
                onClick={() => setToolMode('draw')}
                className={`rounded-lg border px-3 py-2 text-xs font-black ${toolMode === 'draw' ? 'border-fai bg-fai/10 text-chalk' : 'border-line text-muted'}`}
              >
                ✎ Draw
              </button>
              <button
                type="button"
                onClick={() => setToolMode('track')}
                className={`rounded-lg border px-3 py-2 text-xs font-black ${toolMode === 'track' ? 'border-fai bg-fai/10 text-chalk' : 'border-line text-muted'}`}
              >
                ◎ Track players
              </button>
              {playerTracks.length > 0 && <Pill tone="fai">{playerTracks.length} tracked</Pill>}
            </div>
          )}

          {canEdit && toolMode === 'track' && (
            <div className="space-y-4 rounded-xl border border-fai/30 bg-fai/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-chalk">Coach-assisted player tracking</div>
                  <div className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted">
                    Start a player, pause on a clear frame, then tap the player on the video. Add corrections as the play develops; FAI interpolates movement between confirmed keyframes.
                  </div>
                </div>
                <Pill tone="gold">30 fps step</Pill>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={trackAthleteId}
                  onChange={(event) => setTrackAthleteId(event.target.value)}
                  className={selectClass}
                  aria-label="Tracked roster athlete"
                >
                  <option value="">Generic / opponent player</option>
                  {roster.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                  ))}
                </select>
                <input
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
                <button
                  type="button"
                  onClick={createTrack}
                  className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink"
                >
                  Start player track
                </button>
              </div>

              {playerTracks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {playerTracks.map((track) => {
                    const count = trackKeyframes(track.points).length
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => setActiveTrackId(track.id)}
                        className={`rounded-xl border px-3 py-2 text-left ${activeTrackId === track.id ? 'border-fai bg-panel text-chalk' : 'border-line bg-panel-2/40 text-muted'}`}
                        aria-label={`Select track ${track.label ?? 'player'}`}
                      >
                        <span className="mr-2" style={{ color: track.color }}>●</span>
                        <span className="text-xs font-black">{track.label ?? 'Tracked player'}</span>
                        <span className="ml-2 text-[10px]">{count} {count === 1 ? 'keyframe' : 'keyframes'}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted">
                  No players tracked yet. Create the first player above.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
                <button type="button" onClick={() => stepFrame(-1)} className="rounded-lg border border-line px-3 py-2 text-xs font-black text-chalk" aria-label="Previous frame">− 1 frame</button>
                <div className="min-w-20 text-center text-sm font-black text-fai nums">{formatTrackTime(videoTime)}</div>
                <button type="button" onClick={() => stepFrame(1)} className="rounded-lg border border-line px-3 py-2 text-xs font-black text-chalk" aria-label="Next frame">+ 1 frame</button>
                <div className="text-[11px] text-muted">
                  {activeTrack
                    ? `Active: ${activeTrack.label ?? 'Tracked player'} · ${trackKeyframes(activeTrack.points).length} confirmed`
                    : 'Select or start a player, then tap the player on the video.'}
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button type="button" onClick={removeCurrentKeyframe} disabled={!activeTrack} className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted disabled:opacity-40">Remove current keyframe</button>
                  <button type="button" onClick={deleteActiveTrack} disabled={!activeTrack} className="rounded-lg border border-down/40 px-3 py-2 text-xs font-bold text-down disabled:opacity-40">Delete player track</button>
                </div>
              </div>
              {trackingMessage && <div className="text-xs font-bold text-gold">{trackingMessage}</div>}
            </div>
          )}

          {canEdit && toolMode === 'draw' && (
            <div className="rounded-xl border border-line bg-panel-2/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Draw</span>
                {(Object.keys(KIND_LABEL) as FilmAnnotationKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setDrawKind(kind)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                      drawKind === kind ? 'border-fai text-chalk' : 'border-line text-muted hover:text-chalk'
                    }`}
                    style={drawKind === kind ? { boxShadow: `inset 0 0 0 9999px ${KIND_COLOR[kind]}22` } : undefined}
                  >
                    <span style={{ color: KIND_COLOR[kind] }}>●</span> {KIND_LABEL[kind]}
                  </button>
                ))}
                <select
                  value={drawAthleteId}
                  onChange={(event) => setDrawAthleteId(event.target.value)}
                  className={selectClass + ' ml-auto'}
                >
                  <option value="">Unassigned player…</option>
                  {roster.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                  ))}
                </select>
              </div>
              <div className="mt-2 text-[11px] text-muted">
                Draw on the film to chart a {KIND_LABEL[drawKind].toLowerCase()}. Paths save with the play below.
              </div>
              {pending.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pending.map((annotation, index) => {
                    const athlete = roster.find((item) => item.id === annotation.athleteId)
                    return (
                      <span
                        key={annotation.id}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-2 py-0.5 text-[11px]"
                      >
                        <span style={{ color: annotation.color }}>●</span>
                        {KIND_LABEL[annotation.kind]}
                        {athlete ? ` · ${athlete.name.split(' ').slice(-1)[0]}` : ''}
                        <button
                          type="button"
                          onClick={() => setPending((prev) => prev.filter((_, i) => i !== index))}
                          className="ml-1 text-muted hover:text-down"
                          aria-label="Remove drawing"
                        >
                          ×
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {canEdit ? (
          <Card className="p-5">
            <SectionTitle right={editingId ? <Pill tone="gold">Editing</Pill> : undefined}>
              {editingId ? 'Edit Play' : 'Tag a Play'}
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.opponent ?? ''}
                onChange={(event) => setField('opponent', event.target.value || undefined)}
                placeholder="Opponent"
                className={inputClass + ' col-span-2'}
                list="film-opponents"
              />
              <datalist id="film-opponents">
                {opponents.map((opp) => (
                  <option key={opp} value={opp} />
                ))}
              </datalist>

              <select
                value={form.down ?? ''}
                onChange={(event) => setField('down', numberField(event.target.value))}
                className={selectClass}
              >
                <option value="">Down…</option>
                {[1, 2, 3, 4].map((down) => (
                  <option key={down} value={down}>{down} down</option>
                ))}
              </select>
              <input
                type="number"
                value={form.distance ?? ''}
                onChange={(event) => setField('distance', numberField(event.target.value))}
                placeholder="Distance (yds)"
                className={inputClass}
              />

              <select
                value={form.hash ?? ''}
                onChange={(event) => setField('hash', (event.target.value || undefined) as FilmPlay['hash'])}
                className={selectClass}
              >
                <option value="">Hash…</option>
                <option value="L">Left hash</option>
                <option value="M">Middle</option>
                <option value="R">Right hash</option>
              </select>
              <input
                type="number"
                value={form.yardLine ?? ''}
                onChange={(event) => setField('yardLine', numberField(event.target.value))}
                placeholder="Yard line"
                className={inputClass}
              />

              <select
                value={form.formation ?? ''}
                onChange={(event) => setField('formation', event.target.value || undefined)}
                className={selectClass}
              >
                <option value="">Formation…</option>
                {FORMATIONS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
              <select
                value={form.personnel ?? ''}
                onChange={(event) => setField('personnel', event.target.value || undefined)}
                className={selectClass}
              >
                <option value="">Personnel…</option>
                {PERSONNEL.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>

              <select
                value={form.call ?? ''}
                onChange={(event) => {
                  const call = (event.target.value || undefined) as PlayCall | undefined
                  setForm((prev) => ({ ...prev, call, concept: undefined }))
                }}
                className={selectClass}
              >
                <option value="">Play type…</option>
                {PLAY_CALLS.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
              <select
                value={form.concept ?? ''}
                onChange={(event) => setField('concept', event.target.value || undefined)}
                className={selectClass}
                disabled={conceptOptions.length === 0}
              >
                <option value="">Concept…</option>
                {conceptOptions.map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>

              <select
                value={form.ballCarrierId ?? ''}
                onChange={(event) => setField('ballCarrierId', event.target.value || undefined)}
                className={selectClass}
              >
                <option value="">Ball carrier…</option>
                {roster.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
                ))}
              </select>
              <input
                type="number"
                value={form.gain ?? ''}
                onChange={(event) => setField('gain', numberField(event.target.value))}
                placeholder="Gain (yds)"
                className={inputClass}
              />

              <input
                value={form.result ?? ''}
                onChange={(event) => setField('result', event.target.value || undefined)}
                placeholder="Result (TD, INT, …)"
                className={inputClass + ' col-span-2'}
              />
              <input
                value={form.note ?? ''}
                onChange={(event) => setField('note', event.target.value || undefined)}
                placeholder="Note (optional)"
                className={inputClass + ' col-span-2'}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={savePlay}
                className="rounded-lg bg-fai px-5 py-2 text-sm font-bold text-ink"
              >
                {editingId ? 'Save changes' : '+ Log Play'}
              </button>
              {(editingId || pending.length > 0 || form.opponent) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-muted hover:text-chalk"
                >
                  Clear
                </button>
              )}
              {pending.length > 0 && <Pill tone="fai">{pending.length} drawn</Pill>}
            </div>
          </Card>
        ) : (
          <Card className="p-5 text-sm text-muted">
            Sign in as a coach to break down film and chart plays. The tendency report below is
            live for everyone.
          </Card>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Scouting report</span>
        <select
          value={opponentFilter}
          onChange={(event) => setOpponentFilter(event.target.value)}
          className={selectClass}
        >
          <option value="">All opponents</option>
          {opponents.map((opp) => (
            <option key={opp} value={opp}>{opp}</option>
          ))}
        </select>
      </div>

      {report.totalPlays === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          No plays charted yet.{canEdit ? ' Load film above and tag a play to start the tendency report.' : ''}
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <TendencyTable title="By Down &amp; Distance" groups={report.byDownDistance} />
          <div className="space-y-6">
            <TendencyTable title="By Formation" groups={report.byFormation} />
            <TendencyTable title="By Personnel" groups={report.byPersonnel} />
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <Card className="p-5">
          <SectionTitle>Charted Plays</SectionTitle>
          <div className="space-y-1.5">
            {recent.map((play) => {
              const carrier = roster.find((item) => item.id === play.ballCarrierId)
              return (
                <div
                  key={play.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-panel-2/40 px-3 py-2 text-sm"
                >
                  {play.opponent && <span className="font-bold text-chalk">{play.opponent}</span>}
                  {play.down && (
                    <Pill>{play.down} &amp; {play.distance ?? '?'}</Pill>
                  )}
                  {play.formation && <span className="text-muted">{labelFor('formation', play.formation)}</span>}
                  {play.call && <Pill tone={play.call === 'run' ? 'gold' : 'fai'}>{labelFor('call', play.call)}</Pill>}
                  {play.concept && <span className="text-xs text-muted">{labelFor('concept', play.concept)}</span>}
                  {carrier && <span className="text-xs text-muted">· {carrier.name}</span>}
                  {typeof play.gain === 'number' && (
                    <span className={`text-xs font-bold nums ${play.gain >= 0 ? 'text-up' : 'text-down'}`}>
                      {play.gain >= 0 ? '+' : ''}{play.gain}
                    </span>
                  )}
                  {play.annotations && play.annotations.length > 0 && (
                    <Pill tone="fai">✎ {play.annotations.length}</Pill>
                  )}
                  {canEdit && (
                    <div className="ml-auto flex items-center gap-1">
                      {typeof play.videoTimeSec === 'number' && (
                        <button
                          type="button"
                          onClick={() => jumpTo(play)}
                          className="rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-fai/40 hover:text-chalk"
                        >
                          ⤳ {Math.round(play.videoTimeSec)}s
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => editPlay(play)}
                        className="rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-fai/40 hover:text-chalk"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFilmPlay(play.id)}
                        className="rounded-md border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-down/40 hover:text-down"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
