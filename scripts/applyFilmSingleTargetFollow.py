from pathlib import Path

path = Path('src/pages/FilmRoom.tsx')
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    if old in text:
        text = text.replace(old, new, 1)
        return
    if new in text:
        return
    raise SystemExit(f'Missing patch target:\n{old[:260]}')


replace_once(
    "import { followViewForAthlete } from '../lib/filmAutoFollowViewport'",
    "import { followViewForAthlete } from '../lib/filmAutoFollowViewport'\nimport { shouldShowTrackLabel, tracksForFilmStage } from '../lib/filmTrackDisplay'",
)

replace_once(
    "  activeTrackId,\n  followPoint,",
    "  activeTrackId,\n  focusActiveTrack,\n  followPoint,",
)
replace_once(
    "  activeTrackId?: string\n  followPoint?: Pick<FilmAnnotationPoint, 'x' | 'y'>",
    "  activeTrackId?: string\n  focusActiveTrack?: boolean\n  followPoint?: Pick<FilmAnnotationPoint, 'x' | 'y'>",
)

replace_once(
    "    for (const track of annotations.filter(isPlayerTrack)) {",
    "    const visiblePlayerTracks = tracksForFilmStage(annotations, { activeTrackId, focusActiveTrack })\n    for (const track of visiblePlayerTracks) {",
)
replace_once(
    "      const label = track.label?.trim()\n      if (label) {",
    "      const label = track.label?.trim()\n      if (label && shouldShowTrackLabel(track, { activeTrackId, focusActiveTrack })) {",
)
replace_once(
    "  useEffect(redraw, [annotations, drawColor, drawKind, currentTime, activeTrackId, throwAnalysis, activeThrowLandmark])",
    "  useEffect(redraw, [annotations, drawColor, drawKind, currentTime, activeTrackId, focusActiveTrack, throwAnalysis, activeThrowLandmark])",
)
replace_once(
    "? followViewForAthlete(view, followPoint, { smoothing: 1, width: followStageWidth, height: followStageWidth * 9 / 16 })",
    "? followViewForAthlete(view, followPoint, { smoothing: 1, minimumZoom: 2.2, deadZone: 0.035, width: followStageWidth, height: followStageWidth * 9 / 16 })",
)

replace_once(
    "  const [autoFollowPoint, setAutoFollowPoint] = useState<Pick<FilmAnnotationPoint, 'x' | 'y'>>()\n  const [autoArmed, setAutoArmed] = useState(false)",
    "  const [autoFollowPoint, setAutoFollowPoint] = useState<Pick<FilmAnnotationPoint, 'x' | 'y'>>()\n  const [showAllTracksDuringFollow, setShowAllTracksDuringFollow] = useState(false)\n  const [autoArmed, setAutoArmed] = useState(false)",
)
replace_once(
    "    setAutoFollowPoint(point)\n    setAutoArmed(false)",
    "    setAutoFollowPoint(point)\n    setShowAllTracksDuringFollow(false)\n    setAutoArmed(false)",
)
replace_once(
    "    setTrackingMessage('Auto-follow is running. FAI will stop and ask for a correction if confidence drops.')",
    "    setTrackingMessage('Single-target auto-follow is running. Unrelated player labels and trails are hidden unless Show all tracks is enabled.')",
)
replace_once(
    "    stopAutoFollow('armed', undefined, true)\n    setAutoArmed(true)",
    "    stopAutoFollow('armed', undefined, true)\n    setShowAllTracksDuringFollow(false)\n    setAutoArmed(true)",
)
replace_once(
    "    setAutoMotionCompensated(false)\n    setFormationStartTime(undefined)",
    "    setAutoMotionCompensated(false)\n    setShowAllTracksDuringFollow(false)\n    setFormationStartTime(undefined)",
)

replace_once(
    "  function metricText(value: number | undefined, digits: number, suffix: string): string {\n    return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—'\n  }\n\n  return (",
    "  function metricText(value: number | undefined, digits: number, suffix: string): string {\n    return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : '—'\n  }\n\n  const focusedAutoFollow = Boolean(activeTrackId)\n    && !showAllTracksDuringFollow\n    && (autoStatus === 'running' || autoStatus === 'armed' || autoStatus === 'lost')\n\n  return (",
)
replace_once(
    "            activeTrackId={activeTrackId}\n            followPoint={autoStatus === 'running' ? autoFollowPoint : undefined}",
    "            activeTrackId={activeTrackId}\n            focusActiveTrack={focusedAutoFollow}\n            followPoint={autoStatus === 'running' ? autoFollowPoint : undefined}",
)

replace_once(
    "                <button type=\"button\" onClick={() => stopAutoFollow('ready', 'Auto-follow paused.')} disabled={autoStatus !== 'running'} className=\"rounded-lg border border-down/40 px-3 py-2 text-xs font-black text-down disabled:opacity-40\">■ Stop</button>\n                <button type=\"button\" onClick={() => stepFrame(-1)}",
    "                <button type=\"button\" onClick={() => stopAutoFollow('ready', 'Auto-follow paused.')} disabled={autoStatus !== 'running'} className=\"rounded-lg border border-down/40 px-3 py-2 text-xs font-black text-down disabled:opacity-40\">■ Stop</button>\n                <label className=\"inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-panel-2/60 px-3 text-[11px] font-black text-muted\">\n                  <input\n                    type=\"checkbox\"\n                    checked={showAllTracksDuringFollow}\n                    onChange={(event) => setShowAllTracksDuringFollow(event.target.checked)}\n                    className=\"accent-fai\"\n                  />\n                  Show all tracks\n                </label>\n                {focusedAutoFollow && <Pill tone=\"fai\">Single-target view</Pill>}\n                <button type=\"button\" onClick={() => stepFrame(-1)}",
)

path.write_text(text)
