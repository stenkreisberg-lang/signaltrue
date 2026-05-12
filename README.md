# 📊 SignalTrue

**Early-warning system for behavioral drift and engagement strain in teams**

SignalTrue is an early-warning platform that detects behavioral drift and engagement strain risk in teams, explains why it matters, and recommends safe, reversible actions before capacity, delivery, or retention are impacted. Built from aggregated metadata only — no message content, no individual surveillance, team-level signals only.

![SignalTrue Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-24.11-green)
![MongoDB](https://img.shields.io/badge/MongoDB-8.19-success)

---

## 🆕 What's New (May 2026)

### 🔥 Engagement Strain Risk Model
Passive, metadata-only detection of team work-pattern strain risk. Grounded in JD-R and UWES research frameworks.

- **7 subscores**: Recovery Debt, Focus Erosion, Coordination Friction, Responsiveness Pressure, Collaboration Withdrawal, Manager Support Gap, Workload Volatility
- **Robust statistics**: Median + MAD baselines (42-day window) — outlier-resistant by design
- **Risk states**: Healthy → Watch → Strain → Critical, with trend tracking (improving / stable / worsening / accelerating)
- **Pattern detection**: 6 named patterns (hidden strain, quiet withdrawal, manager bottleneck, coordination tax, async breakdown, engagement theatre)
- **AI explanations**: `gpt-4o-mini` narrative generation with deterministic fallback
- **Weekly email reports**: Inline HTML digest with score bars, urgent actions banner, team breakdown
- **Privacy-first**: Team minimum 8, per-metric minimum 5 contributors, 40% concentration detection
- **Scoring version**: `2.0.0` — fully auditable per record

👉 API: `/api/engagement-strain/*` — see [API Endpoints](#-api-endpoints) below.

---

## 🆕 What's New (February 2026)

### 📊 OAR — Organizational Agility Rating
Single composite score (0-100) with four pillars: Execution, Innovation, Wellbeing, Culture. Your organization's health at a glance.

### 💰 ROI Translation Layer  
Convert behavioral metrics into dollar savings. Show executives the financial value of healthy teams.

### 🎯 Goal Tracking System
Set measurable goals tied to metrics. Track progress automatically with milestones and status updates.

### 🔔 Enhanced Notifications
In-app notification bell with unread badges. Never miss an alert, recommendation, or milestone.

### 📈 Recovery Journey Timeline
Chronological narrative of your health journey. Board-ready summaries for executive presentations.

👉 See [NEW_FEATURES_FEBRUARY_2026.md](./NEW_FEATURES_FEBRUARY_2026.md) for complete details.

---

### ✨ Features

### 🔥 **Engagement Strain Risk Model** *(v2.0.0)*
- **Primary engagement health score** (0–100, higher = more strain)
- **7 weighted subscores**: Recovery Debt (20%), Focus Erosion (18%), Coordination Friction (17%), Responsiveness Pressure (14%), Collaboration Withdrawal (12%), Manager Support Gap (11%), Workload Volatility (8%)
- **Robust baselines**: 42-day median + MAD, outlier-resistant
- **Named patterns**: hidden strain, quiet withdrawal, manager bottleneck, coordination tax, async breakdown, engagement theatre
- **AI-generated explanations** via `gpt-4o-mini`, deterministic fallback when unavailable
- **Weekly digest email** with per-team score bars, urgent action banners, privacy footer
- **Privacy gates**: 8-person team minimum, 5-contributor per-metric minimum, concentration detection
- **Frontend**: Executive summary tile (Overview + Executive Summary pages), full detail page with sparklines, subscore bars, pattern cards, alert banners

### 📈 **Behavioral Drift Index (BDI)**
- **Primary metric** for team health tracking
- **6 input signals**: Meeting load, after-hours activity, response time, async participation, focus time, collaboration breadth
- **4 drift states**: Stable → Early Drift → Developing Drift → Critical Drift
- **Confidence scoring**: Based on number of confirming signals
- **Historical tracking**: 90-day baseline comparison with deviation analysis

### 🔄 **Coordination Load Index (CLI)**
- Reframes meetings as system coordination cost
- Formula: (Meeting Time + Back-to-Back + Cross-Team Sync) / Available Focus Time
- **4 states**: Balanced (<30%), Moderate (30-50%), High (50-75%), Critical (>75%)
- Identifies when teams spend more time coordinating than executing

### 🧠 **Bandwidth Tax Indicator (BTI)**
- Detects cognitive overload masked by responsiveness
- **Triggers**: Response paradox, after-hours work, focus degradation, interruptions
- **Impact risks**: Decision quality, sustainability, capacity strain
- Weighted scoring across multiple cognitive load factors

### � **Silence Risk Indicator (SRI)**
- Highlights reduced voice and communication friction
- **4 proxies**: Declining contributions, narrowing network, slower upward responses, flattening sentiment
- Team-level aggregated detection without claiming psychological safety

### ⚡ **Enhanced Capacity Status**
- **Always shows drivers**: Top 3 factors with icons and percentages
- **One-sentence explanation**: Auto-generated contextual summary
- Green/Yellow/Red thresholds with trend indicators

### 📋 **Drift Response Playbooks**
- **5 default templates**: Standard, safe, reversible actions
- Applicability rules based on drift states and indices
- Expected effects and reversibility tracked
- Usage monitoring for effectiveness analysis

### 🔗 **Integrations**
- **Slack**: Message volume, response times, sentiment
- **Google Calendar**: Meeting hours, after-hours work, recovery scoring
- **Email**: Weekly HTML summaries with metrics
- **Cron automation**: Daily data refresh, weekly reports

### 🎨 **Modern UI**
- Responsive grid layout with animated gradient backgrounds
- Dark mode support
- Zone-based color coding (Recovery/Stable/Watch/Surge)
- Smooth animations and transitions

---

## 🚀 Quick Start

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- OpenAI API key or Anthropic API key

### 1. Clone & Install

```bash
git clone https://github.com/stenkreisberg-lang/signaltrue.git
cd signaltrue

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your MongoDB URI and API keys
```

**Minimum required in `.env`:**
```bash
MONGO_URI=mongodb://localhost:27017/signaltrue
OPENAI_API_KEY=sk-...
```

### 3. Start Development Servers

```bash
# Terminal 1: Start backend (from /backend directory)
npm start
# Backend runs on http://localhost:8080

# Terminal 2: Start frontend (from root directory)
npm start
# Frontend runs on http://localhost:3000
```

> Billing is optional and disabled by default. If Stripe environment variables are not set, backend billing endpoints will respond with HTTP 503 and the UI will display a friendly message; this won’t block the rest of the app.

### 4. Access Dashboard

Open http://localhost:3000 in your browser. You'll see 3 mock teams pre-loaded.

---

## 📦 Project Structure

```
signaltrue/
├── backend/                 # Node.js + Express API
│   ├── models/             # Mongoose schemas
│   │   ├── team.js                      # Team model (timezone + workConfig added)
│   │   ├── workEvent.js                 # Normalized event stream (all integrations)
│   │   ├── engagementTeamDaily.js       # Daily team metrics snapshot
│   │   ├── engagementBaseline.js        # 42-day median+MAD baselines per team
│   │   └── engagementStrainWeekly.js    # Weekly strain scores + patterns + actions
│   ├── routes/             # API endpoints
│   │   ├── teamRoutes.js
│   │   ├── engagementStrainRoutes.js    # /api/engagement-strain/*
│   │   └── ...
│   ├── services/           # Business logic
│   │   ├── engagementDailyAggregationService.js  # Daily metrics from WorkEvents
│   │   ├── engagementBaselineService.js          # Median+MAD baseline computation
│   │   ├── engagementWeeklyMetricsService.js     # Weekly aggregation
│   │   ├── engagementSubscoreService.js          # 7 subscore formulas
│   │   ├── engagementScoringService.js           # Overall score, risk state, trend
│   │   ├── engagementPatternService.js           # 6 named pattern detectors
│   │   ├── engagementRecommendationService.js    # Action generation + de-duplication
│   │   ├── engagementAlertService.js             # On-demand alert evaluation
│   │   ├── engagementExplanationService.js       # LLM + deterministic explanations
│   │   ├── engagementWeeklyJobService.js         # 11-step weekly pipeline
│   │   ├── engagementWeeklyEmailService.js       # HTML digest email
│   │   ├── weeklySchedulerService.js             # Cron orchestrator
│   │   └── ...
│   ├── utils/
│   │   ├── privacyGate.js  # Team size, metric suppression, concentration detection
│   │   └── ...
│   └── server.js
├── src/                    # React frontend
│   ├── components/
│   │   ├── EngagementStrainDashboard.tsx  # Executive tile (org overview)
│   │   └── ...
│   ├── pages/app/
│   │   ├── Overview.js                   # Engagement tile embedded
│   │   ├── ExecutiveSummary.js           # Engagement tile embedded
│   │   └── EngagementStrainTeamDetail.tsx # Full detail + history page
│   ├── hooks/
│   │   └── useEngagementStrain.ts        # 4 typed React Query hooks
│   └── App.tsx                           # Routes: /app/engagement-strain[/:teamId]
└── README.md
```

---

## 🔧 Configuration

### Backend Environment Variables

See [`backend/.env.example`](backend/.env.example) for all options.

**Required:**
```bash
MONGO_URI=mongodb://...
OPENAI_API_KEY=sk-...
```

**Optional Integrations & AI:**
```bash
SLACK_BOT_TOKEN=xoxb-...
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
OPENAI_API_KEY=sk-...          # Required for LLM explanations (falls back gracefully)
OPENAI_MODEL=gpt-4o-mini       # Default model for engagement strain explanations
SMTP_HOST=smtp.gmail.com       # Email digest (optional — no-op if unset)
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password
API_KEY=admin-secret
```

### Frontend Environment Variables

See [`.env.example`](.env.example).

```bash
REACT_APP_API_URL=http://localhost:8080
REACT_APP_DEFAULT_MODEL=gpt-3.5-turbo
```

---

## 🌐 Deployment

Full deployment guide: **[DEPLOYMENT.md](DEPLOYMENT.md)**

### Quick Deploy

**Backend (Render):**
1. Push to GitHub
2. Connect repo to Render
3. Deploy using `render.yaml` blueprint
4. Add environment variables

**Frontend (Vercel):**
```bash
vercel --prod
```

**Estimated Cost:** ~$7-15/month (Render Starter + AI API usage)

---

## 📡 API Endpoints

### Engagement Strain Risk
- `GET /api/engagement-strain/summary/:orgId` — Executive summary for all teams
- `GET /api/engagement-strain/team/:teamId` — Full detail + live alert evaluation
- `GET /api/engagement-strain/team/:teamId/drivers` — Top drivers (`?explain=true` for LLM paragraph)
- `GET /api/engagement-strain/team/:teamId/history` — Up to 26 weeks (`?weeks=N`)
- `POST /api/engagement-strain/report` — Admin-only: trigger scoring + email for org+week

### Teams
- `GET /api/teams` - List all teams
- `POST /api/analyze` - Generate AI playbook

### Data Refresh
- `POST /api/slack/refresh` - Refresh Slack data
- `POST /api/calendar/refresh/:id` - Refresh calendar data
- `POST /api/calendar/refresh-all` - Refresh all calendars

### History & Timeline
- `GET /api/teams/:id/history?days=30` - Get BDI history
- `GET /api/teams/:id/trend?days=7` - Calculate trend
- `POST /api/teams/:id/baseline` - Set baseline
- `GET /api/teams/:id/baseline-comparison` - Compare to baseline
- `POST /api/teams/:id/snapshot` - Create snapshot

### Notifications
- `POST /api/notifications/weekly` - Send weekly summaries
- `GET /api/notifications/preview/:id` - Preview AI summary

### Admin
- `GET /api/ai-usage` - View token usage (requires API_KEY)

### Billing / Payments
- `POST /api/billing/create-checkout-session` → Create Stripe Checkout session for subscription with a free trial. Body: `{ plan: 'starter'|'pro'|'enterprise', email?: string }`. Returns: `{ url }`.
- `GET /api/billing/portal-session?customerId=cus_xxx&returnUrl=https://...` → Create Stripe Billing Portal session. Returns: `{ url }`.
- `POST /api/stripe/webhook` → Stripe webhook endpoint (handles `checkout.session.completed` and subscription events). Configure `STRIPE_WEBHOOK_SECRET`.

See `backend/.env.example` for required `STRIPE_*` variables.

If `STRIPE_SECRET_KEY` is not provided, these endpoints will return `503 Billing not configured`, and the frontend will show a non-blocking notice. You can enable billing any time by adding Stripe keys and price IDs.

---

## 🤖 AI Provider Setup

### OpenAI (Recommended)
1. Get API key: https://platform.openai.com/api-keys
2. Set in `.env`:
   ```bash
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-3.5-turbo
   AI_PROVIDER=openai
   ```

### Anthropic Claude
1. Get API key: https://console.anthropic.com/
2. Set in `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   AI_PROVIDER=anthropic
   ```

---

## 🔔 Setting Up Integrations

### Slack Bot
1. Create app: https://api.slack.com/apps
2. Add scopes: `channels:history`, `channels:read`, `chat:write`
3. Install to workspace
4. Copy Bot Token → `SLACK_BOT_TOKEN`
5. Invite bot to channels: `/invite @SignalTrue`

### Google Calendar
1. Create service account: https://console.cloud.google.com
2. Enable Google Calendar API
3. Download JSON credentials
4. Copy JSON → `GOOGLE_SERVICE_ACCOUNT`
5. Share calendars with service account email

### Production OAuth (Google) notes
- Frontend initiates OAuth via backend at: `GET /api/integrations/google/oauth/start?scope=calendar&orgSlug=<slug>`.
- The authenticated user context is available at `GET /api/auth/me` and now includes `orgSlug` and `orgName` to compose the correct start URL on the client.
- The callback stores tokens under the organization's slug; ensure your app uses the canonical slug, not a Mongo ObjectId.
- Status endpoint: `GET /api/integrations/status?orgSlug=<slug>` returns connection booleans and details (e.g., connected.calendar and email).

Admin cleanup of orphan orgs (optional):
- Endpoint: `GET /api/admin/cleanup/orphan-orgs?dryRun=1` then run without `dryRun` to apply.
- Requires `ADMIN_CLEANUP_TOKEN` as a header `x-admin-token: <token>` or query param `?adminToken=<token>` (also accepts `?token=`).
- If `ADMIN_CLEANUP_TOKEN` is NOT set, dryRun is allowed for visibility, but destructive runs are blocked.
- Use this if any organizations were accidentally created with ObjectId-like slugs during earlier OAuth attempts.

### Email Notifications (Gmail)
1. Enable 2FA on Google account
2. Generate app password: Account → Security → App passwords
3. Set in `.env`:
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=16-char-app-password
   ```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
npm test
```

---

## 📅 Automated Cron Jobs

When backend is deployed (or running locally), these jobs run automatically:

- **Daily 2 AM**: Slack data refresh
- **Daily 2 AM**: Calendar data refresh
- **Daily 3:30 AM**: Unified metrics job (pull, aggregate, drift detect, energy index, alerts)
- **Monday 9 AM**: Weekly scheduler runs 4 steps in sequence:
  1. Legacy BDI diagnosis cycle
  2. **Engagement Strain scoring** — computes subscores, patterns, recommendations for all orgs
  3. **Engagement Strain email dispatch** — HTML digest to org admins (no-op if SMTP not configured)
  4. Experiment completion checks

---

## 🛡️ Security

- MongoDB authentication required
- API key protection for admin endpoints
- Rate limiting on AI analysis endpoint (6 req/min per IP)
- HTTPS enforced in production
- Environment variables for secrets
- Auth middleware ready for JWT/Clerk

---

## 🗺️ Roadmap

- [x] Phase 1: Visual foundation
- [x] Phase 2: Slack integration
- [x] Phase 3: Calendar integration
- [x] Phase 4: Org-level visualizations
- [x] Phase 5: AI-powered notifications
- [x] Phase 6: Deployment prep
- [x] Phase 7: Engagement Strain Risk Model (v2.0.0) — passive, metadata-only, 7 subscores, median+MAD, LLM explanations
- [ ] Phase 8: Org-structure sync (enables `hasOrgStructure` for Manager Support Gap subscore)
- [ ] Phase 9: Multi-organization JWT/Clerk auth
- [ ] Phase 10: Mobile app

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Submit a PR with clear description

---

## 📄 License

MIT License - see LICENSE file for details

---

## 💬 Support

- **Issues**: https://github.com/stenkreisberg-lang/signaltrue/issues
- **Docs**: See DEPLOYMENT.md for deployment help
- **Email**: support@signaltrue.com (coming soon)

---

**Built with ❤️ for healthy, sustainable teams**

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
