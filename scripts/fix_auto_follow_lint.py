from pathlib import Path

p = Path('src/pages/FilmRoom.tsx')
s = p.read_text()

old = """  const lowConfidenceFramesRef = useRef(0)

  const [sourceLabel, setSourceLabel] = useState<string>('')
"""
new = """  const lowConfidenceFramesRef = useRef(0)
  const nextTrackIdRef = useRef(0)

  const [sourceLabel, setSourceLabel] = useState<string>('')
"""
if old not in s:
    raise SystemExit('Missing track id ref marker')
s = s.replace(old, new, 1)

old = """    const label = trackLabel.trim() || athlete?.name || role || `Player ${formationTracks.length + 1}`
    const track = createPlayerTrack({
      id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
"""
new = """    const label = trackLabel.trim() || athlete?.name || role || `Player ${formationTracks.length + 1}`
    let trackId: string
    do {
      nextTrackIdRef.current += 1
      trackId = `track-local-${nextTrackIdRef.current}`
    } while (playerTracks.some((item) => item.id === trackId))
    const track = createPlayerTrack({
      id: trackId,
"""
if old not in s:
    raise SystemExit('Missing generated track id marker')
s = s.replace(old, new, 1)

old = """  useEffect(() => {
    return () => {
      const video = videoRef.current as FrameCallbackVideo | null
      if (autoFrameRequestRef.current !== undefined) video?.cancelVideoFrameCallback?.(autoFrameRequestRef.current)
"""
new = """  useEffect(() => {
    const video = videoRef.current as FrameCallbackVideo | null
    return () => {
      if (autoFrameRequestRef.current !== undefined) video?.cancelVideoFrameCallback?.(autoFrameRequestRef.current)
"""
if old not in s:
    raise SystemExit('Missing video cleanup marker')
s = s.replace(old, new, 1)

p.write_text(s)
