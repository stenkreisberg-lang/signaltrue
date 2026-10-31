# SignalTrue: Integrated HR and manager redesign release candidate

Date: 31 October 2026. Status: **CODE IMPLEMENTED ON CANDIDATE BRANCH, NOT DEPLOYED TO PRODUCTION.** Do not equate CI success with real customer-data reconciliation.

## Customer journeys implemented in code

### HR: one coherent navigation
Primary application tasks: Overview, Organisation & teams, Actions & reviews, Reports, Settings & access. Secondary links retain advanced evidence, Work Network, leadership summaries, connectors and trust settings.

The overview uses the saved weekly measurement, labels the completed period, distinguishes unavailable evidence, and introduces a concrete verify → investigate → review journey. Experimental indices are secondary and explicitly non-clinical. A failed report refresh visibly identifies the prior snapshot as historical rather than fresh.

### HR: verified organisation and people management
A new authenticated `/api/organisation-structure` service and HR-facing `OrganisationWorkspace` provide a searchable active workforce, team hierarchy, formal reporting lines, employee corrections, team verification and access to advanced legacy import tools.

- Only active HR/admin users may read or change formal employee structure.
- Deactivated staff are not part of the active roster. Synced pending accounts remain valid workforce records.
- Parent departments must be in the same tenant and cannot form a cycle.
- A formal manager does **not** inherit SignalTrue reporting rights.
- HR corrections to employee team assignments are effective-dated in `OrgUnit` and protected from subsequent directory overrides. Previously captured events are not retroactively moved into the newly verified team.
- Team size eligibility and source coverage are deliberately separate. The UI does **not** claim source eligibility simply because a team meets the eight-person threshold.
- The full organisational hierarchy is HR-confirmed; it is never generated from message counts, meeting organisers or Microsoft Teams channels.

### HR: manager appointment and email permission
The manager admin page offers a guided select employee → team → authorised options → explicit approval → seven-day email invitation → acceptance lifecycle.

- Pending Microsoft/HR-imported staff can be invited before first SignalTrue login.
- A secure one-time emailed link supports claiming an account with a new password. This does **not** activate access until the invited exact user signs in and accepts the assignment.
- HR separately controls manager PDF export and manager email preference, with revocation audited and enforced on each sensitive API request.
- A manager's weekly email preference is scoped to the selected authorised team rather than all teams.
- Manager dashboards use the shared product layout with dedicated My team, Actions & reviews, and Reports navigation. Team metrics remain suppressed below the relevant eight-person and source-coverage gates.
- Manager weekly digest delivery still needs HR sign-off, real source verification and explicit `MANAGER_INTELLIGENCE_EMAIL_ENABLED` production enablement.

### HR: explicit organisation-wide report recipients
The organisation workspace now contains an HR approval list for the weekly company report. The backend accepts only active administrator-role identities in the same tenant. An explicitly approved empty list pauses delivery. Where no HR allowlist has been reviewed, the fallback is only active `hr_admin` accounts. An approved manager invitation never subscribes somebody to this organisation-wide report.

### Reports: factual periods, integrity and usefulness
- Completed tenant-local Monday-to-Sunday windows, including DST boundaries, replace rolling-week ambiguity in the primary brief.
- Snapshot persistence/consistency failures block delivery. The measurement period and actual report generation timestamp are separate.
- Sender defaults to no personal superadmin copy. HR recipients are validated.
- The weekly dashboard and emails are built from the authoritative saved snapshot. An unavailable refresh is labelled rather than silently treated as a fresh report.
- HR can record whether a specific saved report was useful, novel or triggered investigation. This feedback is scoped to the real report, cannot alter metrics, and is never used as proof that an intervention worked.

### Security
Existing eight-person minimum is maintained in the core reporting and sync paths. H&S case-owner and function-leader views fail closed with missing permissions; related case, finding, migration and intervention records are restricted to the authorised case/team scope. The API returns HTTP 403 for unapproved origins rather than misleading 500 failures. Login refuses unclaimed or inactive directory accounts even if a placeholder password exists.

## Automated regression evidence
The GitHub Quality gate tests lint, formatting, frontend tests, production build, Playwright browser flows, backend test suites and dependency security audit. Added test cases cover:
- Pending employee account claim, verified acceptance and revoked invitation denial.
- Manager team-scoped digest subscription and cross-tenant restrictions.
- HR-only organisational hierarchy, cycle/cross-tenant prevention, effective-dated corrections.
- HR-only organisation report recipient selection and pause.
- Feedback attached to a real in-tenant saved report, with malformed input rejected.
- DST-safe completed reporting weeks and weekly email dispatch windows.
- H&S role access, privacy minimum and missing evidence.

Record the latest successful workflow run URL and commit before approving main merge. A browser flow test of an existing route is not proof that every new screen was manually exercised using real accounts.

## External / acceptance blockers before ONE production merge
1. **Tehnopol source truth:** compare real Microsoft 365 source calendars to measured unique meetings, participant-hours, mapped employees, team denominator, calendar overlaps and the emailed report. Do not substitute generated test fixtures.
2. **Tehnopol messaging:** production logs showed accessible calendars and Teams membership, but zero message events in the inspected sync and missing Microsoft Graph `Chat.Read.All` application consent. Until consent is granted and verified, show Teams chat outcomes as unavailable, not zero.
3. **Canonical workforce:** have Tehnopol HR confirm active employees, formal teams, parent units, managers, and which users should have reporting access. The UI supports manual verification; it cannot certify these data without the HR source.
4. **Local time:** confirm the production organisation's `settings.timezone` is actually `Europe/Tallinn`, not the model default UTC.
5. **Email delivery:** verify HR-approved recipients, exact provider delivery IDs, single-send scheduler behaviour under restarts and retries, and Outlook/mobile rendering. Manager digest must stay gated until HR approves.
6. **Access penetration:** test revoked, expired, forwarded and tenant-crossing manager invitations, direct API URLs, PDFs, H&S case/leader scopes and overlapping small groups using production-like access data.
7. **Operational rollout:** ensure Render and Vercel are serving the *same intended Git SHA*; verify health, logs and source sync after one coordinated main merge, with a rollback plan.
8. **Language and deeper value:** full Estonian/English localisation, scientifically validated psychosocial interpretations, fully reconciled week-by-week baselines, further coordination findings and longitudinal intervention proof are not yet completed or independently validated. Do not advertise them as shipped.

## Release decision
Until all blocking source, security and customer acceptance checks pass, **do not merge to main or deploy to production**. Both Render and Vercel auto-deploy from main and may update on different timelines. Release once as one reviewed combination of verified backend and frontend changes. Missing data means **unavailable**. A descriptive signal is not a clinical, compliance or causal conclusion.
