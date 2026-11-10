# SignalTrue data reliability, privacy and operations acceptance

Date: 10 November 2026
Status: implementation in review, not verified against customer data.

## What the branch changes

1. Source verification: `/api/integration-dashboard/status` exposes independently defined measurement states. Connection, identity mapping and accepted stored events are distinct. The Data Coverage UI counts only verified sources.
2. Active workforce: new event identity mapping and team backfill exclude `accountStatus=inactive`. Historical snapshots are not silently rewritten.
3. AI provider: per-request provider selection no longer mutates `process.env.AI_PROVIDER`.
4. Report health: uncertain or stalled weekly/monthly sends are surfaced to current HR/admin accounts. Delivery is not automatically replayed where the provider may already have accepted the message.
5. Privacy requests: approved operations have Mongo-backed leases and recovery. Manual rectification and database-only erasure remain awaiting documented verification.
6. Trust: the public privacy statement and technical security FAQ distinguish verified hosting locations and credentials from unverified claims.
7. Dead code: unused team mock seeding removed.

## Remaining customer acceptance gates (NOT done in this branch)

- **Tehnopol**: use an approved, privacy-safe source sample to compare Microsoft Graph event counts with accepted WorkEvents, active identities, team attribution, duplicate handling, and 1-week/1-month trend totals. Record each source's consent, latest verified sync, source events, accepted events, mapped people, excluded people and reasons.
- Confirm `Chat.Read.All` is granted by the Microsoft tenant admin before claiming company-wide Teams chat signal coverage. A missing permission must produce `unavailable`, not zero.
- Reconcile every published metric (meetings, after-hours, focus, fragmentation, cross-team coordination, recovery) with the accepted snapshot and document the denominator and confidence.
- Exercise report emails with test recipients and a stubbed provider; verify identical approved content, one send per period, no personal mailbox, and alerting for uncertain delivery.
- Independently verify source-event enrichment, timezone/DST boundaries, old-vs-current employee reporting, empty/sparse periods, and deletion/retention boundaries.

## Data residency and enterprise procurement blocker

The active shared Render backend service `signaltrue-backend`, service id `srv-d4t8s6je5dus739crbp0`, was observed in **Oregon, US** on 10 November 2026. Its database, backup, and analytics provider residency are **not established** by this observation. No EU-only processing claim is justified. Before committing to EU-only processing:

1. Inventory actual MongoDB, backups, object stores, email, logs, AI, analytics, support and CDN region configuration.
2. Determine GDPR roles and transfer mechanisms with counsel, including subprocessors and SCC/DPF as applicable.
3. Design a separate EU-region Render service with isolated variables, network rules and verified database endpoints. Do not mutate the active service region without a tested cutover.
4. Build a synthetic-data staging deployment, validate worker permissions and data migrations, verify report parity and data deletion.
5. Plan cutover, DNS, rollback, post-migration checks, and customer notices; only then update residency statements.

## Operational verification

- Backend `npm --prefix backend run lint`
- Backend `npm --prefix backend run test:coverage -- --runInBand`
- Frontend `npm run lint`, `npm run format:check`, `npm run test:coverage`, `npm run build`, `npm run test:e2e`
- Dependency audits in `.github/workflows/ci-quality-checks.yml`
- Verify Render deploy commit and `GET /api/health/ready`; observe error logs at least during a complete measurement and reporting cycle.
- Record unverified checks as not run, not as passed.

This document does not assert full GDPR compliance, certification, complete erase across all stores, verified source coverage for any particular tenant, or production readiness based solely on CI.
