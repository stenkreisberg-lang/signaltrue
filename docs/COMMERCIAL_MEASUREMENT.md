# Commercial measurement configuration

The public funnel is scoped to `www.signaltrue.ai` in production and to public routes only. The
authenticated product keeps its normal `page_view` events, but it does not emit
`commercial_page_view` or commercial funnel events.

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
- `SITE_ANALYTICS_REPORT_EMAIL`: weekly report recipient.
- `SITE_ANALYTICS_FROM_EMAIL`: verified weekly report sender.

`REACT_APP_API_URL` remains required in the frontend deployment and must point to the backend
origin.

## GA4 administration

Mark `lead_confirmed` as a key event. Do not mark form starts, CTA clicks or valid submissions as
leads.

Create event-scoped custom dimensions for:

- `cta_location`
- `error_type`

The core report still sends if either custom dimension has not been registered, but its relevant
diagnostic table will be empty and the report will identify the missing configuration.

No existing internal-traffic identifier or rule is present in this repository. Configure the
organisation's office/VPN ranges as GA4 internal traffic and activate the GA4 internal-traffic data
filter before relying on the weekly report as an external-only count.

## Lead confirmation semantics

A lead is confirmed after MongoDB stores the lead and the API returns success. Email delivery status
is retained on the lead but an email-provider failure does not discard or duplicate a stored lead.
The client uses an idempotency key so retrying after a lost response returns the original successful
record.

Analytics events never include form names, email addresses, organisations, roles or message text.
