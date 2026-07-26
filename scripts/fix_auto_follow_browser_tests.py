from pathlib import Path

p = Path('e2e/film-tracking.spec.ts')
s = p.read_text()
s = s.replace(
    "await expect(page.getByText('Coach-assisted player tracking')).toBeVisible()",
    "await expect(page.getByText('11-player auto-follow and formation builder')).toBeVisible()",
    1,
)
s = s.replace(
    "await page.getByRole('button', { name: 'Start player track' }).click()",
    "await page.getByRole('button', { name: 'Add player 1/11' }).click()",
    1,
)
s = s.replace(
    "await expect(page.getByText(/Keyframe saved at/)).toBeVisible()",
    "await expect(page.getByText(/Manual point saved at/)).toBeVisible()",
    1,
)
p.write_text(s)

p = Path('e2e/film-formation-builder.spec.ts')
s = p.read_text()
s = s.replace(
    "await expect(page.getByText('11/11 located')).toBeVisible()",
    "await expect(page.getByTestId('formation-board').getByText('11/11 located')).toBeVisible()",
    1,
)
p.write_text(s)

p = Path('src/pages/FilmRoom.tsx')
s = p.read_text()
old = """                <button
                  type="button"
                  onClick={createTrack}
                  className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink"
                >
                  Add player {formationTracks.length + 1}/11
                </button>
"""
new = """                <button
                  type="button"
                  onClick={createTrack}
                  disabled={formationTracks.length >= 11}
                  className="rounded-lg bg-fai px-4 py-2 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {formationTracks.length >= 11 ? 'Unit full — 11/11' : `Add player ${formationTracks.length + 1}/11`}
                </button>
"""
if old not in s:
    raise SystemExit('Add player button marker not found')
p.write_text(s.replace(old, new, 1))
