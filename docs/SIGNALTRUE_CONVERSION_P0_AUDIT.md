# SignalTrue Conversion P0 audit

Audit completed: 4 September 2026

Production web stream: `https://www.signaltrue.ai` / `G-32VLC15W5G`

Scope: public-site collection, attribution reporting, CTA routing, lead form, backend acceptance,
notification handoff and production-like browser tests. No visual redesign was performed.

## Executive status

The frontend and backend implementation is deployed. The required GA4 custom definitions, key
event, developer filter and single-SPA-page-view setting were updated in the live GA4 property.
The Internal Traffic filter remains in Testing until SignalTrue's current office/VPN IP ranges are
verified. Historical GA4 data is not rewritten; 4 September 2026 is enforced as the clean reporting
boundary and pre-boundary comparisons are disabled by default.

## Issues found and changes made

### 1. Collection scope was too broad

**Found:** GA4 was statically loaded by the application shell. That allowed preview, localhost,
authenticated/private routes and automated test traffic to enter the production measurement path.
The standalone Drift page and more than 30 retained public/marketing HTML files also had independent
static GA tags, so fixing only the SPA would not have closed the collection leak.

**Changed:** GA4 now loads dynamically only when all of these conditions hold:

- hostname is exactly `www.signaltrue.ai`;
- route is public (including exclusions for `/login`, `/dashboard` and `/app/*` plus the other
  authenticated product routes);
- the browser is not automation/headless and the session is not marked debug, QA, E2E, test or
  `production_smoke`.

QA detection suppresses the entire browser session, so navigating away from a tagged smoke-test
landing page cannot restart production collection. The internal analytics ingestion route enforces
the same origin, route and automation policy server-side. The weekly GA4 report applies identical
exact-host/public-route/automation filters to every query. Retained static pages now use one gated
helper with the same rules; their direct GA loaders and inline gtag handlers were removed.

### 2. SPA page views could be counted twice

**Found:** the app sent manual route-change `page_view` events while GA4 enhanced measurement had
browser-history page changes enabled. The frontend also emitted a parallel
`commercial_page_view`, creating a second page-stage event in commercial reporting.

**Changed:** gtag initializes with `send_page_view: false`; browser-history page changes were
disabled in the live GA4 stream; `commercial_page_view` was removed; and one route tracker now
deduplicates by route. It waits for route metadata, then sends one event containing the current
`page_title`, `page_location` and `page_path`.

### 3. Acquisition values were fragmented

**Found:** custom attribution values and GA-native values were reported without a common
normalization pass. This allowed variants such as `direct / (none)`, `(direct) / (none)` and
`(not set) / (not set)` to become separate rows. `production_smoke / qa` came from automated
production checks carrying test campaign values; it was not genuine acquisition traffic.

**Changed:** known source and medium aliases, case variants, empty values and GA's not-set values
are canonicalized before aggregation. Direct/unattributed is always `(direct) / (none)`.
Automation/test campaign markers are rejected at collection time and excluded from every reporting
query. Existing locally stored legacy attribution is normalized when read.

### 4. Direct share could reach 112.5%

**Found:** the numerator summed multiple unnormalized direct-like source rows while the denominator
came from a separate summary query. Those were not the same population, so the result could exceed
100%.

**Changed:** the direct numerator and session denominator are now calculated from the same
normalized source/medium distribution. Share and funnel-rate helpers also enforce the invariant
`0 <= percentage <= 100`.

### 5. Funnel events and GA4 definitions were incomplete

**Found:** `lead_form_submit` represented a client-side submission rather than authoritative lead
acceptance; the required event-scoped dimensions were absent in the live property; obsolete lead
events were still key events.

**Changed:** the implemented funnel contract is:

| Event | Authority / trigger |
| --- | --- |
| `primary_cta_click` | one primary CTA activation |
| `sample_report_view` | sample report becomes visible |
| `lead_form_start` | first interaction with the short form |
| `lead_form_error` | deduplicated validation or request failure |
| `lead_submit_success` | API confirms a persisted/idempotently recovered lead |
| `lead_confirmed` | same authoritative backend confirmation; the only lead key event |
| `booking_link_click` | confirmed-state booking option activation |

The live property now contains event-scoped `cta_location`, `error_type`, `intent` and
`form_version` definitions. `lead_confirmed` is marked as the lead key event; obsolete
`close_convert_lead` and `qualify_lead` key-event markings were removed. GA4's default `purchase`
key event remains unrelated to the lead funnel. An idempotent Admin API script was added for repeat
configuration and diagnostics.

Analytics parameters use a strict safe-field allowlist. Entered email, name, company, role and free
text are never sent. `error_type` is a fixed code such as `validation` or `network_error`, not a
field value or error message.

### 6. Primary CTAs generated malformed contact URLs

**Found:** query strings were appended in more than one CTA path, allowing
`/contact?intent=demo?intent=demo`.

**Changed:** contact destinations are built centrally with `URLSearchParams`. The default demo
destination is exactly `/contact?intent=demo`; CTA location travels in router state instead of
duplicating query syntax. `/demo` redirects were aligned across the router, Vercel and static-host
redirects. The contact route also canonicalizes legacy malformed links on arrival.

### 7. The first form step had unnecessary friction

**Found:** role and message/free text were part of the initial lead form even though they were not
required to create or route a lead.

**Changed:** the first step is now Work email, Company and Name, in that order. Role and message are
not shown or required. Controlled form state is preserved after validation and request errors.
Duplicate start, error, submit and confirmation emissions are guarded.

### 8. Lead confirmation was not sufficiently authoritative

**Found:** client success needed an explicit backend persistence contract, and email failure could
otherwise encourage a duplicate resubmission after the database had already accepted the lead.

**Changed:** the backend validates the three essential identity fields, persists first, then sends
the internal notification and visitor confirmation. A successful or idempotently recovered response
contains `success`, `confirmed` and `leadId`; the browser does not emit success/confirmation events
without all three. Email delivery status is stored. If email fails after persistence, the accepted
lead remains confirmed and is logged for operational recovery instead of being duplicated.

## GA4 property changes verified live

- Four required event-scoped custom dimensions: present (4/4).
- `lead_confirmed`: present and marked as the lead key event.
- Obsolete lead key events: unmarked.
- Enhanced measurement, browser-history page changes: disabled.
- Developer Traffic data filter: Exclude / Active.
- Internal Traffic data filter: Exclude / Testing (requires verified IP ranges before activation).

## Automated coverage and verification

The Playwright conversion suite runs in desktop Chromium and a Pixel 7 mobile profile. It fails if
a rendered primary CTA contains a second `?` or duplicate `intent`, the form cannot submit, the API
rejects a valid lead, confirmation/booking is missing, required events do not fire, or CTA/form/page
events fire more than once. It also asserts the three-field form, exact route metadata and absence
of PII in captured analytics parameters.

Verification performed in this workspace:

| Check | Result |
| --- | --- |
| Conversion Playwright spec | 12/12 passed (desktop + mobile) |
| Focused frontend analytics/form tests | 29 passed |
| Full frontend suite | 62 passed |
| Backend full suite | 299 passed, 1 skipped |
| Frontend lint | passed |
| Backend lint | passed with no errors (existing warnings remain) |
| Production build | passed |
| Full Playwright suite | 72 passed (desktop + mobile) |

## Production release verification

- Frontend deployed from `755efd17dac892a59bef97d8c17ed3e0c7c2a9c7` and verified through the
  production build-version endpoint.
- Backend deployed from `84348aa275641566a742e375c1d1c00894e0e853`; production health reported
  ready with the database connected.
- Production smoke run `20260904-060512Z` reached the canonical contact page, preserved the
  three-field form contract, exercised validation, persisted lead
  `6a9a5fd7f562eb4adea8e496`, recovered that same lead idempotently, showed confirmation and the
  booking option, and emitted zero GA/internal-analytics requests from the tagged automated session.
- The email provider accepted both messages. The internal lead notification and visitor
  confirmation were subsequently verified as delivered in the SignalTrue mailbox.
- The repeatable production smoke runner is `tools/production-funnel-smoke.mjs`; it requires an
  explicitly supplied internal `SMOKE_EMAIL` and does not contain a committed recipient address.

## Remaining live-admin safeguard

The existing Internal Traffic filter must remain in Testing until SignalTrue's current office/VPN
CIDRs are verified against the Google tag's internal-traffic rule. Activating an incorrect range
would irreversibly exclude genuine future traffic. All other production checks above are complete.
