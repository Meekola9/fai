from pathlib import Path

p = Path('e2e/film-scrubbing.spec.ts')
s = p.read_text()
old = """  await scrubber.evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = '12.5'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
"""
new = """  await scrubber.fill('12.5')
"""
if old not in s:
    raise SystemExit('Scrubber test interaction marker not found')
p.write_text(s.replace(old, new, 1))
