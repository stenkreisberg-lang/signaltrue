# Retention purge correction and safe release

Date: 10 November 2026. Status: code change pending quality gate.

## Root cause
The old `purgeOrgData()` targeted `WorkEvent.occurredAt`, which does not exist. The canonical field is `WorkEvent.timestamp`. The old function also deleted all public `ChatLog` rows older than each customer's configured window during **every customer-specific purge**, even though ChatLog is not tenant scoped, and reported apparent success despite per-collection errors.

## Changes

- All targeted tenant collections now have explicit model imports and tenant-scoped retention filters. The WorkEvent query uses `timestamp`.
- Every purge produces a candidate count per collection and a status. Errors no longer appear as unconditional success.
- WorkEvent deletion is **preview-only by default**, including on weekly runs, until an audited deletion inventory is approved. Other tenant-scoped classes continue to obey their existing retention windows.
- Anonymous public ChatLog deletion is performed **once per global weekly job**, with a fixed 30-day default independent of any individual customer's policy.
- An authenticated organisation admin may request `POST /api/privacy/purge/:orgId` with `{ "dryRun": true }` for a non-destructive preview. A normal request now returns the actual result rather than a false fire-and-forget success.
- Set `WORK_EVENT_RETENTION_ENFORCEMENT=true` in Render only after confirming the recorded candidate count and downstream impacts. This will permit weekly and manually requested raw WorkEvent cleanup under the existing organisation policy.

## Enabling raw WorkEvent deletion

1. Run a dry-run preview for every active customer. Record candidate count by organisation and cutoff, plus record dependencies used in trends, reports and evidence packs.
2. Confirm the intended retention window and legal exceptions in the customer DPA, and verify the backup and recovery window.
3. Reconcile the WorkEvent timestamp query against an actual read-only database count. Do not assume source data is disposable merely because it is old.
4. Enable the enforcement environment variable for a controlled maintenance window. Observe first deletion results and database load.
5. Confirm that report snapshots and historical trends remain valid or carry appropriate unavailable labels. Verify that records retained for legal holds are excluded from deletion as required.
6. Do not claim complete erasure across backups, vendors and derived data without independent verification.

## Environment facts
Render service `signaltrue-backend` was observed in Oregon, USA. Database and backup residency require separate confirmation.

This change does not itself establish full GDPR compliance and does not relocate hosting.
