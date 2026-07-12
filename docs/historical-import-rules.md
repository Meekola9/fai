# Historical FAI Import Rules

These rules document the conversion used for the 2020-2026 football max-testing spreadsheets.

## Supported mappings

| Historical source | FAI field | Rule |
|---|---|---|
| Bench columns | `benchMax` | Recorded max in pounds |
| Squat columns | `squatMax` | Recorded max in pounds |
| 40-yard columns | `dash40_1` | Imported as first 40-yard attempt |
| 5x10x5 / Pro Agility | `shuttle20_1` | Treated as the 20-yard 5-10-5 shuttle |
| Broad jump | `broadJump` | Stored in inches; values like `7.6` mean 7 ft 6 in |
| HC BW reps | `hangCleanReps` | Repetitions completed at body weight |

## Deliberately excluded

- Power-clean maximums are not imported as `hangCleanReps`; they are different tests.
- Columns without a header are not imported.
- Ambiguous headers such as `Bench Spr.1` are not assigned to an event without confirmation.

## Event dates

When a source contains a season but no exact date, standardized anchor dates are used:

- Summer: June 15
- Fall: October or November 15
- Winter: December 15
- Spring: April or May 15

These dates are migration anchors, not claims about the actual test day.

## Athlete identity

Stable IDs are generated from normalized athlete names. Initial-only names are not automatically merged with full names because that could combine different athletes.

## Position handling

Positions are mapped to the closest FAI group. Rows without a position are assigned `ATH` and should be reviewed before position-group benchmarking.

## Grade handling

Historical grade is inferred from graduation year and event year. This can produce middle-school grades in older records; those records should remain historical snapshots rather than being treated as current varsity grades.

## Required review

Before importing, review the conversion workbook's `Unmapped Values` sheet and verify:

1. Ambiguous test-period headers.
2. Initial-only athlete names.
3. Position assignments marked `ATH`.
4. Standardized event dates.
5. Broad-jump notation.
