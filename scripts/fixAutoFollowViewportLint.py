from pathlib import Path

path = Path('src/pages/FilmRoom.tsx')
text = path.read_text()
old = """  useEffect(() => {
    if (!followPoint) return
    setView((current) => followViewForAthlete(current, followPoint))
  }, [followPoint])

  const zoomed = view.zoom > 1.001
"""
new = """  const displayView = followPoint
    ? followViewForAthlete(view, followPoint, { smoothing: 1 })
    : view
  const zoomed = displayView.zoom > 1.001
"""
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Viewport effect patch target not found')
text = text.replace('transform: viewTransform(view),', 'transform: viewTransform(displayView),', 1)
text = text.replace('value={view.zoom}', 'value={displayView.zoom}', 1)
text = text.replace('{view.zoom.toFixed(1)}×', '{displayView.zoom.toFixed(1)}×', 1)
path.write_text(text)
