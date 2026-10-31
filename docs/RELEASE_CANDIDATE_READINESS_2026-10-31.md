# SignalTrue single-release candidate: factual and privacy readiness

Prepared 31 October 2026. Status: **UNRELEASED, NOT PRODUCTION-VERIFIED**.

## Code changes in this candidate
- Set the general team and metric contributor privacy default to eight; enforce eight in employee sync and weekly reporting. Existing tenant settings need review.
- Prevent email generation after weekly snapshot validation or persistence failure. It is no longer safe to reuse an old saved report as if fresh.
- Require an active, authorised HR/admin recipient for organisation reports. No default personal superadmin copy; explicit operational opt-in requires tenant approval.
- Count still-employed, not-yet-registered directory users in manager team population while keeping portal manager login restricted to active verified accounts.
- Apply function-leader team scoping even with an empty permission list, and scope related H&S findings, interventions and migration queries.
- Clarify manager access and organisational navigation language; show low-evidence limitation rather than a misleading status label.

## Blocking checks before any main-branch release
1. Reconcile the official Tehnopol roster, approved teams, manager appointments and reporting recipients. Do not infer organisational structure from meeting organisers or Teams channels.
2. Reconcile at least ten source calendars against distinct meetings, participant-hours, occupied time, duplicate records, team attribution and derived report figures.
3. Implement correct completed Europe/Tallinn Monday-Sunday windows, six-week historical cohorts, time-zone/DST behavior, and consistency of email, dashboard and exports.
4. Diagnose the reported 2/42 Teams coverage. Establish whether counts mean message authors, channel participants, mapping coverage or actual permission-limited data. Do not imply that all Teams messaging is measured.
5. Run the full backend test suite, frontend build, negative role/tenant/privacy tests, H&S case-owner and mixed-case scope tests, and real Outlook email rendering.
6. Fix the existing weekly organisation report schedule (currently 08:00 UTC) and its watchdog/startup paths before promising 07:30 Tallinn delivery. Verify exactly-once sends.
7. Test manager invitation, company account provisioning, sign-in, acceptance, revocation, report eligibility, PDF scope, manager digest dry-run and MANAGER_INTELLIGENCE_EMAIL_ENABLED.
8. Verify the active Render backend is built from the expected release commit. The last inspected live backend was ff16ddba from 26 October; the Vercel client was 5661ef1 from 31 October.
9. Validate with authorised real Tehnopol records, obtain HR approval for permissions and recipients, record a rollback plan and deployment smoke-test results.
10. Complete the broader 48-item product redesign in reviewed code. This candidate is an integrity/security patch, **not** completion of the full programme.

## Deployment architecture
Render signaltrue-backend and multiple Vercel frontend projects track main automatically. Use a single reviewed merge after all release gates pass. One merge may trigger separate builds on each connected service. Do not claim coordinated readiness from one platform alone.

## Data truth contract
Missing source = unavailable, not zero. Unvalidated figures = withheld. Digital metadata is not proof of burnout, employee wellbeing or legal control effectiveness. All business conclusions require human review.
