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

Release status: code prepared and tested. Verify the resulting GitHub commit, deployment and public bundle separately. Vercel project inspection returned 403 for team `team_APYQ77oyGgV7CPO9VMBheK38`; do not bypass this restriction. The production build-version endpoint still returned `c42eefdb8ee76accdc4ff576457807e94fa7bb7f` before this release.

Measurement baseline, 22 September to 19 October: six GA4 sessions, twelve page views, no diagnostic events. Basic collection resumed on 18 October after the prior queue repair. The preceding period is not a valid conversion comparison because of the collection interruption. Search: 21 clicks vs 20, 1,209 impressions vs 1,694.

Next checks:
1. Verify this release is live using build-version and the public diagnostic bundle.
2. Verify actual Google receipt of the diagnostic event from eligible real activity or a verified separate test destination. Unit tests do not establish Google receipt. Do not generate a business conversion to test.
3. Observe qualified diagnostic starts/completions, lead submissions/confirmed enquiries and free-pilot requests. Commercial conversations and customers remain UNKNOWN without source evidence.
4. Tag legitimate distribution links with source, medium and campaign. Never infer unqualified or automated traffic from country or direct attribution alone.

No commercial improvement or new customers are claimed by this release. Do not keep reporting these implemented repairs as new proposals.
