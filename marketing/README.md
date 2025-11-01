# SignalTrue Marketing Site

Static marketing pages intended to be deployed at https://signaltrue.ai

## Structure
- index.html — Homepage
- product.html — Product overview
- pricing.html — Plans
- solutions.html — Solutions by audience
- resources.html — Guides and playbooks
- about.html — Mission and principles
- contact.html — Contact methods
- privacy.html — Privacy policy (placeholder)
- terms.html — Terms of service (placeholder)
- styles.css — Shared styles
- sitemap.xml, robots.txt
- vercel.json — Clean URLs + headers for Vercel

## Local preview
Open any HTML file in a browser, or serve the `marketing/` folder with a static server.

## Deploy to Vercel
1) Create new Vercel project and select this repo.
2) Set “Root Directory” to `marketing/`.
3) Build Command: none. Output Directory: `.` 
4) Add domain: `signaltrue.ai` (and optionally `www.signaltrue.ai` -> redirect).
5) DNS: point `signaltrue.ai` A record to Vercel or use Vercel-managed DNS.

Clean URLs are enabled, so:
- https://signaltrue.ai/product serves product.html
- https://signaltrue.ai/pricing serves pricing.html

## App and API
- App login/register links point to https://app.signaltrue.ai
- Backend/API should live at https://api.signaltrue.ai