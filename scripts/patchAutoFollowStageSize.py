from pathlib import Path

path = Path('src/pages/FilmRoom.tsx')
text = path.read_text()
old = "? followViewForAthlete(view, followPoint, { smoothing: 1 })"
new = "? followViewForAthlete(view, followPoint, { ...stageSize(), smoothing: 1, width: stageSize().w, height: stageSize().h })"
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Stage-size follow patch target not found')
path.write_text(text)
