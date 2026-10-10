# Automated Insights engineering assessment

Assessment completed against checkout `12a66c4f0a7886ed7dda26ac0c165452007490e2` on 10 October 2026.

## Stack and runtime

- React/Vite frontend and Express 5 / Node 22 backend.
- MongoDB/Mongoose persistence.
- Integration scheduling is currently registered from `backend/server.js` and also from `backend/services/integrationSyncScheduler.js`.
- Existing work-pattern storage is `TeamWorkPatternMetric`, `SignalObservation`, and `PatternFinding`.
- Existing weekly delivery is `weeklyBriefService.js` through `weeklyEmailScheduler.js`.

The checked-out branch is `main`; the local SHA is known. Render's deployed SHA and live database state are operational checks and cannot be proven from this checkout.

## Reuse / fix / skip matrix

| Area | Decision | Finding |
| --- | --- | --- |
| WorkEvent ingestion and attribution | REUSE | Existing canonical metadata-only event layer and deduplication path. |
| Team metrics | FIX | Metrics are persisted, but quality currently blends activity with connector coverage and cannot distinguish a quiet team from a failed collector. |
| Baseline and observations | FIX | Historical rows are selected before quality filtering; bad weeks can enter the baseline. Persistence does not verify consecutive calendar weeks. |
| Pattern detection | FIX | Any persistent deviation can qualify; adverse direction is not filtered first. |
| PatternFinding | REUSE | Keep the enum and manual-case compatibility; add read-time lifecycle projection rather than replacing it. |
| Scheduler | FIX | Add one idempotent post-rollup weekly analysis owner in the existing integration scheduler. Do not add a competing cron service. |
| Weekly brief | REUSE / AUDIT | Reuse the existing brief and recipient configuration; automatic insights must remain HR/H&S-only and deduplicated. |
| Cross-channel migration | SKIP for intervention writes | Add only a guarded read-time co-movement helper later; never create synthetic interventions. |
| Manual recalculation route | REUSE / RESTRICT | Preserve for authenticated admin maintenance; automatic insights must not depend on it. |

## P0 implementation outline

1. Add a durable tenant/week analysis ledger with an atomic lease and unique tenant/week key.
2. Add a single weekly orchestrator that processes only closed tenant-local weeks after existing sync/rollup work, with bounded catch-up and retry-safe upserts.
3. Correct baseline quality filtering, consecutive-week persistence, and adverse-direction detection.
4. Expose lifecycle and quality details through the existing findings endpoint without changing manual case statuses.
5. Add acceptance tests for idempotency, adverse direction, invalid source periods, insufficient history, and no false improvement from missing events.

## Risks and limits

- Tehnopol production data, deployed Render SHA, actual source watermarks, recipient authorization, and active-directory reconciliation require a production-safe operational check; they are not inferred from code.
- The current metric implementation can report a numeric zero even when a source is absent. The smallest safe fix is to carry source health into the weekly metric quality gate before detection; no zero should be treated as evidence of improvement without a successful collection interval.
- Current `weeklyBriefService.js` contains legacy delivery behavior that must be audited before enabling automatic finding delivery; no worker or team-member recipients should be added.

## Estimates and release plan

- Stage 0 assessment: complete in this checkout; deployed/runtime verification remains external.
- Stage 1 source truth and detector gates: 1-2 engineer-days.
- Stage 2 weekly orchestrator and idempotency: 2-3 engineer-days.
- Stage 3 lifecycle/co-movement projection: 1-2 engineer-days.
- Stage 4 controlled pilot and validation: 1-2 engineer-days plus two completed scheduled runs.

Rollback is a feature-flag/configuration change plus disabling the scheduler invocation; persisted rows are backwards-compatible and manual case flows remain unchanged.
