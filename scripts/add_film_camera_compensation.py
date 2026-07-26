from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing marker: {label}')
    return text.replace(old, new, 1)


# Persist camera/zoom/blur diagnostics with automatic route points.
p = Path('src/types.ts')
s = p.read_text()
s = replace_once(
    s,
    """  /** 0-1 visual match confidence for automatic points. */
  confidence?: number
""",
    """  /** 0-1 visual match confidence for automatic points. */
  confidence?: number
  /** Estimated whole-frame horizontal camera shift, normalized to frame width. */
  cameraDx?: number
  /** Estimated whole-frame vertical camera shift, normalized to frame height. */
  cameraDy?: number
  /** Per-frame camera zoom ratio used to compensate the point. */
  cameraScale?: number
  /** Estimated 0-1 motion/defocus blur level for the source frame. */
  blurLevel?: number
  /** Player-template scale relative to the coach-selected starting frame. */
  playerScale?: number
  /** True when whole-frame pan/tilt/zoom compensation materially changed prediction. */
  motionCompensated?: boolean
""",
    'FilmAnnotationPoint diagnostics',
)
p.write_text(s)


# Wire tracker diagnostics into Film Room state, saved points, confidence handling, and live stats.
p = Path('src/pages/FilmRoom.tsx')
s = p.read_text()
s = replace_once(
    s,
    """  const [autoConfidence, setAutoConfidence] = useState(0)
  const [autoFrameCount, setAutoFrameCount] = useState(0)
  const [autoArmed, setAutoArmed] = useState(false)
""",
    """  const [autoConfidence, setAutoConfidence] = useState(0)
  const [autoFrameCount, setAutoFrameCount] = useState(0)
  const [autoCameraDx, setAutoCameraDx] = useState(0)
  const [autoCameraDy, setAutoCameraDy] = useState(0)
  const [autoCameraScale, setAutoCameraScale] = useState(1)
  const [autoBlurLevel, setAutoBlurLevel] = useState(0)
  const [autoPlayerScale, setAutoPlayerScale] = useState(1)
  const [autoMotionCompensated, setAutoMotionCompensated] = useState(false)
  const [autoArmed, setAutoArmed] = useState(false)
""",
    'Film Room diagnostic state',
)
s = replace_once(
    s,
    """    const point: FilmAnnotationPoint = {
      ...sample.point,
      t: mediaTime,
      source: 'auto',
      confidence: sample.confidence,
    }
""",
    """    const point: FilmAnnotationPoint = {
      ...sample.point,
      t: mediaTime,
      source: 'auto',
      confidence: sample.confidence,
      cameraDx: sample.camera.dx,
      cameraDy: sample.camera.dy,
      cameraScale: sample.camera.scale,
      blurLevel: sample.blurLevel,
      playerScale: sample.playerScale,
      motionCompensated: sample.compensated,
    }
""",
    'saved auto diagnostics',
)
s = replace_once(
    s,
    """    setVideoTime(mediaTime)
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
""",
    """    setVideoTime(mediaTime)
    setAutoConfidence(sample.confidence)
    setAutoFrameCount((count) => count + 1)
    setAutoCameraDx(sample.camera.dx)
    setAutoCameraDy(sample.camera.dy)
    setAutoCameraScale(sample.camera.scale)
    setAutoBlurLevel(sample.blurLevel)
    setAutoPlayerScale(sample.playerScale)
    setAutoMotionCompensated(sample.compensated)

    // Motion-blurred Hudl pans often produce a few soft frames even when the
    // compensated route remains coherent. Give those frames a wider recovery
    // window without allowing a sustained low-confidence drift.
    const lowConfidenceThreshold = sample.blurLevel >= 0.55 ? 0.38 : 0.48
    const allowedLowConfidenceFrames = sample.blurLevel >= 0.55 ? 7 : 4
    lowConfidenceFramesRef.current = sample.confidence < lowConfidenceThreshold
      ? lowConfidenceFramesRef.current + 1
      : 0
    if (lowConfidenceFramesRef.current >= allowedLowConfidenceFrames) {
      setAutoArmed(true)
      stopAutoFollow(
        'lost',
        `Tracking confidence fell to ${Math.round(sample.confidence * 100)}%${sample.blurLevel >= 0.55 ? ' during a blurred camera move' : ''}. Tap the player once to correct and continue.`,
      )
      return
    }
""",
    'blur-aware confidence handling',
)
s = replace_once(
    s,
    """    setAutoFrameCount(0)
    setAutoConfidence(1)
    setAutoArmed(false)
""",
    """    setAutoFrameCount(0)
    setAutoConfidence(1)
    setAutoCameraDx(0)
    setAutoCameraDy(0)
    setAutoCameraScale(1)
    setAutoBlurLevel(0)
    setAutoPlayerScale(1)
    setAutoMotionCompensated(false)
    setAutoArmed(false)
""",
    'auto start diagnostic reset',
)
s = replace_once(
    s,
    """    setAutoFrameCount(0)
    setAutoConfidence(0)
    setFormationStartTime(undefined)
""",
    """    setAutoFrameCount(0)
    setAutoConfidence(0)
    setAutoCameraDx(0)
    setAutoCameraDy(0)
    setAutoCameraScale(1)
    setAutoBlurLevel(0)
    setAutoPlayerScale(1)
    setAutoMotionCompensated(false)
    setFormationStartTime(undefined)
""",
    'form reset diagnostics',
)
s = replace_once(
    s,
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
""",
    """              {activeTrack && activeStats && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-11" aria-label="Live tracking stats">
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Status</div><div className="text-xs font-black text-fai">{autoStatus}</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Confidence</div><div className="text-xs font-black text-chalk nums">{Math.round((autoStatus === 'running' ? autoConfidence : activeStats.averageConfidence) * 100)}%</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Auto frames</div><div className="text-xs font-black text-chalk nums">{Math.max(autoFrameCount, activeStats.autoFrames)}</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Duration</div><div className="text-xs font-black text-chalk nums">{activeStats.durationSec.toFixed(2)}s</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Screen distance</div><div className="text-xs font-black text-chalk nums">{activeStats.screenDistancePct.toFixed(1)}%</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Corrections</div><div className="text-xs font-black text-chalk nums">{activeStats.manualCorrections}</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Camera shift</div><div className="text-xs font-black text-chalk nums">{(Math.hypot(autoCameraDx, autoCameraDy) * 100).toFixed(1)}%</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Camera zoom</div><div className="text-xs font-black text-chalk nums">{autoCameraScale.toFixed(3)}×</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Motion blur</div><div className="text-xs font-black text-chalk nums">{Math.round(autoBlurLevel * 100)}%</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Player scale</div><div className="text-xs font-black text-chalk nums">{autoPlayerScale.toFixed(2)}×</div></div>
                  <div className="rounded-lg border border-line bg-panel p-2"><div className="text-[9px] uppercase text-muted">Tracking mode</div><div className={`text-xs font-black ${autoMotionCompensated ? 'text-up' : 'text-muted'}`}>{autoMotionCompensated ? 'compensated' : 'local'}</div></div>
                </div>
              )}
""",
    'expanded live stats',
)
p.write_text(s)


# Browser regression: the diagnostics must be visible once a track has a point.
p = Path('e2e/film-tracking.spec.ts')
s = p.read_text()
s = replace_once(
    s,
    """  await expect(page.getByText(/Active: Boundary WR · 1 confirmed/)).toBeVisible()
  await expect(page.getByText(/Manual point saved at/)).toBeVisible()
})
""",
    """  await expect(page.getByText(/Active: Boundary WR · 1 confirmed/)).toBeVisible()
  await expect(page.getByText(/Manual point saved at/)).toBeVisible()
  const stats = page.getByLabel('Live tracking stats')
  await expect(stats.getByText('Camera shift')).toBeVisible()
  await expect(stats.getByText('Camera zoom')).toBeVisible()
  await expect(stats.getByText('Motion blur')).toBeVisible()
  await expect(stats.getByText('Player scale')).toBeVisible()
  await expect(stats.getByText('Tracking mode')).toBeVisible()
})
""",
    'Film tracking browser diagnostics',
)
p.write_text(s)
