# Measurement evidence quality gate

Effective branch: `fix/p2p3-measurement-truth-20261110`

## Issue corrected

A source being connected was previously enough for its daily `hasCalendar`, `hasMessaging` or `hasEmail` flag to be true. Missing source events then became genuine-looking zeroes. In addition, `String(undefined)` was counted as a distinct actor when calculating daily contributor totals; former/unmapped staff could contribute to an incorrect size floor.

## Implementation

- Count contributors only from currently active or pending users belonging to the requested organisation and team, with valid internal user IDs.
- Preserve raw source observations separately from published measurements. `measurementEvidence` stores observed event counts and excluded/unmapped counts. Do not expose individual identifiers.
- A daily source is considered observed only when relevant activity events from current employees exist. A consented connection without observed events remains **unverified**, not zero work.
- Unavailable daily metric values persist as `null`.
- Weekly metrics aggregate observed source-days only. Their provenance includes source-observed days, source events and missing/invalid attribution counts.
- The composite after-hours event ratio is the share of observed meeting, message and email events that occurred after hours, not the arithmetic mean of three unrelated source ratios.
- Missing previous periods produce `null` week-over-week comparisons rather than invented no-change.

## Scope limitation

This change is conservative, not complete verification of true zero activity. It cannot distinguish a genuine zero on a day with a successful full source poll from absent source evidence unless source-specific ingestion checkpoints are added. In particular, a Monday with no messages may be represented as **unverified**, even if zero messages was real.

## Required production acceptance

1. Recompute an isolated synthetic tenant's daily and weekly snapshots. Confirm no unsourced zeros or invalid contributor IDs.
2. For Tehnopol, compare available Microsoft Graph source records to accepted WorkEvents and source events by calendar/messaging/email with customer permission. Validate active directory mapping and timezone/DST.
3. Record actual source sync success, full extraction completeness, count of excluded identities, duplicate-work-event handling, and metric denominators.
4. Confirm that HR reports and the source-coverage screen agree on availability, underlying event counts and selected reporting period.
5. Release only after GitHub quality checks and a successful backend deployment. Check post-deploy logs.

The application should not claim that all Microsoft 365 metadata signals are available until Graph permissions, source events and attribution are verified for the specific customer.
