# SignalTrue weekly admin report recovery | 23 November 2026

## Observed facts
- The connected SignalTrue Gmail mailbox `sten.kreisberg@signaltrue.ai` contained the weekly commercial site analytics message on 23 November, but no `Weekly Intelligence Brief` customer-report copy was found in the searched mailbox, Spam or Trash.
- `backend/services/weeklyBriefDeliveryEnvelope.js` includes a SignalTrue QA recipient in the same customer send only if `CLIENT_REPORT_QA_COPIES_ENABLED=true` and `SUPERADMIN_EMAIL` is a valid `@signaltrue.ai` business address.
- The 16 November production incident documented in PR #83 had a partial weekly delivery and unrelated missing authorised HR recipients; it **does not** prove the cause of 23 November.
- Production dispatch state, provider acceptance per recipient, and actual Render env values remain **unverified**.

## Safe production recovery (no blind resend)
1. Confirm the correct Render workspace/service, deployed backend SHA, and reporting environment. Do not copy secret values into logs, chat or tickets.
2. Verify the production configuration: `CLIENT_REPORT_QA_COPIES_ENABLED` should equal `true`; `SUPERADMIN_EMAIL` should equal `sten.kreisberg@signaltrue.ai`. This is an explicit platform QA recipient, not a fallback to personal Gmail. Respect contractual and tenant privacy approvals.
3. Using the authenticated `GET /api/reports/email-status` endpoint, inspect the **current** weekly customer delivery record and new `adminCopies` counts. A customer `sentThisWeek=true` is not evidence of admin inbox receipt.
4. In MongoDB check this reporting week in `CronLog` (`weekly-email-brief`) and `WeeklyBriefDispatch`. For each active client, identify: authorised HR recipients, dispatch status, `qaCopyStatus`, provider message ID, and date. For legacy records without QA metadata mark the admin copy **unverified**, not delivered.
5. Inspect the Resend/SMTP provider logs/events for each client dispatch and the admin address. BCC `included` means the provider send request contained the address. Only recipient-level evidence can confirm acceptance/delivery; inspect bounced/suppressed states. Cross-check the connected SignalTrue Gmail mailbox.
6. If the customer send is `sent` or `unknown`, **do not rerun** `sendWeeklyBrief` as a workaround. Reconciling the provider response comes first. A missing founder copy needs a separate specifically authorised, tenant-safe recovery process using the saved report, never an unsolicited second customer send.
7. If a client has no active authorised HR/admin recipient, obtain customer HR approval before changing the recipients. Missing recipients are a different failure from missing founder copies.
8. Do not resend any Tehnopol report until the open source-to-report parity and recipient/access checks are accepted. Never substitute an unvalidated, recomputed snapshot for the report that was originally sent.

## Source-level repair on this branch
- Persist `qaCopyStatus` for every new weekly report dispatch.
- Preserve per-organisation copy inclusion on retries, separately count included, missing and unverified QA copies in `CronLog`.
- Surface configuration and QA gaps in the protected reporting status endpoint; do **not** treat customer success as proof the founder received a copy.
- Keep the existing customer-level idempotency and no-blind-resend rules.
- Regression tests cover disabled copy, duplicate recipient, configured BCC, and QA observability.

## Release conditions
- Targeted GitHub Actions tests and syntax checks pass on the exact PR head.
- Correct Render backend confirmed; inspect deployed SHA and flag values without exposing secrets.
- Check one authorised test tenant with a safe report fixture. Assert that the **same** provider send includes HR recipients and the SignalTrue QA BCC; verify provider acceptance and recipient-level outcome.
- Confirm the protected reporting status reflects configuration and QA counts.
- No customer backfill or production report resend is part of this change.
- Rollback on provider failures, duplicate sends, changed recipient authorisation, or report content mismatch.

## Remaining blocker
The Render connector explicitly requires the user to confirm the intended workspace before services/configuration can be inspected or modified. Until then, this work is a code change and release candidate, **not a verified production fix**.
