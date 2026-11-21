# Tehnopol dashboard release gates — 17 November 2026

## Scope
This branch addresses confirmed UI defects from the 17 November screenshots. It is **not** a claim that source completeness, manager-account permissions or real customer reporting have been re-accepted. The user previously confirmed Tehnopol verified on 13 November. Retain that status unless new contrary source evidence is established.

## Implemented in PR #85
- English default in the main Overview and Reports routes, independently of the report time zone; existing Estonian variants remain opt-in through a preference key. No global bilingual feature is claimed.
- Connection status and verified stored-event evidence are separately presented. Failed API requests are not shown as empty integrations.
- The 2-person reporting minimum is returned by the backend, and the coverage page separately warns when a tenant's configured team eligibility minimum is higher. Tenant configuration is not modified by this change.
- The English HR summary displays the inclusive end of the saved weekly period, with the provided reporting time zone.
- Source-to-snapshot parity is displayed independently from generic evidence grade. Missing parity evidence is labelled as unrecorded, not as proof that numbers are wrong.
- Control review empty states explain the next action. HR summary links to source-backed review creation.
- Main desktop content uses more available width without altering mobile rules.

## Tests to retain and run
- Language defaults and explicit legacy Estonian preference.
- API source failure vs empty source list, connection vs stored-event status.
- Canonical two-contributor metric minimum and tenant-level mismatch warning.
- Correct timezone and inclusive period end in the English report.
- Existing data collection, source parity, role permissions, two-person teams, report snapshot consistency, weekly delivery and control review tests.

## Release blockers not closed by code changes
1. Actual Outlook/Teams-to-persisted-snapshot parity for the disputed period, not only synthetic tests.
2. Compare corrected roster/workbook, primary and secondary group membership, and verified manager scopes. Reconcile PR #82.
3. Real manager-account positive and negative access tests, including a two-person team. Superadmin impersonation does not count.
4. Check whether percent changes in cross-team evidence are driven by tiny baselines or source coverage changes before presenting as decision signals.
5. Validate the same report version in dashboard, sent weekly HR report and export. Handle PR #83 report-delivery changes without resending customer mail.
6. Complete all-route bilingual localisation, accessible charts, desktop/mobile visual acceptance, and the full persisted decision-to-follow-up workflow.
7. Full CI, staging acceptance, authorised release gate, rollback verification and post-release monitoring.

## Production safety
This is a draft pull request. Do not merge, deploy, alter production tenant data, or send customer email until the release blockers have accepted evidence. Tracking issue: #86.

## Independently observed production evidence — 17 Nov

- Current active Tehnopol tenant: minimum two active contributors; 42 active application accounts, 41 qualifying internal employee candidates. This does not itself prove the customer's roster has been HR-approved.
- Latest corrected workbook (received 16 Nov) has 43 department memberships for 40 unique people. Three belong to both Juhtkond and a functional team; 10 entries form the Tehnopol Kiirendi cohort. Confirm all names against the live Microsoft directory before importing, especially the manager named without an email.
- Read-only backend parity diagnostic for 2026-11-10 through 2026-11-17 UTC: saved meeting instances 344 vs recomputed 343, saved attendee hours 930.9831 vs 930.4831. Messaging 4964, after-hours message ratio and focus availability reconcile. **Overall parity FAIL**. No historical report or customer source data was overwritten.
- The routine daily metric computation for 16 Nov ran at 04:00 UTC on 17 Nov. New metadata can arrive afterward. PR #85 now logs aggregate source insert/update freshness relative to this snapshot, without exposing identities or changing records. Check that output after the next reviewed deployment; do not assume late ingestion is the cause.
- Live manager status: zero HR-verified teams, zero active verified manager-account scopes, zero actual manager-account-session validations. Pending-only onboarding code cannot stand in for a real manager sign-in.
- Latest source mapping was approximately 95% for all work events; 65 distinct Teams sender IDs did not match currently known internal directory IDs. This is not proof that they are internal staff. Classify only with verified directory evidence.
- Source-comparable cross-team trend suppression is implemented and tested on PR #85; unreportable rates now display "Not comparable" and a specific reason rather than a potentially alarming percentage.
- The project’s protected frontend preview is built by Vercel; successful preview build and all GitHub automated tests are necessary but not sufficient for production deployment.

**Decision:** Do not close Issue #86 or merge PR #85 as a fully accepted release until the outstanding customer-specific checks are complete. Do not send customer emails, enable manager permissions, or silently rewrite saved reports to manufacture parity.
