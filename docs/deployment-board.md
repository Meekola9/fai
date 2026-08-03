# FAI Deployment Board

The Deployment Board is the coach-facing operating view for Primary Specialists, Iron Man athletes, and Two-Way athletes.

## Evidence used

FAI displays the latest primary-position score, the same testing session evaluated against the secondary-position benchmarks, the latest awareness result, coach-entered mental readiness, assignment reliability, and roster need. Recommendations remain advisory; the coach controls the athlete's active role.

## Iron Man controls

An Iron Man athlete keeps the complete primary installation and receives a restricted secondary package:

- no more than two formations;
- no more than ten calls or assignments;
- no more than 30 percent planned secondary workload;
- a package status and review date;
- simplified responsibility rules.

## Workload tracking

The Board counts only film plays explicitly linked to the athlete through the ball carrier, target, or athlete-tagged annotation. It does not estimate snaps that have not been tagged. When the athlete's primary and secondary positions are on the same side of the ball, the Board reports that film cannot reliably separate the role split.

## Action flags

The Board surfaces missing evidence, role-recommendation mismatches, overdue package reviews, paused or incomplete packages, and tracked secondary usage above the configured ceiling.

## Validation

The deployment smoke test creates an athlete, enters recommendation evidence, installs an Iron Man package, saves it, reloads the profile, verifies persistence, opens the Deployment Board, and confirms that tagged film workload is compared with the package ceiling.
