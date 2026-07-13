# FAI — Football Athlete Index

FAI is a football combine dashboard for entering testing results, producing a 0–100 Football Athlete Index, ranking complete athletes, and tracking development across testing events.

Built with React, TypeScript, Tailwind CSS, Vite, Vitest, and Playwright.

## Quick start

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

## Historical data included

FAI automatically loads the cleaned historical testing archive on first launch:

- 2020 through 2025;
- 18 testing events;
- 562 historical testing sessions;
- 126 consolidated athlete identities;
- abbreviated/full-name duplicates merged where the identity match is known or unambiguous.

The bundled history is merged underneath existing browser data, so coach-entered records win and are not overwritten. Reset restores the historical baseline rather than fictional demo athletes.

## Testing workflow

Create **one testing event** for the full combine window, such as `Summer Combine 2026`. All exercises appear together on one entry screen and are not assigned to Monday, Tuesday, Wednesday, or any other weekday.

Available exercises:

- Bench max
- Two 40-yard dash attempts
- Two 10-yard fly attempts
- Hang clean repetitions at body weight
- Two 20-yard shuttle attempts
- Two lateral 10-yard shuttle attempts
- Illinois agility test
- Squat max
- Broad jump
- Vertical jump
- Optional 30-second 5-10-15 conditioning shuttle

Enter whichever results are available for that athlete and event. Partial entries inside the same event are merged into one computed result.

## Score status

- **Complete:** all required metrics are present; athlete receives official team and position-group ranks.
- **Provisional:** at least 60% of required metrics are present; score is visible but excluded from rankings.
- **Insufficient:** less than 60% complete; result is not eligible for ranking.

Conditioning is optional and does not block a complete score.

## Scoring model

FAI uses fixed, configurable position-profile benchmarks rather than team-best/team-worst normalization. Adding or removing another athlete no longer changes an existing athlete’s score.

Category weights:

| Category | Weight |
|---|---:|
| Speed | 30% |
| Power | 25% |
| Change of Direction | 20% |
| Conditioning | 15% |
| Strength | 10% |

Bench and squat strength scores use load divided by the athlete’s snapshotted body weight. Position benchmark profiles live in `src/data/scoring.ts` and should be reviewed by the coaching staff before official adoption.

## Historical accuracy

Every testing entry snapshots the athlete’s grade, position, position group, and body weight. Editing the current roster does not rewrite prior event context.

Leaderboards can reconstruct a selected historical testing event rather than filtering only the athlete’s latest result.

Historical aliases are consolidated before computation and future imports run through the same identity-cleaning layer. Ambiguous initial-only names remain separate rather than being merged unsafely.

## Data safety

FAI currently runs in **safe local mode**. Data is stored in this browser using localStorage, while the full historical baseline is bundled into the application so a fresh browser is never empty.

The previous anonymous Supabase implementation was removed because it allowed unrestricted cross-team access and last-write-wins data loss. Authenticated relational cloud storage must be implemented and reviewed before shared staff sync returns.

Use **Data → Export All Data** after new testing entries until authenticated cloud sync ships. CSV exports include:

- roster-only athletes;
- testing events;
- all individual entries;
- historical profile snapshots.

Replace imports show a preview and automatically download a backup before changing data.

## Main features

- Coach dashboard with official and provisional counts
- Athlete profiles and progress history
- Event-specific leaderboards
- Position-group rankings
- TV Mode
- Unified exercise entry without weekday sections
- Automatically bundled 2020–2025 history
- Initial/full-name identity consolidation
- CSV import/export with preview and backups
- Automatic legacy-data migration
- Automated scoring, seed, identity, and CSV regression tests

## Project structure

```text
src/
  data/        scoring, test fields, historical seed, constants, CSV
  lib/         identity cleaning, event merging, validation, scoring, progress
  store/       local persistence and React data context
  components/  shared UI, filters, charts
  pages/       dashboard, athletes, profiles, entry, data, TV mode
```

## Known next architecture step

Reintroduce cloud collaboration only with:

- authenticated users;
- organizations/teams;
- coach/admin membership;
- relational athlete, event, and result tables;
- row-level security by team membership;
- optimistic concurrency or row-level writes;
- local offline cache and retry queue;
- audit history and recovery.
