# Weekly Coach Reports pilot

Open /reports as a coach, admin, or owner. The desktop navigation and phone header include Reports.

1. Use the existing Bulk Import to add or reconcile the roster.
2. Select a game date and opponent, a position group, and an athlete.
3. Enter a grading coach, edit criteria, and score execution: 0 missed, 1 inconsistent, 2 executed, N/A unobserved. At least one criterion must be scored. Save explicitly.
4. Open existing evaluations to correct them. A secondary-position athlete can have one evaluation per position per game. The athlete name and criteria are preserved as report snapshots.
5. Optionally select a Film Room source for situational tendencies. Attach imported/tagged plays to the source first. Confirm this source charts the offense being scouted; it is deliberately independent of the evaluation game.
6. Download the staff packet, individual player report, or grade CSV. Open the printable HTML and use Print / Save as PDF.

## Storage and rollout

Apply supabase/migrations/017_weekly_grades.sql before enabling this route on a cloud deployment. It adds a separate staff-only table; it does not change existing roster policies or data. Only members with owner/admin/coach roles (plus legacy editor/manager roles) can read or write their team's evaluations. Anonymous viewers and athlete accounts have no access. No public sharing link is created.

Each evaluation is saved separately. Unique game/player/position keys prevent duplicates; revision checks reject stale edits. On a conflict, preserve your draft, reload the page, and open the newest saved evaluation. Cloud failures remain visible and never silently fall back to a local save. Local-only installations save in localStorage; CSV/HTML exports are the available external record. Weekly reports are intentionally outside the legacy whole-team import/reset/sync path.

## Calculation boundaries

Grades are equal-weight coach evaluations, not automatic film analysis. N/A is excluded; zeros count. Position averages weight evaluations equally. Custom rubrics may not be comparable. Run/pass/RPO/unknown shares use all selected non-special snaps as their denominator. Pass includes screens. No RPO outcome is inferred. Small samples under ten snaps are flagged. Situation rows overlap. Field position uses own 1 through opponent 1 as 1 through 99.

## Before charging customers

This is the working reporting pilot inside the current FAI app, not a complete billing release. Subscription checkout, entitlement enforcement, self-serve creation of new organizations, reusable team-wide rubric templates, direct PDF generation, and report delivery to athlete accounts are not implemented in this change. Existing school onboarding remains in place. Confirm database migration and cross-team access with separate staff/athlete accounts in staging before production rollout.

Validation is included in the normal CI: unit coverage for grades, game scope, samples, and export escaping; mobile browser coverage for save/reload/download.
