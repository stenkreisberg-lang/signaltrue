# Control Verification

Implements the SignalTrue *Australia Product & Developer Implementation
Specification v3.0*.

The spec was written for the Australian market. The **verification process is
identical in every country** — only the deployment paperwork differs, and that
lives in pluggable jurisdiction packs. An Estonian, German or UK customer uses
the same product and never sees Australian law.

## What it is

> Verify whether actions intended to reduce psychosocial work risk actually
> changed how work is happening, whether the change lasted, and whether workload
> migrated elsewhere.

```
IMPORT / DETECT → INVESTIGATE → CONSULT → CONTROL → VERIFY
    → CHECK MIGRATION & SUSTAINABILITY → HUMAN DECISION → EVIDENCE
```

It is **not** workplace analytics. Signal detection is one trigger into the
product, not the product. A case can be opened from a survey, an HSR or works
council concern, an audit, an incident or a regulator — with no SignalTrue
detection at all.

## Hard product rules

These are enforced in code and covered by tests, not just documented:

| Rule | Where it is enforced |
|---|---|
| No message/email body content is ever processed | `workPatternMetricsService.js` reads only content-free `WorkEvent` metadata |
| No individual score of any kind exists | no `userId` field on any output model; asserted in tests |
| Groups below the minimum size are suppressed everywhere | `hsPrivacyService.js`, applied before any value is computed |
| Only a human can close a case | `setStatus` refuses closing statuses; `recordDecision` requires an actor |
| Expected effects are recorded before review, then frozen | `controlIntervention.js` pre-validate + `updateExpectedEffects` |
| No causal or diagnostic language | `hsInterpretationService.js` screens every generated line |
| Completeness is reported, sufficiency is never judged | `reviewCompletenessService.js` — no score, no pass/fail |
| Connectors only ingest once the customer switches them on | `trustDeploymentService.assertConnectorsPermitted` |
| Every export and material change is audited immutably | `auditEvent.js` refuses updates and deletes |

## Layout

```
backend/models/controlReview/      14 domain models + constants
backend/services/controlReview/    17 services
backend/routes/                    controlReviews.js, workPatterns.js, hsDashboard.js
backend/middleware/hsAccess.js     the five H&S roles
src/pages/app/controlReview/       dashboard, case detail, wizard, trust pack
src/utils/controlReviewApi.js      API client + display vocabulary
```

Mounted at `/api/control-review`, `/api/work-patterns`, `/api/hs`.

## Jurisdictions

`services/controlReview/jurisdictionPacks.js` holds a registry of packs that
inherit from a `GLOBAL` floor:

```
GLOBAL  →  EU  →  EE / FI / DE
GLOBAL  →  AU  →  NSW / VIC / ACT / QLD / …
GLOBAL  →  UK / US / CA / SG / NZ
```

- A new tenant defaults to `GLOBAL` and timezone `UTC` — never to a country.
- An **unrecognised** jurisdiction degrades to `GLOBAL` rather than failing, and
  the UI says no pack exists yet.
- Checkpoints are phrased as *"confirm X was reviewed with your own adviser"*.
  They are design references, never a compliance claim.
- The pack is preparation material, not a gate. Whether workers were informed is
  the customer's duty as data controller; it is not verifiable from here, and a
  self-attested checkbox would buy friction rather than assurance. Activation
  records what was affirmed and what was outstanding, which is what makes the
  contractual position demonstrable later.
- Every pack ships `counselReviewed: false`, and the trust pack page says so on
  screen. A checkpoint list that *looks* authoritative but has not been checked
  is more dangerous than one that admits it is a starting point. Flip a pack to
  `true` only once a qualified adviser has signed it off for that market.

Adding a country means adding one entry to that file. Nothing else changes.

## Running it

```bash
cd backend && npm test -- tests/controlReviewAcceptance.test.js
```

64 tests covering the 24 P0 acceptance criteria (§36), the QA scenarios (§37),
and the non-Australian tenant cases.

Seed a full demo — two complete review journeys, a suppressed team and a
connector gap:

```bash
cd backend && node scripts/seedControlReviewDemo.js --drop
```

`CR-101` is the clean journey: survey trigger → consultation → meeting control →
improvement observed → no migration → closed.
`CR-102` is the exception (§32): meetings fall, chat coordination and after-hours
rise, the improvement does not hold, workers report it got harder — so it
surfaces possible migration, an unsustained improvement and mixed evidence, and
waits for a human decision.

Add `--emit-pdf <dir>` to write the Evidence Packs to disk.

## A note on this working copy

The project folder sits inside a cloud-syncing directory that periodically drops
stale duplicates beside the originals — `Actions 2.js`, `index 3.html`, and
thousands more inside `node_modules`. They are always older snapshots, never new
work. `.gitignore`, `.prettierignore` and the backend Jest config now exclude
them, so they cannot be committed or run as duplicate test files. The stray
copies already on disk are harmless but can be deleted at any time.

## Known gaps

- `UNINTERRUPTED_WORK_WINDOW` needs calendar **and** a messaging connector above
  60% coverage; below that it is withheld with a stated reason rather than
  estimated.
- `MANAGEMENT_LAYER_COORDINATION_LOAD` needs at least two managers in the group,
  otherwise the figure would describe one person.
- Evidence Pack is PDF only. DOCX and the CSV appendix are P1 (§34).
- Anonymous pulse surveys, WHS-system integrations and the cross-case control
  library are P1.
