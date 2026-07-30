from pathlib import Path

path = Path('src/pages/FilmRoom.tsx')
text = path.read_text()
old = """  const displayView = followPoint
    ? followViewForAthlete(view, followPoint, { smoothing: 1, width: stageSize().w, height: stageSize().h })
    : view
"""
new = """  const followStageWidth = typeof window === 'undefined'
    ? 1
    : window.innerWidth >= 1024
      ? Math.max(1, Math.min(window.innerWidth - 32, 1280) * 0.6)
      : Math.max(1, window.innerWidth - 24)
  const displayView = followPoint
    ? followViewForAthlete(view, followPoint, { smoothing: 1, width: followStageWidth, height: followStageWidth * 9 / 16 })
    : view
"""
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Render-safe dimension patch target not found')
path.write_text(text)
