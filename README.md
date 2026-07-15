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
2. In the Supabase SQL editor, run both migrations **in order**:

   ```text
   supabase/migrations/001_authenticated_cloud.sql
   supabase/migrations/002_snapshot_bootstrap.sql
   ```

   `001` creates the relational schema, RLS, and mutation RPCs; `002` adds the
   one-transaction `import_fai_snapshot` bootstrap used to initialize a new team.
3. Enable email one-time-password or magic-link authentication.
4. Under **Authentication → URL Configuration**, add the deployed FAI URLs to the
   allowed redirect URLs:

   ```text
   https://meekola9.github.io/football-athlete-index/
   http://localhost:5173/**
   ```

   The first is the production site; the second allows local development sign-in.
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

## Hosted Supabase smoke test

Run this end-to-end checklist once against the real hosted project before the
cloud build is promoted to production:

1. Export a primary-device CSV backup (**Data → Export All Data**).
2. Sign in by email magic link.
3. Create the team.
4. Wait for the cloud panel to report **Cloud synced**.
5. Confirm athlete, event, and session counts match the local dashboard
   (126 athletes, 18 events, 562 sessions).
6. Export a post-migration CSV backup.
7. Generate a coach invite token.
8. Join from a second account/device using the token.
9. Confirm the shared data appears on the second device.
10. Create a harmless test event.
11. Confirm it appears on the other device in realtime.
12. Make an offline edit (disconnect the network, change a record).
13. Reconnect and confirm the queued edit syncs.
14. Create a deliberate same-record conflict from both devices.
15. Resolve it with **Keep mine** and confirm the local value wins.
16. Reproduce the conflict and resolve with **Use cloud**; confirm the cloud value wins.
17. Delete the temporary test data.

Do not mark the cloud build production-ready until every step passes.

## Production rollback

GitHub Pages serves a single site per repository, so a feature-branch deploy
overwrites production. Before deploying an unverified branch to the production
Pages URL:

1. Export a current CSV backup (**Data → Export All Data**).
2. Record the last known-good production commit:

   ```bash
   git rev-parse origin/main
   ```

3. Confirm `main` is redeployable on demand — the Deploy workflow runs on push
   to `main` and via **Actions → Deploy FAI to GitHub Pages → Run workflow**.

To roll back, redeploy `main`:

```bash
# Option A: re-run the deploy from the main branch
#   Actions → Deploy FAI to GitHub Pages → Run workflow → Branch: main
#
# Option B: from a clone, retrigger main's deployment
git checkout main && git pull origin main
git commit --allow-empty -m "Redeploy production from main"
git push origin main
```

Because cloud writes are row-level upserts and soft deletes (never a full team
replace), rolling back the static site does not corrupt cloud data.

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
