# FAI — Football Athlete Index

FAI is a football combine dashboard for entering testing results, producing a 0–100 Football Athlete Index, ranking complete athletes, and tracking development across testing events.

Built with React, TypeScript, Tailwind CSS, Vite, Vitest, Playwright, and optional authenticated Supabase cloud sync.

## Quick start

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

Without cloud environment variables, FAI continues running in device-only mode.

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

# Authenticated cloud sync

Cloud mode is local-first:

1. Every edit is saved to the browser immediately.
2. When signed into a team, the edit is added to a durable row-level cloud queue.
3. The queue survives refresh, browser restart, and temporary internet loss.
4. Writes use record versions. A conflicting edit from another device is shown to the coach instead of being silently overwritten.
5. Realtime updates refresh the local copy only when there are no unsent local changes.

A new empty cloud team is automatically initialized from the current device’s complete FAI dataset. Stable historical IDs prevent the bundled 2020–2025 archive from being duplicated.

## Security model

The migration creates:

- authenticated users;
- teams and explicit memberships;
- owner, admin, coach, and viewer roles;
- team invite tokens;
- relational athlete, testing-event, and test-session tables;
- team-membership row-level security;
- versioned mutation RPCs;
- soft deletion and an audit log.

There are no anonymous read/write policies and no `using (true)` team-data policies.

## One-time Supabase setup

1. Create separate Supabase projects for preview and production.
2. In the Supabase SQL editor, run:

   ```text
   supabase/migrations/001_authenticated_cloud.sql
   ```

3. Enable email one-time-password or magic-link authentication.
4. Add the deployed FAI URL to the project’s allowed authentication redirect URLs.
5. Copy `.env.example` to `.env.local` for local development:

   ```bash
   cp .env.example .env.local
   ```

6. Set:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```

Only the public browser anon key belongs in the frontend. Never place a service-role key in Vite, GitHub Pages, or browser storage.

## GitHub Pages production setup

Add these repository Actions secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The Pages workflow injects them during the static build. When the secrets are absent, the same build safely falls back to device-only mode.

## Coach cloud workflow

Open **Data → Secure Cloud Sign-In**:

- enter a staff email and open the one-time sign-in link;
- create a new team or join using an invite token;
- owners/admins can generate coach, viewer, or admin invite tokens;
- select a team to load its shared dataset;
- review queued, offline, error, and conflict states from the cloud panel.

Viewer accounts cannot change local team data while that cloud team is selected.

## Conflict recovery

When another device changes the same record first, FAI displays a conflict with two choices:

- **Keep mine:** retry the local record against the latest cloud version.
- **Use cloud:** discard that conflicting queued write and reload the team copy.

Cloud conflicts are never silently resolved.

## Backups and recovery

Use **Data → Export All Data** regularly even when cloud mode is active. CSV exports include:

- roster-only athletes;
- testing events;
- every individual entry;
- historical profile snapshots.

Replace imports and resets download a local backup first. Cloud replacement queues row-level upserts and soft deletes rather than replacing one entire team document.

## Main features

- Coach dashboard with official and provisional counts
- Athlete profiles and progress history
- Event-specific leaderboards
- Position-group rankings
- TV Mode
- Unified exercise entry without weekday sections
- Automatically bundled 2020–2025 history
- Initial/full-name identity consolidation
- Authenticated team cloud sync
- Durable offline mutation queue
- Version conflicts and recovery
- Role-based team access
- CSV import/export with preview and backups
- Automatic legacy-data migration
- Automated scoring, seed, identity, queue, schema-contract, and browser tests

## Project structure

```text
src/
  data/        scoring, test fields, historical seed, constants, CSV
  lib/         identity cleaning, event merging, validation, scoring, progress
  store/       local persistence, cloud transport, offline queue, React context
  components/  shared UI, cloud controls, filters, charts
  pages/       dashboard, athletes, profiles, entry, data, TV mode
supabase/
  migrations/  authenticated relational schema, RLS, RPCs, audit trail
```

## Deployment order

1. Merge and deploy the historical seed/identity PR.
2. Back up any production browser data.
3. Run the Supabase migration.
4. Configure auth redirect URLs.
5. Add public Supabase build secrets.
6. Deploy the cloud build.
7. Sign in on the primary device and create the team. The empty team is initialized from that device.
8. Verify counts and export a post-migration backup.
9. Invite the remaining staff.

Do not connect multiple devices until the primary-device migration has finished and the cloud panel reports **Cloud synced**.
