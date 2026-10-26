# SignalTrue CRO execution record

## 22 October 2026: diagnostic and offer repairs

Authorisation: Sten requested implementation and resolution of the CRO issues in ChatGPT on 22 October 2026.

Implemented changes:
- Remove AU$99 pilot wording from the homepage, Australian navigation and control-review diagnostic. Pilots are free.
- Add a homepage link to the control-review diagnostic. Correct How It Works to the same assessment with its actual length and no-email requirement.
- Correct the legacy marketing homepage links. The behavioural-drift assessment remains available for its specific purpose.
- Emit `did_control_work_started` on the first answer, once per mounted assessment.
- Emit the existing `did_control_work_completed` once per mounted assessment, despite result recalculation and edits. A reload starts a new assessment because this tool does not persist answers.
- Retain canonical-host, private-route and QA suppression.

Validation: 82 frontend tests passed across 26 files; production build passed; changed TypeScript/TSX files passed ESLint. New tests cover incomplete assessment, first start, repeated result clicks, answer edits and the free offer.

Release status: LIVE VERIFIED. Code commit `2ce5c79f7c2bd00522ab05fbf046b3dd5c980f29`. Existing GitHub-to-Vercel deployment statuses reported success and the public build-version endpoint returned that commit. Chrome inspection confirmed the free-pilot copy and the corrected How It Works link to /did-the-control-work; no console errors were observed on the diagnostic page. Vercel's dashboard API still returned a team-scope 403, but the existing automatic deployment succeeded without changing permissions. Google completion-event receipt remains pending. This ledger-only update does not change the released application.

Measurement baseline, 22 September to 19 October: six GA4 sessions, twelve page views, no diagnostic events. Basic collection resumed on 18 October after the prior queue repair. The preceding period is not a valid conversion comparison because of the collection interruption. Search: 21 clicks vs 20, 1,209 impressions vs 1,694.

Next checks:
1. Verify this release is live using build-version and the public diagnostic bundle.
2. Verify actual Google receipt of the diagnostic event from eligible real activity or a verified separate test destination. Unit tests do not establish Google receipt. Do not generate a business conversion to test.
3. Observe qualified diagnostic starts/completions, lead submissions/confirmed enquiries and free-pilot requests. Commercial conversations and customers remain UNKNOWN without source evidence.
4. Tag legitimate distribution links with source, medium and campaign. Never infer unqualified or automated traffic from country or direct attribution alone.

No commercial improvement or new customers are claimed by this release. Do not keep reporting these implemented repairs as new proposals.

## 23 October 2026: collection and release follow-up

Status: diagnostic page-view receipt CONFIRMED in GA4; completion receipt PENDING. GA4 properties/516781576 recorded did_control_work_viewed once on 20 October from www.signaltrue.ai. This precedes the 22 October repair and is not evidence of its effect. The started event was introduced on 22 October, so absence before that date cannot establish non-starting visitors.

Latest settled window: 23 September to 20 October; baseline 26 August to 22 September. Ten sessions and zero recorded diagnostic completions. GA4 session comparison (10 vs 942) is not a performance comparison because tracking was interrupted. GSC 21 clicks vs 20 and 1,171 impressions vs 1,708. Sources: eight direct sessions, one Google organic and one chatgpt.com / ai-assistant. No qualified enquiry/customer outcome verified; downstream stages remain UNKNOWN.

Release follow-up: public build-version returned ef4a39c13a1ae1983aa90cfccf56b79a90733745. GitHub comparison against application release 2ce5c79f7c2bd00522ab05fbf046b3dd5c980f29 showed only docs/CRO_EXECUTION.md and qa/last-control-review-qa.json changed. The application repair remains deployed. No application redesign or analytics setting change made in this follow-up.

Next check: observe real completion receipt and the first settled days covering 22 October onward. Connected reporting tools do not offer Realtime/DebugView. Do not manufacture a production conversion. Safe separate-destination receipt validation remains unavailable. Monitor malformed landing path /ZGlkLXRoZS (two sessions) only as an investigation lead; no legitimate destination or source link was established, so do not add a guessed redirect.

## 24 October 2026: observation continued; no unsupported redesign

Settled GA4/GSC period: 24 September–21 October versus 27 August–23 September. GA4 12 sessions, 12 active users, 27 page views, one did_control_work_viewed, zero recorded did_control_work_started/completed and zero key events. Base collection resumed 18 October, so prior 869 sessions are not a valid like-for-like conversion comparison. The started event was introduced 22 October, outside this window; its absence is not abandonment. No cohort drop-off calculation warranted. GSC 21 clicks vs 20; 1,147 impressions vs 1,724; CTR 1.83% vs 1.16%; average position 7.77 vs 9.28. These pre-release observations cannot show the impact of the 22 October repairs.

Public canonical homepage responded HTTP 200 on 24 October and references index-CIahB-ys.js. Application release remains the previously live-verified 2ce5c79f7c2bd00522ab05fbf046b3dd5c980f29; no new application code, analytics settings or production diagnostic submissions today. Google completion receipt remains pending; connected reports do not provide Realtime/DebugView. Successful report requests, delivery, qualified enquiries, conversations, pilots and customers remain UNKNOWN, not zero.

Priority work today was the separate HybridWorkOS report-email response defect, corrected in that repository at d4ef5dd1fa046cebeafe526a7774e815ad3a0b14 with targeted tests passed. Its Supabase production function access was denied; do not mix that issue or its evidence into SignalTrue.

Next check: settled post-22-October journey events and actual Google completion receipt, with matching denominators and verified downstream records. Continue observing the approved application changes before adding another redesign.

## 25 October 2026: release and real page-view receipt revalidated

Public /did-the-control-work HTTP 200, index-CIahB-ys.js. Public build-version returned 9b43694de4c4f4b49df7c56dd3ef4cd4f63e0553. GitHub compare against approved application release 2ce5c79f7c2bd00522ab05fbf046b3dd5c980f29 shows only docs/CRO_EXECUTION.md and qa/last-control-review-qa.json changed: application repairs remain deployed. No new frontend changes or unnecessary repeat tests today.

GA4 settled window 25 September–22 October vs 28 August–24 September: 14 sessions, 13 active users, 34 page views, two did_control_work_viewed events from two users, zero recorded did_control_work_started/completed/key events. On 22 October one page-view event came from www.signaltrue.ai. This confirms Google receipt of a view, not completion or verified prospect intent. Started event was only introduced 22 October; aggregate lack of starts is not a valid abandonment measurement. Intraday timing relative to deployment not established; no uplift claim. Tracking resumed 18 October, so the 760 prior-period sessions are not a valid conversion-performance baseline.

Sources: nine direct, one not-set, one chatgpt.com / ai-assistant, one facebook.com referral, one lm.facebook.com referral, one Google organic. Landing sessions include homepage five, /au two and /signals/coordination-overhead two; malformed /ZGlkLXRoZS still two, without a proven source or legitimate destination. No guessed redirect or exclusion.

Latest GSC summary is settled through 23 October: 26 September–23 October vs 29 August–25 September, 22 clicks vs 20; 1,090 impressions vs 1,774; CTR 2.02% vs 1.13%; average position 7.67 vs 9.24. Query/page drill-down default used 25 September–22 October; signaltrue/homepage had 13 listed clicks, while top visible nonbrand rows had no clicks. The drill-down is truncated and cannot establish total nonbrand demand or source quality. Do not mix its date range with the summary as if identical.

Separate primary work: prepared HybridWorkOS bounded backend-release procedure in that repository, commit fee1155a73f2bd45d0e0a328468486324497a014. Its function-access denial does not establish a SignalTrue defect.

Status: existing application LIVE VERIFIED; real diagnostic view receipt VERIFIED; actual completion receipt PENDING. Report requests, delivery, qualified enquiries, commercial conversations, free pilots and customers UNKNOWN without source records. Continue observing eligible post-release activity and verify real completion receipt before another redesign.

## 26 October 2026: weekly CRO execution and measurement review

Release reverified: public /did-the-control-work returned HTTP 200 and index-CIahB-ys.js. build-version returned b5209b714f2802f0ede848443bb13fbc5842710f. GitHub comparison against approved application release 2ce5c79f7c2bd00522ab05fbf046b3dd5c980f29 shows only docs/CRO_EXECUTION.md and qa/last-control-review-qa.json changed. Free-pilot, diagnostic-link and first-answer/one-completion repairs remain deployed; no new application release, redesign, analytics setting or production test conversion today. Prior 82 tests/build/lint are the release validation evidence, not tests rerun today.

Reporting correction: a source freshness label (settledThrough) does not establish the default metric window. Default and explicit-window GSC results differed today under the same freshness label. Earlier GSC dates inferred from that label must not be reused as precise-period evidence. Use explicit request dates in every future comparison.

GA4 explicit latest settled 28 days: 26 September–23 October versus 29 August–25 September, Europe/Tallinn. 17 sessions, 15 active users, 46 page views, five commercial_engaged_visit events and two did_control_work_viewed events from two users. Diagnostic page-specific views: two; zero recorded did_control_work_started/completed/key events. No recorded report-request or lead-submission success in the returned event list. Actual report requests/delivery and downstream outcomes remain UNKNOWN. Started event was introduced 22 October; its absence over the longer period is not an abandonment rate. Base collection resumed 18 October and the preceding 759 sessions are not a valid conversion comparison.

Weekly GA4, 17–23 October vs 10–16 October: 17 sessions and two diagnostic views; zero recorded starts/completions. No GA4 data in the previous week, so no week-on-week percentage or lift claim. The week contains the tracking recovery and 22 October repairs, so even the newly visible activity cannot be attributed to those repairs.

GSC explicit latest settled 28 days: 27 September–24 October vs 30 August–26 September, America/Los_Angeles. 22 clicks vs 21, 1,008 impressions vs 1,804, CTR 2.18% vs 1.16%, average position 7.50 vs 9.28. Weekly explicit 17–23 October vs 10–16 October: one click vs six; 135 impressions vs 223; CTR 0.74% vs 2.69%; average position 8.46 vs 6.65. Search visibility weakened in that week; this is not evidence of diagnostic friction or a redesign effect. Top ten query/page rows are truncated: branded signaltrue/homepage carries 12 listed clicks; the other listed rows have no clicks and include broad software-alternative queries. No aggregate nonbrand demand/qualification claim.

GA4 source sessions: nine direct, three Google organic, two chatgpt.com / ai-assistant, one not-set and two Facebook referrals across two source names. Leading landings: homepage six, coordination-overhead four, /au two. The two malformed /ZGlkLXRoZS sessions persist without a verified legitimate source/destination; no guessed redirect. Changed landing volumes cannot be compared causally to the interrupted baseline. Direct or geography is not grounds for exclusion.

Weekly work actually completed: approved application repair 2ce5c79 deployed 22 October; real diagnostic-view receipt confirmed; release revalidated separately from docs/QA commits. Main independent work today advanced the pending HybridWorkOS backend Deno preflight, recorded separately in its ledger at 95709a9d85e49eab5704f4ab08d6d08587f98322. That permission/dependency blocker is not a SignalTrue defect.

No conversion hypothesis can yet be accepted or rejected; no conversion lift, qualified enquiry, commercial conversation, free pilot or customer has been established by this data. Actual downstream stages remain UNKNOWN. Completion-event receipt PENDING, real view receipt VERIFIED, existing application LIVE VERIFIED. Next action: verify actual Google receipt from eligible real diagnostic completion (or a verified separate test destination), then connect it to report/lead success and confirmed commercial records. Continue observing the deployed repairs before further redesign.
