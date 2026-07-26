from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing marker: {label}')
    return text.replace(old, new, 1)


p = Path('src/pages/FilmRoom.tsx')
s = p.read_text()

s = replace_once(
    s,
    """  currentTime,
  onTimeChange,
  onCommitPath,
""",
    """  currentTime,
  onTimeChange,
  onDurationChange,
  onPlayingChange,
  onCommitPath,
""",
    'FilmStage destructured callbacks',
)
s = replace_once(
    s,
    """  currentTime: number
  onTimeChange: (time: number) => void
  onCommitPath: (points: FilmAnnotationPoint[]) => void
""",
    """  currentTime: number
  onTimeChange: (time: number) => void
  onDurationChange: (duration: number) => void
  onPlayingChange: (playing: boolean) => void
  onCommitPath: (points: FilmAnnotationPoint[]) => void
""",
    'FilmStage callback types',
)
s = replace_once(
    s,
    """          onLoadedMetadata={(event) => onTimeChange(event.currentTarget.currentTime)}
          onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime)}
          onSeeked={(event) => onTimeChange(event.currentTarget.currentTime)}
""",
    """          onLoadedMetadata={(event) => {
            const video = event.currentTarget
            onTimeChange(video.currentTime)
            onDurationChange(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0)
          }}
          onDurationChange={(event) => {
            const duration = event.currentTarget.duration
            onDurationChange(Number.isFinite(duration) && duration > 0 ? duration : 0)
          }}
          onTimeUpdate={(event) => onTimeChange(event.currentTarget.currentTime)}
          onSeeked={(event) => onTimeChange(event.currentTarget.currentTime)}
          onPlay={() => onPlayingChange(true)}
          onPause={() => onPlayingChange(false)}
          onEnded={() => onPlayingChange(false)}
""",
    'video timing events',
)
s = replace_once(
    s,
    """  const [videoTime, setVideoTime] = useState(0)
  const [trackingMessage, setTrackingMessage] = useState<string>()
""",
    """  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [trackingMessage, setTrackingMessage] = useState<string>()
""",
    'video scrub state',
)
s = replace_once(
    s,
    """    setSourceLabel(file.name)
    setVideoTime(0)
    setForm((prev) => ({ ...prev, filmLabel: prev.filmLabel || file.name }))
""",
    """    setSourceLabel(file.name)
    setVideoTime(0)
    setVideoDuration(0)
    setVideoPlaying(false)
    setForm((prev) => ({ ...prev, filmLabel: prev.filmLabel || file.name }))
""",
    'load file timing reset',
)
s = replace_once(
    s,
    """      streamRef.current = stream
      const video = videoRef.current
""",
    """      streamRef.current = stream
      setVideoTime(0)
      setVideoDuration(0)
      setVideoPlaying(false)
      const video = videoRef.current
""",
    'screen capture timing reset',
)
s = replace_once(
    s,
    """  function stepFrame(direction: -1 | 1) {
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
""",
    """  function seekVideo(nextTime: number) {
    const video = videoRef.current
    if (!video || !Number.isFinite(nextTime)) return
    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : videoDuration
    const upper = duration > 0 ? duration : Math.max(0, nextTime)
    const next = Math.max(0, Math.min(upper, nextTime))
    video.pause()
    try {
      video.currentTime = next
    } catch {
      return
    }
    setVideoTime(next)
  }

  function seekBy(seconds: number) {
    seekVideo((videoRef.current?.currentTime ?? videoTime) + seconds)
  }

  function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }

  function stepFrame(direction: -1 | 1) {
    seekBy(direction * TRACK_FRAME_SECONDS)
  }
""",
    'seek helpers',
)
s = replace_once(
    s,
    """    setTrackingMessage(undefined)
    setVideoTime(0)
  }
""",
    """    setTrackingMessage(undefined)
    setVideoTime(0)
    setVideoPlaying(false)
  }
""",
    'reset playback state',
)
s = replace_once(
    s,
    """            currentTime={videoTime}
            onTimeChange={setVideoTime}
            onCommitPath={commitPath}
""",
    """            currentTime={videoTime}
            onTimeChange={setVideoTime}
            onDurationChange={setVideoDuration}
            onPlayingChange={setVideoPlaying}
            onCommitPath={commitPath}
""",
    'FilmStage scrub props',
)
s = replace_once(
    s,
    """          />
          <div className=\"flex flex-wrap items-center gap-2\">
""",
    """          />
          <div className=\"rounded-xl border border-line bg-panel-2/40 p-3\" aria-label=\"Video scrub controls\">
            <div className=\"flex items-center gap-2\">
              <button
                type=\"button\"
                onClick={() => seekBy(-5)}
                className=\"min-h-11 rounded-lg border border-line bg-panel px-3 text-xs font-black text-chalk disabled:opacity-40\"
                disabled={videoDuration <= 0}
                aria-label=\"Back 5 seconds\"
              >
                −5s
              </button>
              <button
                type=\"button\"
                onClick={togglePlayback}
                className=\"grid min-h-11 min-w-12 place-items-center rounded-lg border border-fai/40 bg-fai/10 px-3 text-sm font-black text-fai\"
                aria-label={videoPlaying ? 'Pause video' : 'Play video'}
              >
                {videoPlaying ? 'Ⅱ' : '▶'}
              </button>
              <input
                type=\"range\"
                min={0}
                max={Math.max(0, videoDuration)}
                step={0.01}
                value={videoDuration > 0 ? Math.min(videoTime, videoDuration) : 0}
                onPointerDown={() => videoRef.current?.pause()}
                onChange={(event) => seekVideo(Number(event.target.value))}
                disabled={videoDuration <= 0}
                aria-label=\"Scrub video\"
                aria-valuetext={`${formatTrackTime(videoTime)} of ${formatTrackTime(videoDuration)}`}
                className=\"h-11 min-w-0 flex-1 cursor-pointer accent-fai disabled:cursor-not-allowed disabled:opacity-40\"
                style={{ touchAction: 'pan-y' }}
              />
              <button
                type=\"button\"
                onClick={() => seekBy(5)}
                className=\"min-h-11 rounded-lg border border-line bg-panel px-3 text-xs font-black text-chalk disabled:opacity-40\"
                disabled={videoDuration <= 0}
                aria-label=\"Forward 5 seconds\"
              >
                +5s
              </button>
            </div>
            <div className=\"mt-1 flex items-center justify-between gap-3 text-[11px] font-bold text-muted\">
              <span>Drag the bar to scrub anywhere in the clip.</span>
              <span className=\"shrink-0 text-fai nums\" data-testid=\"video-time-display\">
                {formatTrackTime(videoTime)} / {videoDuration > 0 ? formatTrackTime(videoDuration) : sourceLabel === 'Live screen capture' ? 'LIVE' : '0:00.00'}
              </span>
            </div>
          </div>
          <div className=\"flex flex-wrap items-center gap-2\">
""",
    'external scrub controls',
)

p.write_text(s)

Path('e2e/film-scrubbing.spec.ts').write_text("""import { test, expect } from '@playwright/test'

test('coach can scrub Film Room video with the external timeline', async ({ page }) => {
  await page.goto('/#/film')
  await expect(page.getByRole('heading', { name: /Film Room/i })).toBeVisible({ timeout: 15000 })

  const video = page.locator('video').first()
  await video.evaluate((element) => {
    Object.defineProperty(element, 'duration', { configurable: true, value: 20 })
    Object.defineProperty(element, 'currentTime', { configurable: true, writable: true, value: 0 })
    element.dispatchEvent(new Event('loadedmetadata'))
  })

  const scrubber = page.getByLabel('Scrub video')
  await expect(scrubber).toBeEnabled()
  await scrubber.evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = '12.5'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  await expect(page.getByTestId('video-time-display')).toContainText('0:12.50 / 0:20.00')
  await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeCloseTo(12.5, 2)

  await page.getByRole('button', { name: 'Back 5 seconds' }).click()
  await expect(page.getByTestId('video-time-display')).toContainText('0:07.50 / 0:20.00')
})
""")
