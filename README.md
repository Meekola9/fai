# FAI — Football Athlete Index

FAI is a football combine dashboard for entering multi-day testing results, producing a 0–100 Football Athlete Index, ranking complete athletes, and tracking development across testing events.

Built with React, TypeScript, Tailwind CSS, Vite, and Vitest.

## Quick start

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

## Testing workflow

Create **one testing event** for the full combine window, such as `Summer Combine 2026`. Enter Monday, Tuesday, and Wednesday results under that same event. FAI merges those entries into one result per athlete.

### Monday

- Bench max
- Two 40-yard dash attempts
- Two 10-yard fly attempts

### Tuesday

- Hang clean repetitions at body weight
- Two 20-yard shuttle attempts
- Two lateral 10-yard shuttle attempts
- Illinois agility test

### Wednesday

- Squat max
- Broad jump
- Vertical jump

### Optional

- 30-second 5-10-15 conditioning shuttle

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

## Data safety

FAI currently runs in **safe local mode**. Data is stored in this browser using localStorage.

The previous anonymous Supabase implementation was removed because it allowed unrestricted cross-team access and last-write-wins data loss. Authenticated relational cloud storage must be implemented and reviewed before shared staff sync returns.

Use **Data → Export All Data** after each testing day. CSV exports include:

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
- Multi-day testing entry
- CSV import/export with preview and backups
- Automatic legacy-data migration
- Automated scoring and CSV regression tests

## Project structure

```text
src/
  data/        scoring, test fields, constants, CSV, sample data
  lib/         event merging, validation, scoring, progress, leaderboards
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
- audit history and recovery.
