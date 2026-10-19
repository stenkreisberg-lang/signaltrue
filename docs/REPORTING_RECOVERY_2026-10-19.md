# SignalTrue recovery: three releases (19 Oct 2026)

## Status
This is a staged recovery branch, **not** evidence of a working production deployment. A source-level fix for previous-week denominator reuse is included. No production tenant has been modified.

## Release 1: Measurement integrity (blocking)
- [x] Stop applying current-week calendar actor population to the previous week and pooled six-week baseline in the weekly report (interim correction).
- [ ] Improve six-week baselines further: divide each historical snapshot by its *own* covered actor cohort and combine comparable weekly averages, not one pooled 6-week user count.
- [ ] Normalize report windows to completed local Mon-Sun weeks; use UTC half-open instants for queries and handle DST.
- [ ] Reconcile Outlook source records -> deduplicated participant attendance -> raw WorkEvent -> IntegrationMetricsDaily -> email; sample at least 10 calendars with overlapping/recurring/declined/cancelled events.
- [ ] Define canonical participant-hours as sum of distinct person-meeting attendance durations. Independently calculate occupied time by merging overlapping intervals per employee. Label these separately.
- [ ] Resolve old aggregate meeting records versus attendee-expanded rows; prevent either from being double-counted.
- [ ] Change absent metric schema defaults from zero to nullable/unavailable, migrate snapshots safely, implement status and coverage per metric.
- [ ] Reject impossible data and contradictory narrative before delivery; preserve last verified result, mark source issue.
- [ ] Validate weekly/monthly consistency and immutable historical snapshots.

## Release 2: Microsoft coverage and graphs
- [ ] Inspect production IntegrationConnection source diagnostics: last successful sync, source scope, permission/Graph errors, attempted/synced users, teams discovered/read/skipped, messages, author mapping, employee directory size. Do not conflate observed Teams message authors with permission coverage.
- [ ] Run Graph permission and consent checks for the Tehnopol tenant, including administrative consent, app-only role grants, policy restrictions, and Microsoft Teams endpoint capabilities.
- [ ] The current adapter uses /users/{id}/joinedTeams and per-team /channels/getAllMessages; it only collects channel messages, not 1:1/group chats. Determine which sources are legally authorized and supported before broadening claims.
- [ ] Determine whether 2/42 is a *message author count*, membership read coverage, actual allowed population, or attribution/mapping failure; reconcile Graph responses to directory IDs and WorkEvents.
- [ ] Avoid treating successful channel retrieval with zero messages as comprehensive Teams coverage.
- [ ] Finish and validate focus time, recurring-meeting burden, fragmentation, after-hours measures, sources/denominator tracking.
- [ ] Shared dashboard API; visual trend charts, distribution, source health, team drilldown (minimum cohort thresholds), missing-data explanations.

## Release 3: Decision intelligence and reporting
- [ ] Email: one finding, up to three validated visual metrics, one action, dashboard link; no technical appendix.
- [ ] Monthly and weekly use exact same canonical metric IDs, periods and source data; no contradictory score availability.
- [ ] Priority findings grounded in measured thresholds and sufficient coverage; clearly mark hypotheses rather than causal claims.
- [ ] Log owner/action/baseline/expected result and review at 14/30 days; chart actual change without implying causal proof.
- [ ] Golden-fixture tests, calendar and Teams mocked integration tests, cross-period reconciliation and CI quality gates.
- [ ] Deploy only after passing tests + production source reconciliation, and separately verify endpoint, email rendering and recipient delivery.

## Release criteria
1. Calendar sample reconciliation within pre-agreed tolerances, zero duplicate attendance, no impossible values delivered.
2. Every metric shown has eligible population, source completeness, freshness and calculation version.
3. Teams effective coverage is measured from source permissions and ingestion, not inferred from message authors; explain gaps instead of asserting 'connected'.
4. Dashboards, weekly and monthly reports reconcile against the same validated snapshots.
5. No unsupported model results, invented productivity/engagement claims or disclosure of individual private activity in customer-facing reports.

## Known implementation details
- `backend/services/coreIntegrationAdapters.js`: Teams uses `/users/{id}/joinedTeams`, `/teams/{id}/allChannels` and `/teams/{id}/channels/getAllMessages`. Check failures and license/permissions, not just event counts.
- `backend/services/integrationMetricsService.js`: unique meetings are deduped using meeting identifiers but participant-hours sum event rows; audit mixed legacy and expanded events.
- `backend/services/weeklyBriefService.js`: period-specific denominators are being repaired; rolling and fixed-week logic also needs reconciliation.
- `backend/services/monthlyReportService.js`: aggregates rolling seven-day snapshots; verify canonical matching weeks.

Do not send customer reports from unverifiable measurements.
