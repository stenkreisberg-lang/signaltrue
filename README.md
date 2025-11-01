# 📊 SignalTrue

**Performance rhythm monitoring for modern teams**

SignalTrue helps organizations detect and prevent team burnout by analyzing Slack communication, calendar patterns, and work signals. Get AI-powered insights and actionable recommendations to maintain healthy team performance.

![SignalTrue Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-19.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-24.11-green)
![MongoDB](https://img.shields.io/badge/MongoDB-8.19-success)

---

## ✨ Features

### 📈 **Multi-Signal BDI Tracking**
- **Burn-Down Index (BDI)** calculation from 4 factors:
  - Workload (30%): Message volume analysis
  - Sentiment (25%): AI-powered tone detection
  - Responsiveness (25%): Response time patterns
  - Recovery (20%): Meeting load & work-life balance
- **Zone classification**: Recovery → Stable → Watch → Surge
- **Historical tracking**: 90-day snapshot history with baseline comparison

### 🎯 **Organization Dashboard**
- Expandable org-level overview
- Zone distribution pie chart
- Team comparison bar charts
- Real-time metrics: Avg BDI, at-risk teams

### 📊 **Timeline Visualization**
- Interactive 30-day BDI trend graphs
- Configurable time ranges (7/14/30/60/90 days)
- Baseline reference lines
- Trend calculations with percentage changes

### 🤖 **AI-Powered Insights**
- **Multi-provider support**: OpenAI (GPT-3.5/4) or Anthropic (Claude)
- **Smart playbooks**: Context-aware recommendations per team
- **Weekly summaries**: Automated health assessments via email/Slack
- **Sentiment analysis**: Understand team communication tone

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

### 4. Access Dashboard

Open http://localhost:3000 in your browser. You'll see 3 mock teams pre-loaded.

---

## 📦 Project Structure

```
signaltrue/
├── backend/                 # Node.js + Express API
│   ├── models/             # Mongoose schemas
│   │   └── team.js         # Team model with BDI history
│   ├── routes/             # API endpoints
│   │   ├── teamRoutes.js   # Team CRUD + AI analysis
│   │   ├── slackRoutes.js  # Slack data refresh
│   │   ├── calendarRoutes.js
│   │   ├── historyRoutes.js
│   │   └── notificationRoutes.js
│   ├── services/           # Business logic
│   │   ├── slackService.js
│   │   ├── calendarService.js
│   │   └── notificationService.js
│   ├── utils/              # Utilities
│   │   ├── aiProvider.js   # Multi-AI provider support
│   │   ├── aiUsage.js      # Token tracking
│   │   └── bdiHistory.js   # Snapshot management
│   ├── middleware/
│   │   └── auth.js         # Auth scaffold (ready for JWT/Clerk)
│   ├── server.js           # Express app + cron jobs
│   └── package.json
├── src/                    # React frontend
│   ├── components/
│   │   ├── Dashboard.js    # Main dashboard
│   │   ├── TeamCard.js     # Individual team display
│   │   ├── TimelineModal.js # BDI trend visualization
│   │   ├── OrgDashboard.js # Organization overview
│   │   └── PlaybookSidebar.js
│   ├── App.js
│   └── index.js
├── render.yaml             # Render deployment config
├── vercel.json             # Vercel deployment config
├── DEPLOYMENT.md           # Complete deployment guide
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

**Optional Integrations:**
```bash
SLACK_BOT_TOKEN=xoxb-...
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
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
- **Monday 9 AM**: Weekly summary emails/Slack messages

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
- [ ] Phase 7: Multi-organization support (JWT/Clerk auth)
- [ ] Phase 8: Mobile app
- [ ] Phase 9: Advanced analytics (predictive burnout)

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
