from pathlib import Path

p = Path('src/lib/filmAutoTracking.test.ts')
s = p.read_text()
old = """      const stripe = ((px + 8) % 5 === 0 || (py + 13) % 7 === 0) ? 225 : 118
      pixels[targetY * width + targetX] = stripe
"""
new = """      const head = py < -8 ? 205 - Math.abs(px) * 4 : undefined
      const jerseyNumber = Math.abs(px) <= 2 && py >= -5 && py <= 5 ? 242 : undefined
      const bodyTexture = 72 + (px + 8) * 4 + (py + 13) * 2
      pixels[targetY * width + targetX] = Math.max(0, Math.min(255, jerseyNumber ?? head ?? bodyTexture))
"""
if old not in s:
    raise SystemExit('Synthetic player pattern marker not found')
p.write_text(s.replace(old, new, 1))
