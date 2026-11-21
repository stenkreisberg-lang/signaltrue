# SignalTrue Inbound Engine — production/repository audit and release gate
Date: 2026-10-27
Status: **WORK IN PROGRESS — DO NOT MERGE OR DEPLOY TO PRODUCTION WITHOUT EXPLICIT RELEASE APPROVAL**

## Verified baseline
- Production host: www.signaltrue.ai, served by Vercel project `signaltrue-frontend`; apex signaltrue.ai redirects to www.
- Main branch includes the Australian consultant route, its lead intent, an eight-question control-review checklist and route-level metadata.
- Existing `LeadForm` POSTs to `/leads`, requires server `success`, `confirmed` and `leadId` before displaying success, and includes landing page, UTM values, referrer, CTA and anonymous session ID.
- Existing client analytics has a production-only GA4 gate for www.signaltrue.ai, suppression for automation markers and authenticated paths, and sanitization of common PII fields.
- Existing sample report states that its organisation, intervention and figures are fictional.
- Existing build writes crawler-readable route HTML using `src/seo/routeMeta.js`.

## Findings and risks requiring verification
1. **Measurement continuity:** production-only hostname gating means preview/staging deliberately cannot emit GA4 events. Verify with test-event instrumentation, not production analytics pollution. GA4 key-event configuration and GA4 vs internal counts require account-side validation.
2. **Lead persistence:** frontend acknowledgement requires an API lead ID, but this does not prove the Commercial OS has stored, deduplicated, qualified or attributed the lead. Inspect backend route, database migrations and readback; perform synthetic staging submission and deletion.
3. **Attribution:** first-touch source and medium are captured in session storage. Test cross-page preservation, malformed storage, UTM case normalization, consent and redirect handling. No personal form values may enter analytics.
4. **Conversion:** `lead_confirmed` and `lead_submit_success` exist. Validate they fire once per successful submission, never on failures, and are configured as key events. Track the distinct consultant and employer journeys without duplicate counts.
5. **Diagnostic:** eight-question checklist offers an indicative score. Confirm that scoring is not presented as a validated risk, compliance or effectiveness measure. Audit overlap with other self-check/audit routes before redirects or consolidation.
6. **Synthetic report:** fictional data is labelled. Review all graphs, denominators, confidence/limitations, missing-data handling, aggregation thresholds and accessible chart alternatives.
7. **Search:** crawl the generated HTML, canonical links, sitemap, robots, structured data and competing intent pages. Avoid automatically removing indexed pages without traffic and backlink evidence.
8. **Privacy/security:** verify Entra admin consent and least-privilege Graph scopes, active-user filtering, tenant boundaries, aggregation threshold, worker transparency, retention/deletion, manager authorization and export controls. No security claims before evidence.
9. **Free pilot:** confirm actual onboarding steps, consent/permissions, eligibility, baseline, worker consultation, review decision, failure handling and human ownership.

## Release acceptance criteria
- Passing build, typecheck, unit tests, end-to-end navigation and lead form tests on the final SHA.
- Synthetic staging lead can be submitted and read back from Commercial OS, deduplicated, attributed and removed; no real person data used in QA.
- Analytics event naming, single-fire, consent and PII exclusions verified in staging test harness; GA4 admin configuration checked separately.
- Security and privacy tests for multi-tenant access, small teams, manager reports, permissions and retention pass.
- SEO checks cover crawlable route HTML, canonical, sitemap, structured data and broken links.
- Production remains unchanged until the user explicitly approves the **final release** after evidence review.

## Existing earlier release
PR #49 was merged and deployed before this new release-gated instruction. This new branch starts from current main and will **not** merge or deploy automatically.
