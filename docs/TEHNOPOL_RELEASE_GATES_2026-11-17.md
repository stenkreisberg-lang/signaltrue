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
