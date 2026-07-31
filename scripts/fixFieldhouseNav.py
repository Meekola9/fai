from pathlib import Path

path = Path('src/index.css')
text = path.read_text()
old = ".nav-strip {\n  display: flex;\n  align-items: center;"
new = ".nav-strip {\n  align-items: center;"
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('Missing nav-strip target')
path.write_text(text)
