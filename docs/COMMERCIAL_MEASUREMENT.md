# Commercial measurement configuration

The public funnel is scoped to the exact production host `www.signaltrue.ai` and to public routes
only. Preview hosts, localhost, automation/debug sessions and authenticated/private routes do not
load GA4 or emit commercial funnel events.

## Required backend configuration

- `MONGO_URI`: required for confirmed lead persistence.
- `RESEND_API_KEY`: required for internal lead notifications, visitor confirmation email and the
  weekly report email.
- `EMAIL_FROM`: verified Resend sender for lead emails.
- `WEBSITE_LEAD_NOTIFICATION_EMAIL`: internal recipient for website requests.
- `CALENDAR_LINK`: optional scheduling URL returned only after the lead is confirmed.
- `GA4_PROPERTY_ID`: GA4 property numeric ID.
- `GA4_SERVICE_ACCOUNT_JSON` or `GA4_SERVICE_ACCOUNT_JSON_BASE64`: service-account credentials with
  read access to the GA4 property.
- `GA4_SITE_HOSTNAME`: keep as `www.signaltrue.ai` for production commercial reporting.
- `GA4_CLEAN_REPORTING_START_DATE`: optional override for the clean reporting boundary; defaults to
  `2026-09-04`.
- `SITE_ANALYTICS_REPORT_EMAIL`: weekly report recipient.
- `SITE_ANALYTICS_FROM_EMAIL`: verified weekly report sender.

`REACT_APP_API_URL` remains required in the frontend deployment and must point to the backend
origin.

## GA4 administration

`lead_confirmed` is the authoritative lead key event. It is emitted only after the backend has
persisted or idempotently recovered a valid lead. Do not mark form starts, CTA clicks or accepted
client-side submissions as lead key events.

Create event-scoped custom dimensions for:

- `cta_location`
- `error_type`
- `intent`
- `form_version`

Run `npm --prefix backend run ga4:configure-commercial` with the GA4 Admin credentials configured
to make the stream setting, custom dimensions and key event idempotent. The script also reports
conflicting key events and missing active data filters.

SPA page views are manual. The frontend initializes gtag with `send_page_view: false`, and GA4's
enhanced-measurement option "Page changes based on browser history events" must remain disabled.
Each public route emits one `page_view` after its title metadata has updated, with one
`page_title`, `page_location` and `page_path` value.

The commercial report applies the same exact-host, public-path and automation exclusions to every
query. Source/medium values are canonicalized before aggregation; `(direct) / (none)`, case and
known aliases therefore cannot produce separate rows. All shares and funnel rates use comparable
numerators and denominators and are bounded to 0–100%.

Historical contaminated GA4 rows remain immutable. The production overview therefore defaults to
the clean release boundary of 4 September 2026 and does not calculate a pre-boundary comparison.
An explicit comparison is allowed only when both previous-range dates are supplied and are known to
be clean.

GA4 has an active Developer Traffic exclusion. A live audit on 4 September 2026 found no Google-tag
internal-traffic rules, so the Internal Traffic exclusion remains in Testing. Supply the
organisation's authoritative office/VPN CIDRs, add and verify them in the rule, and only then
activate the filter; GA4 data filters are not retroactive.

## Lead confirmation semantics

A lead is confirmed after MongoDB stores the lead and the API returns success. Email delivery status
is retained on the lead but an email-provider failure does not discard or duplicate a stored lead.
The client uses an idempotency key so retrying after a lost response returns the original successful
record.

Analytics events never include entered names, email addresses, company values, roles or message
text. `error_type` is a fixed taxonomy and never contains validation messages or field values.
