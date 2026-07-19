# FAI — Football Athlete Index

FAI is a football combine dashboard for entering testing results, producing a 0–100 Football Athlete Index, ranking complete athletes, and tracking development across testing events.

FAI Mobile is an installable Progressive Web App for iPhone, Android, tablets, laptops, and weight-room displays. It remains local-first and works offline after the first successful load.

Built with React, TypeScript, Tailwind CSS, Vite, Vitest, and Playwright.

## Install on a phone

### iPhone or iPad

1. Open the deployed FAI site in Safari.
2. Tap the **Share** button.
3. Choose **Add to Home Screen**.
4. Confirm **Add**.

FAI will launch from the home screen in a standalone app window.

### Android

1. Open the deployed FAI site in Chrome.
2. Tap the in-app **Install FAI** prompt, or open Chrome’s menu.
3. Choose **Install app** or **Add to Home screen**.

The installed app includes a five-tab phone navigation bar:

- Dashboard
- Athletes
- Test
- Rankings
- More

TV Mode remains available from the top-right button.

## Offline and update behavior

- The app shell and previously loaded assets are cached by a service worker.
- After one successful online load, the installed app can reopen without a connection.
- Testing entries remain local and can be entered while offline.
- When a new release is available, FAI shows an **Update FAI** prompt rather than silently replacing the running version.
- The header displays **Offline** whenever the device loses its connection.

Offline mode does not upload or synchronize data by itself.

## Quick start

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run test:e2e -- e2e/mobile-pwa.spec.ts
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
- **Provisional:** at least 60% of required metrics are present; score is visible but excluded from official FAI and position-group rankings.
- **Insufficient:** less than 60% complete; result is excluded from official FAI and position-group rankings.

Conditioning is optional and does not block a complete score.

## Ranking layers

FAI separates two different ranking questions:

1. **Official FAI rankings** — Overall FAI, Most Improved, and position-group placement. These require a complete testing battery.
2. **Available-data rankings** — individual tests and category scores. These include provisional or insufficient athletes whenever the relevant measurement is verified.

This keeps historical and in-progress data visible without presenting partial batteries as official FAI placement. Dashboard and TV Mode use the same distinction.

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

FAI runs in **safe local mode**. The primary working record is stored in this browser, and every successful save is also mirrored into an IndexedDB safety snapshot on the same device.

On startup, FAI uses this recovery order:

1. current local record;
2. legacy local record;
3. IndexedDB safety snapshot;
4. bundled historical baseline.

The IndexedDB mirror protects against a missing or corrupted primary browser record, but it is not a substitute for an external backup. Removing the app, clearing all site data, losing the device, or resetting the browser may remove both on-device copies.

Use **Data → Export All Data** after new testing entries. CSV exports include:

- roster-only athletes;
- testing events;
- all individual entries;
- historical profile snapshots.

Replace imports show a preview and automatically download a backup before changing data.

The previous anonymous Supabase implementation was removed because it allowed unrestricted cross-team access and last-write-wins data loss. Authenticated relational cloud storage must be hosted-tested before shared staff sync is treated as production-ready.

## Main features

- Installable iPhone and Android app shell
- Offline reopening after first successful load
- Touch-first bottom navigation
- IndexedDB safety mirror and recovery
- Populated historical dashboard with athlete, event, entry, and latest-event coverage
- Official complete-battery FAI rankings
- Available-data test and category rankings for verified partial records
- Athlete profiles and progress history
- Event-specific leaderboards
- Official position-group rankings
- TV Mode with official/available-data labeling
- Unified exercise entry without weekday sections
- Automatically bundled 2020–2025 history
- Initial/full-name identity consolidation
- CSV import/export with preview and backups
- Automatic legacy-data migration
- Automated scoring, seed, identity, CSV, mobile, offline, recovery, dashboard, and ranking tests

## Project structure

```text
public/
  manifest.webmanifest  install metadata and shortcuts
  fai-icon.svg          app/home-screen icon
  sw.js                 offline app shell and update lifecycle
src/
  data/                  scoring, test fields, historical seed, constants, CSV
  lib/                   identity cleaning, event merging, validation, scoring, progress
  store/                 local persistence, IndexedDB mirror, React data context
  components/            shared UI, PWA controls, filters, charts
  pages/                 dashboard, athletes, profiles, entry, data, rankings, TV mode
```

## Known next architecture step

Reintroduce optional cloud collaboration only with:

- authenticated users;
- organizations/teams;
- coach/admin membership;
- relational athlete, event, and result tables;
- row-level security by team membership;
- optimistic concurrency or row-level writes;
- local offline cache and retry queue;
- audit history and recovery.
