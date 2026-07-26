#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Fetch the generated NBA-2K-style badge medallions into src/assets/badges/.
//
// Run this from any machine/environment where the image CDN is reachable
// (a normal dev box works; the locked-down CI/agent sandbox does not):
//
//     node scripts/fetch-badge-art.mjs
//
// Each file is saved as <badge-id>.webp, which is exactly what BadgeArtwork
// picks up automatically — no code change needed once the files exist.
//
// NOTE: these are time-limited generation-CDN URLs. If a link 404s, the art
// was regenerated — re-run the badge generation and refresh the URL here.
// ---------------------------------------------------------------------------
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/assets/badges')

const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3F2YTTdr0Q4RI46KjwlFaEmqmjr'

/** badge id -> generated medallion (min webp). */
const ART = {
  'first-mark': `${BASE}/hf_20260726_211250_f6037391-a646-453a-af78-534f2537e3e4_min.webp`,
  'combine-complete': `${BASE}/hf_20260726_212836_1b4ab6f0-bedc-4ee2-bf26-c21307c9256d_min.webp`,
  'speed-demon': `${BASE}/hf_20260726_210534_2c99d31f-36d6-4b40-b14b-20269422707c_min.webp`,
  'rocket-start': `${BASE}/hf_20260726_212828_65cc0f44-f5d5-4448-aec1-165668b683b8_min.webp`,
  'power-plant': `${BASE}/hf_20260726_212826_e3556ae2-670c-4f4b-830a-94960ebf15af_min.webp`,
  'five-tool-athlete': `${BASE}/hf_20260726_212831_555490b3-2774-4fd1-8d83-70045a43a128_min.webp`,
  'complete-athlete': `${BASE}/hf_20260726_212838_5239f9f7-9400-4fbb-bc3f-09f2a4bd88e7_min.webp`,
  'quad-force': `${BASE}/hf_20260726_210536_42feeb9c-a8e0-45d3-bb26-45e3eeefd4d5_min.webp`,
  'twenty-mph-club': `${BASE}/hf_20260726_212833_f9c62e06-c806-49cd-bc4d-fb7285784d55_min.webp`,
  'four-fifty-club': `${BASE}/hf_20260726_211252_09681792-3f17-49ce-b396-4d0d243b4a18_min.webp`,
  'breakout-year': `${BASE}/hf_20260726_211257_d7ea0029-3b88-4ef0-b722-1e785d1510f9_min.webp`,
  'fai-ninety-club': `${BASE}/hf_20260726_212822_73676c69-81d0-464b-8935-d857fe144ff4_min.webp`,
  'team-number-one': `${BASE}/hf_20260726_212824_3c77ece8-b427-4e39-be0b-ffea2b8ac9a0_min.webp`,
}

await mkdir(OUT_DIR, { recursive: true })

let ok = 0
let failed = 0
for (const [id, url] of Object.entries(ART)) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const bytes = Buffer.from(await res.arrayBuffer())
    await writeFile(resolve(OUT_DIR, `${id}.webp`), bytes)
    console.log(`✓ ${id}.webp (${(bytes.length / 1024).toFixed(1)} KB)`)
    ok += 1
  } catch (error) {
    console.error(`✗ ${id}: ${error.message}`)
    failed += 1
  }
}

console.log(`\nDone: ${ok} saved, ${failed} failed into ${OUT_DIR}`)
if (failed > 0) process.exitCode = 1
