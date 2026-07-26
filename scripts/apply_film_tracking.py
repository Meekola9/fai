from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing marker: {label}')
    return text.replace(old, new, 1)


# Extend the annotation JSON shape without requiring a new database column.
p = Path('src/types.ts')
s = p.read_text()
s = replace_once(
    s,
    """  label?: string
  color?: string
  points: FilmAnnotationPoint[]
""",
    """  label?: string
  color?: string
  /** True when this trail is a coach-assisted timed player track. */
  tracking?: boolean
  /** Unit assignment used to color and group a timed player track. */
  trackingSide?: PlaySide
  points: FilmAnnotationPoint[]
""",
    'FilmAnnotation tracking metadata',
)
p.write_text(s)


p = Path('src/pages/FilmRoom.tsx')
s = p.read_text()
s = replace_once(
    s,
    """  FilmPlay,
  PlayCall,
} from '../types'
""",
    """  FilmPlay,
  PlayCall,
  PlaySide,
} from '../types'
""",
    'FilmRoom PlaySide import',
)
s = replace_once(
    s,
    """} from '../lib/filmAnalysis'
""",
    """} from '../lib/filmAnalysis'
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
""",
    'film tracking imports',
)
s = replace_once(
    s,
    """type FormState = Partial<FilmPlay>
""",
    """type FormState = Partial<FilmPlay>
type FilmToolMode = 'draw' | 'track'
""",
    'film tool mode',
)

old_stage = """function FilmStage({
  videoRef,
  annotations,
  drawKind,
  drawColor,
  onCommitPath,
  canDraw,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  annotations: FilmAnnotation[]
  drawKind: FilmAnnotationKind
  drawColor: string
  onCommitPath: (points: FilmAnnotationPoint[]) => void
  canDraw: boolean
}) {
"""
new_stage = """function FilmStage({
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
"""
s = replace_once(s, old_stage, new_stage, 'FilmStage props')

s = replace_once(
    s,
    """      ...annotations.map((a) => ({
        points: a.points,
        color: a.color ?? KIND_COLOR[a.kind],
        kind: a.kind,
      })),
""",
    """      ...annotations.filter((annotation) => !isPlayerTrack(annotation)).map((a) => ({
        points: a.points,
        color: a.color ?? KIND_COLOR[a.kind],
        kind: a.kind,
      })),
""",
    'exclude timed tracks from static drawings',
)

old_loop = """    for (const path of paths) {
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
  }
"""
new_loop = """    for (const path of paths) {
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
"""
s = replace_once(s, old_loop, new_loop, 'FilmStage draw loop')

s = replace_once(
    s,
    """  useEffect(redraw, [annotations, drawColor, drawKind])
""",
    """  useEffect(redraw, [annotations, drawColor, drawKind, currentTime, activeTrackId])
""",
    'FilmStage redraw dependencies',
)

s = replace_once(
    s,
    """          controls
          playsInline
        />
""",
    """          controls
          playsInline
          onLoadedMetadata={(event) => onTimeChange(event.currentTarget.currentTime)}
          onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime)}
          onSeeked={(event) => onTimeChange(event.currentTarget.currentTime)}
        />
""",
    'video time events',
)

s = replace_once(
    s,
    """          className={`absolute inset-0 h-full w-full ${canDraw ? 'cursor-crosshair' : 'pointer-events-none'}`}
""",
    """          className={`absolute inset-0 h-full w-full ${canDraw ? (toolMode === 'track' ? 'cursor-cell' : 'cursor-crosshair') : 'pointer-events-none'}`}
""",
    'canvas cursor mode',
)

s = replace_once(
    s,
    """          onPointerDown={(event) => {
            if (!canDraw) return
            ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
            drawingRef.current = [pointFrom(event)]
            forceTick((n) => n + 1)
          }}
          onPointerMove={(event) => {
            if (!canDraw || !drawingRef.current) return
            drawingRef.current.push(pointFrom(event))
            redraw()
          }}
          onPointerUp={() => {
            if (!canDraw || !drawingRef.current) return
            const points = drawingRef.current
            drawingRef.current = null
            if (points.length >= 2) onCommitPath(points)
            forceTick((n) => n + 1)
          }}
""",
    """          onPointerDown={(event) => {
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
""",
    'canvas tracking interaction',
)

s = replace_once(
    s,
    """  const [drawKind, setDrawKind] = useState<FilmAnnotationKind>('route')
  const [drawAthleteId, setDrawAthleteId] = useState('')

  const [opponentFilter, setOpponentFilter] = useState('')
""",
    """  const [drawKind, setDrawKind] = useState<FilmAnnotationKind>('route')
  const [drawAthleteId, setDrawAthleteId] = useState('')
  const [toolMode, setToolMode] = useState<FilmToolMode>('draw')
  const [activeTrackId, setActiveTrackId] = useState<string>()
  const [trackAthleteId, setTrackAthleteId] = useState('')
  const [trackLabel, setTrackLabel] = useState('')
  const [trackSide, setTrackSide] = useState<PlaySide>('offense')
  const [videoTime, setVideoTime] = useState(0)
  const [trackingMessage, setTrackingMessage] = useState<string>()

  const [opponentFilter, setOpponentFilter] = useState('')
""",
    'tracking state',
)

s = replace_once(
    s,
    """  const conceptOptions = form.call ? CONCEPTS_BY_CALL[form.call] ?? [] : []
""",
    """  const conceptOptions = form.call ? CONCEPTS_BY_CALL[form.call] ?? [] : []
  const playerTracks = pending.filter(isPlayerTrack)
  const activeTrack = playerTracks.find((track) => track.id === activeTrackId)
""",
    'derived player tracks',
)

s = replace_once(
    s,
    """    setSourceLabel(file.name)
    setForm((prev) => ({ ...prev, filmLabel: prev.filmLabel || file.name }))
""",
    """    setSourceLabel(file.name)
    setVideoTime(0)
    setForm((prev) => ({ ...prev, filmLabel: prev.filmLabel || file.name }))
""",
    'reset video time on file load',
)

s = replace_once(
    s,
    """  function commitPath(points: FilmAnnotationPoint[]) {
    const annotation: FilmAnnotation = {
      id: `anno-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: drawKind,
      athleteId: drawAthleteId || undefined,
      color: KIND_COLOR[drawKind],
      points,
    }
    setPending((prev) => [...prev, annotation])
  }

  function resetForm() {
""",
    """  function commitPath(points: FilmAnnotationPoint[]) {
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
""",
    'tracking functions',
)

s = replace_once(
    s,
    """    setPending([])
    setEditingId(null)
  }
""",
    """    setPending([])
    setEditingId(null)
    setActiveTrackId(undefined)
    setTrackingMessage(undefined)
    setVideoTime(0)
  }
""",
    'reset tracking form',
)

s = replace_once(
    s,
    """    setPending(play.annotations ?? [])
    setOpponentFilter('')
""",
    """    const annotations = play.annotations ?? []
    setPending(annotations)
    const firstTrack = annotations.find(isPlayerTrack)
    setActiveTrackId(firstTrack?.id)
    setToolMode(firstTrack ? 'track' : 'draw')
    setTrackingMessage(firstTrack ? 'Saved player tracking loaded. Select a player and continue correcting keyframes.' : undefined)
    setOpponentFilter('')
""",
    'load saved tracks while editing',
)

s = replace_once(
    s,
    """      Break down film, tag formations &amp; plays, chart routes and trails, and build the
          opponent tendency report. Speed &amp; auto-detection plug in here next.
""",
    """      Break down film, tag formations &amp; plays, coach-track players with timed keyframes,
          chart routes and trails, and build the opponent tendency report.
""",
    'Film Room description',
)

s = replace_once(
    s,
    """            drawColor={KIND_COLOR[drawKind]}
            onCommitPath={commitPath}
            canDraw={canEdit}
""",
    """            drawColor={KIND_COLOR[drawKind]}
            toolMode={toolMode}
            activeTrackId={activeTrackId}
            currentTime={videoTime}
            onTimeChange={setVideoTime}
            onCommitPath={commitPath}
            onCommitTrackPoint={commitTrackPoint}
            canDraw={canEdit}
""",
    'FilmStage tracking props',
)

marker = """          {canEdit && (
            <div className="rounded-xl border border-line bg-panel-2/30 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Draw</span>
"""
replacement = """          {canEdit && (
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
"""
s = replace_once(s, marker, replacement, 'tracking and drawing panels')

p.write_text(s)
