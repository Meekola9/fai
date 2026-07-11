# FAI — Football Athlete Index

A football combine testing dashboard for evaluating high school athletes. Coaches
enter testing data, the app computes a **Football Athlete Index (FAI)** score
(0–100), ranks athletes, and tracks how much they improve over time — with a
broadcast-style **TV Mode** for the weight room or field house.

Built with **React + TypeScript + Tailwind CSS**, persisting to **localStorage**.
The storage layer is a narrow async interface so it can later be swapped for
Supabase or Firebase without touching the UI.

## Quick start

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run lint     # eslint
npm run preview  # serve the production build
```

Sample data (16 athletes across 3 testing periods) loads automatically on first
run so every feature — rankings, progress, TV mode — is visible immediately.
Use **Data → Reset Sample Data** to restore it at any time.

## Features

- **Coach Dashboard** — team average FAI & improvement, athletes tested,
  fastest / strongest / most explosive / best-COD / most-improved athletes,
  best & weakest team categories, team radar profile, Top 5.
- **Athlete Profiles** — FAI ring, previous vs current FAI + improvement %,
  team & position-group rank, category radar (current vs previous), FAI trend
  line, test-by-test improvement, full test history, strengths / weaknesses,
  and a suggested training focus.
- **Leaderboards** — Overall FAI, Most Improved, each category score, every
  individual test, and position-group rankings, with filters for group, grade,
  position, testing phase, and testing date.
- **TV Mode** — full-screen rotating combine-broadcast graphics (Top 10, Most
  Improved, fastest 40 / 10 fly, best lifts & jumps, best shuttle, best
  conditioning, position-group leaders). Big numbers, green/red/gray progress
  arrows. Keyboard: `← →` change board, `space` pause, `F` fullscreen, `Esc` exit.
- **Data entry** — mobile-first form grouped by testing day (Mon/Tue/Wed +
  optional conditioning). Every session is stored separately — old data is never
  overwritten.
- **Data tools** — CSV export / import (merge or replace), edit & delete
  athletes and sessions, reset to sample data.

## Scoring

FAI is a weighted average of five categories, each normalized 0–100 against the
**team best and worst for that testing period**:

| Category            | Weight | Tests |
|---------------------|:------:|-------|
| Speed               | 30%    | Best 40, Best 10 fly |
| Power               | 25%    | Broad jump, Vertical jump, Hang clean reps |
| Change of Direction | 20%    | Best 20 shuttle, Best lateral shuttle, Illinois agility |
| Conditioning        | 15%    | 5-10-15 shuttle (30s yards) |
| Strength            | 10%    | Bench max, Squat max |

Timed tests: lower is better. Jump / max / rep / yard tests: higher is better.

**All scoring lives in [`src/data/scoring.ts`](src/data/scoring.ts)** — category
weights and per-test mappings are plain data, easy to edit.

## Project structure

```
src/
  data/        constants, scoring config, form fields, CSV, sample data
  lib/         compute (normalize → categories → FAI), progress, leaderboards
  store/       storage adapter (localStorage) + React data context
  components/  ui primitives, SVG charts, filters
  pages/       Dashboard, Leaderboards, Athletes, AthleteProfile,
               AthleteEditor, SessionEntry, DataPage, TVMode
```

## Cloud storage (Supabase)

By default FAI stores data in the browser (localStorage) — per device, no
backup. To make data permanent, shared across a staff, and synced across
devices, point it at a free Supabase project:

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase **SQL editor**, run [`supabase/schema.sql`](supabase/schema.sql)
   (creates the `fai_state` table + access policy).
3. Set three env vars — locally in `.env.local`, or in Vercel
   (**Project → Settings → Environment Variables**), then redeploy:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — from Supabase
     **Project Settings → API**.
   - `VITE_FAI_TEAM_CODE` — any shared code; everyone using the same code shares
     one dataset. Optional (defaults to `default`).

See [`.env.example`](.env.example). With the vars set, the app switches to the
cloud backend automatically and the **Data** page shows "Cloud sync ON". Without
them it stays fully local. Data is stored as one JSON document per team code;
each save also writes a local cache so the app survives brief network drops.

The backend is chosen in one line of `src/store/storage.ts` (the `DataStore`
interface — `load` / `save` / `reset`), so a Firebase adapter could drop in the
same way.
