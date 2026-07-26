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
// Covers all 39 fixed-tier badges. Signature (per-archetype) and averaged
// (per-tier) badges intentionally keep the recolorable vector art.
//
// NOTE: these are time-limited generation-CDN URLs. If a link 404s, the art
// was regenerated — re-run the badge generation and refresh the URL here.
// ---------------------------------------------------------------------------
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/assets/badges')
const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3F2YTTdr0Q4RI46KjwlFaEmqmjr'
const url = (name) => `${BASE}/${name}_min.webp`

/** badge id -> generated medallion (min webp). */
const ART = {
  // Testing
  'first-mark': url('hf_20260726_211250_f6037391-a646-453a-af78-534f2537e3e4'),
  'combine-complete': url('hf_20260726_212836_1b4ab6f0-bedc-4ee2-bf26-c21307c9256d'),
  'battle-tested': url('hf_20260726_230603_656b80c5-91d6-4072-9101-1c1cda3d0483'),
  // Performance — single category
  'speed-demon': url('hf_20260726_210534_2c99d31f-36d6-4b40-b14b-20269422707c'),
  'rocket-start': url('hf_20260726_212828_65cc0f44-f5d5-4448-aec1-165668b683b8'),
  skywalker: url('hf_20260726_230605_f6df4c8a-2b23-4920-9d75-ef4230441723'),
  'power-plant': url('hf_20260726_212826_e3556ae2-670c-4f4b-830a-94960ebf15af'),
  'range-hunter': url('hf_20260726_230607_778d5f06-00b3-4d79-9fb6-b266b5fe6716'),
  'cut-on-a-dime': url('hf_20260726_230610_48e565a6-1e67-448e-b445-06a4dcc05c29'),
  'iron-lungs': url('hf_20260726_230612_a8c3cb67-9ffa-417b-8d85-9a4be928debd'),
  'trench-strong': url('hf_20260726_230614_06409377-eb33-4641-a807-309e477ae27b'),
  // Performance — combos
  'balanced-weapon': url('hf_20260726_230616_78b4010a-d1ed-4db4-9402-d2098882edb2'),
  'no-weak-links': url('hf_20260726_230619_7b4abc8d-2684-4dd1-9905-c740268af733'),
  'triple-threat': url('hf_20260726_230620_8101c10c-da17-4dd5-adea-8499482bc0fa'),
  'five-tool-athlete': url('hf_20260726_212831_555490b3-2774-4fd1-8d83-70045a43a128'),
  // Coverage counts
  'two-way-threat': url('hf_20260726_230630_9019d87f-3c30-499b-b0a4-c130640af909'),
  'quad-force': url('hf_20260726_210536_42feeb9c-a8e0-45d3-bb26-45e3eeefd4d5'),
  'complete-athlete': url('hf_20260726_212838_5239f9f7-9400-4fbb-bc3f-09f2a4bd88e7'),
  // Absolute clubs
  'twenty-mph-club': url('hf_20260726_212833_f9c62e06-c806-49cd-bc4d-fb7285784d55'),
  'nineteen-mph-club': url('hf_20260726_230632_65de8901-ed2a-4e31-b1b9-b6f67b4e9e3d'),
  'four-fifty-club': url('hf_20260726_211252_09681792-3f17-49ce-b396-4d0d243b4a18'),
  'four-seventy-five-club': url('hf_20260726_230634_772b1b77-ade7-4495-8ac8-55a1e94ea045'),
  'big-man-burst': url('hf_20260726_230636_71c3dff0-8021-4ffa-9da5-4a789c4e3f78'),
  'ten-foot-club': url('hf_20260726_230639_37e531d6-5f6e-4be9-912f-33e70584964b'),
  'thirty-five-inch-club': url('hf_20260726_230641_79d16e6f-c0ca-4061-acf0-1a79bb1ab79e'),
  'power-cleaner': url('hf_20260726_230643_cd565e53-0597-491a-90be-79e7d586821b'),
  'shuttle-technician': url('hf_20260726_230645_a6355a1e-0bde-4fd7-aeb0-82d006d3c2f8'),
  'lateral-lock': url('hf_20260726_230647_99586ac2-ee6a-456f-a316-649fc723e916'),
  'conditioning-engine': url('hf_20260726_230700_99c9debb-1b6d-45d7-8b5e-69509b928954'),
  // Progress
  riser: url('hf_20260726_230702_fa0df17b-e9bc-4d8c-9497-56f83933ea84'),
  'breakout-year': url('hf_20260726_211257_d7ea0029-3b88-4ef0-b722-1e785d1510f9'),
  'all-around-growth': url('hf_20260726_230705_894cf882-fe47-4b73-a957-2eb61aa528f1'),
  'personal-best-parade': url('hf_20260726_230707_419f4b05-d7b0-4e93-b28f-ff7a5e0c9064'),
  // Ranking
  'fai-eighty-club': url('hf_20260726_230709_f919116e-b45b-43e0-afdc-c002636bc327'),
  'fai-ninety-club': url('hf_20260726_212822_73676c69-81d0-464b-8935-d857fe144ff4'),
  'team-number-one': url('hf_20260726_212824_3c77ece8-b427-4e39-be0b-ffea2b8ac9a0'),
  'podium-finisher': url('hf_20260726_230711_51131c0e-bf16-43c0-89b4-90e718532c60'),
  'position-leader': url('hf_20260726_230713_55b79f59-0450-4bed-9717-48c32f5ef329'),
  'top-ten': url('hf_20260726_230715_eadd06fc-2f04-4ee2-ae07-c0341eee7240'),
}

await mkdir(OUT_DIR, { recursive: true })

let ok = 0
let failed = 0
for (const [id, link] of Object.entries(ART)) {
  try {
    const res = await fetch(link)
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
