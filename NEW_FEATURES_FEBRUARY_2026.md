# SignalTrue New Features — February 2026 Release

## 🎯 Overview

This release introduces five major features designed to provide executives with clearer visibility into organizational health, measurable ROI, goal tracking, and a compelling recovery narrative.

---

## 1. 📊 OAR — Organizational Agility Rating

### What It Is
A single composite score (0-100) that summarizes your organization's overall health across four key pillars. Think of it as your organization's "credit score" for operational agility.

### The Four Pillars

| Pillar | What It Measures | Key Metrics |
|--------|-----------------|-------------|
| **Execution** (30%) | How efficiently work gets done | Meeting load, focus time, decision speed |
| **Innovation** (20%) | Capacity for new ideas | Idea capture, experiment success rate |
| **Wellbeing** (30%) | Team health and sustainability | Energy index, after-hours work, sentiment |
| **Culture** (20%) | Collaboration quality | Network breadth, responsiveness, equity |

### Health Zones

| Score | Zone | Meaning |
|-------|------|---------|
| 75-100 | 🟢 Thriving | Organization is performing excellently |
| 55-74 | 🔵 Stable | Healthy with room for improvement |
| 35-54 | 🟡 At-Risk | Warning signs present, action recommended |
| 0-34 | 🔴 Critical | Immediate intervention needed |

### Benefits for Clients
- **One number to rule them all**: Answer "How healthy is my org?" instantly
- **Board-ready metric**: Simple score for executive reporting
- **Trend tracking**: See improvement over time
- **Pillar breakdown**: Identify which areas need focus

### API Endpoints
```
GET /api/oar/org              — Get current OAR score
GET /api/oar/org/history      — Get OAR trend over time
GET /api/oar/team/:teamId     — Get team-specific OAR
GET /api/oar/all-teams        — Compare all teams
GET /api/oar/widget           — Dashboard widget data
POST /api/oar/recalculate     — Force recalculation
```

---

## 2. 💰 ROI Translation Layer

### What It Is
Converts SignalTrue's behavioral metrics into actual dollar savings. Shows executives the tangible financial value of healthy teams and the cost of organizational drift.

### Savings Categories

| Category | What It Tracks | Example |
|----------|---------------|---------|
| **Meeting Savings** | Hours saved from reduced meeting load | "15 fewer meeting hrs/week = $45,000/month saved" |
| **Focus Time Gains** | Productivity from uninterrupted work | "12% more focus time = $28,000/month value" |
| **Decision Speed** | Faster decisions = faster execution | "2 days faster responses = $15,000/month" |
| **Intervention Impact** | ROI from completed interventions | "3 interventions = $22,000 impact" |

### Drift Cost Calculator
Shows projected cost if active drift continues uncorrected:
> "At current drift trajectory, estimated 30-day cost: **$47,500**"

### Configurable Settings
- Currency (USD, EUR, GBP, etc.)
- Average salary per employee
- Team size
- Working days per year
- Hours per day
- Overhead multiplier

### Benefits for Clients
- **CFO-ready justification**: Dollar amounts for budget discussions
- **Renewal justification**: "SignalTrue saved us $X this quarter"
- **Risk quantification**: Cost of inaction is visible
- **Customizable**: Matches your organization's cost structure

### API Endpoints
```
GET /api/roi/settings         — Get ROI configuration
PUT /api/roi/settings         — Update settings
GET /api/roi/summary          — Full ROI breakdown
GET /api/roi/drift-cost       — Projected drift cost
GET /api/roi/banner           — Dashboard banner data
POST /api/roi/toggle-overlay  — Show/hide ROI overlay
```

---

## 3. 🎯 Goal Tracking System

### What It Is
Set measurable goals tied to SignalTrue metrics and track progress automatically. Goals update in real-time as your metrics improve.

### Supported Metrics
- OAR (overall and pillars)
- Energy Index
- Meeting Load
- Focus Time
- Response Latency
- Sentiment
- After-Hours Activity
- Network Breadth

### Goal Statuses

| Status | Meaning |
|--------|---------|
| ✅ **Completed** | Target reached |
| 🟢 **On-Track** | Progress matches timeline |
| 🔵 **Ahead** | Exceeding expectations |
| 🟡 **At-Risk** | Progress lagging |
| 🔴 **Behind** | Significant risk of missing deadline |

### Features
- **Auto-progress tracking**: Goals update automatically from metrics
- **Milestones**: Set intermediate checkpoints
- **Direction awareness**: "Higher is better" vs "Lower is better" goals
- **Team or org-level**: Set goals at any level
- **Suggestions**: AI-powered goal recommendations based on current metrics

### Example Goals
- "Raise OAR to 70 by Q2"
- "Reduce meeting load to 20 hrs/week by March"
- "Improve focus time ratio to 60% by end of quarter"

### Benefits for Clients
- **Accountability**: Clear targets with deadlines
- **Visibility**: Track progress in real-time
- **Motivation**: Celebrate when goals are achieved
- **Alignment**: Everyone works toward the same targets

### API Endpoints
```
GET /api/goals                — List all goals
GET /api/goals/summary        — Goal statistics
GET /api/goals/suggestions    — AI-powered suggestions
POST /api/goals               — Create new goal
PUT /api/goals/:id            — Update goal
PUT /api/goals/:id/value      — Record progress
DELETE /api/goals/:id         — Delete goal
POST /api/goals/:id/milestones — Add milestone
```

---

## 4. 🔔 Enhanced Notification System

### What It Is
In-app notifications with a bell icon, unread badges, and persistent storage. Stay informed about important events without leaving SignalTrue.

### Notification Types

| Type | Trigger | Priority |
|------|---------|----------|
| 📊 **Metric Alert** | Threshold crossed | High/Urgent |
| 📉 **Drift Detected** | Behavioral drift found | Normal/High |
| 🔧 **Intervention Due** | Recheck time reached | High |
| ✅ **Intervention Complete** | Outcome measured | Normal |
| 🎯 **Goal Progress** | Milestone reached | Normal |
| ⚠️ **Goal At Risk** | Behind schedule | High |
| 🤖 **Recommendation** | AI suggestion available | Normal/High |
| 🚨 **Crisis** | Critical issue detected | Urgent |
| 📢 **Broadcast** | Admin announcement | Normal |
| 👋 **Welcome** | New user onboarding | Normal |

### Features
- **Unread badge**: See count at a glance
- **Mark as read**: Individual or bulk
- **Dismiss**: Remove from bell without deleting
- **Action buttons**: Quick links to relevant pages
- **Priority levels**: Low, Normal, High, Urgent
- **Persistent storage**: Notifications saved for 30 days

### Benefits for Clients
- **Never miss important alerts**: Everything in one place
- **Reduced email noise**: In-app instead of inbox
- **Quick action**: Direct links to relevant screens
- **Team awareness**: Broadcast important updates

### API Endpoints
```
GET /api/notifications/bell          — Bell dropdown data
GET /api/notifications/unread-count  — Badge count
GET /api/notifications/all           — Paginated list
PUT /api/notifications/:id/read      — Mark as read
PUT /api/notifications/mark-all-read — Mark all read
PUT /api/notifications/:id/dismiss   — Dismiss
DELETE /api/notifications/:id        — Delete
POST /api/notifications/broadcast    — Admin broadcast
```

---

## 5. 📈 Recovery Journey Timeline

### What It Is
A chronological narrative of your organization's health journey. Shows milestones, interventions, alerts, and OAR changes over time — perfect for board presentations.

### Event Types

| Type | Icon | Description |
|------|------|-------------|
| Milestone | 🏆 | Significant achievement |
| Alert | ⚠️ | Warning detected |
| Intervention | 🔧 | Action taken |
| Metric Update | 📊 | Significant metric change |
| Goal Complete | 🎯 | Goal achieved |
| Baseline Set | 📏 | Baseline established |
| Integration | 🔗 | Data source connected |
| Crisis | 🚨 | Critical event |
| Recovery | 💚 | Crisis resolved |

### Journey Summary
At a glance:
- **Starting OAR**: Where you began
- **Current OAR**: Where you are now
- **Total Gain**: Net improvement
- **Days Since Start**: Journey duration
- **Milestones**: Achievements count
- **Interventions**: Actions taken

### Board-Ready Narrative
Auto-generated summary for executive reporting:
> "Over the past 45 days, organizational agility has improved from 42 to 68 (+26 points). 5 interventions were implemented. 3 milestones were achieved."

### Benefits for Clients
- **Compelling story**: Show the journey, not just the destination
- **Proof of value**: Document every improvement
- **Board presentations**: Ready-to-share narrative
- **Historical record**: Never lose track of progress

### API Endpoints
```
GET /api/journey/timeline        — Chronological events
GET /api/journey/summary         — Summary statistics
GET /api/journey/oar-trend       — OAR trend data for charts
GET /api/journey/narrative       — Board-ready narrative
POST /api/journey/events         — Create custom event
PUT /api/journey/events/:id      — Update event
DELETE /api/journey/events/:id   — Delete event
```

---

## 🚀 Getting Started

### For Existing Users
All new features are available immediately. No configuration required.

1. **OAR**: Visit the dashboard to see your score
2. **ROI**: Go to Settings → ROI Settings to configure
3. **Goals**: Navigate to Goals page to set your first target
4. **Notifications**: Bell icon appears in the header
5. **Journey**: Access from the Journey page in sidebar

### For Developers

#### New Models
- `OARScore` — Composite health scores
- `ROISettings` — Organization ROI configuration
- `Goal` — Goal tracking with progress
- `Notification` — In-app notifications
- `JourneyEvent` — Timeline events

#### New Services
- `oarService.js` — OAR calculation
- `roiService.js` — ROI calculations
- `goalService.js` — Goal management
- `inAppNotificationService.js` — Notification management
- `journeyService.js` — Timeline management

---

## 📊 Feature Comparison

| Feature | Free Trial | Team Plan | Leadership Plan |
|---------|-----------|-----------|-----------------|
| OAR Score | ✅ | ✅ | ✅ |
| OAR History | 4 weeks | 12 weeks | Unlimited |
| ROI Dashboard | Basic | Full | Full + Custom |
| Goal Tracking | 3 goals | Unlimited | Unlimited |
| Notifications | ✅ | ✅ | ✅ |
| Journey Timeline | 30 days | 90 days | Unlimited |
| Board Narrative | ❌ | ❌ | ✅ |

---

## ❓ FAQ

**Q: Will OAR replace BDI?**
A: No, OAR complements BDI. BDI measures burnout drift specifically; OAR is a broader organizational health composite.

**Q: How accurate is the ROI calculation?**
A: ROI is directional, not exact. We use industry-standard formulas with your configured salary data. Results show ranges, not precise figures.

**Q: Can I set goals for specific teams?**
A: Yes, goals can be organization-wide or team-specific.

**Q: Are notifications sent via email too?**
A: Currently in-app only. Email notifications continue separately via existing drift alerts.

**Q: How often is OAR recalculated?**
A: Weekly by default, or manually via the recalculate endpoint.

---

## 📞 Support

Questions about the new features? Contact your SignalTrue success manager or email support@signaltrue.ai.

---

*Last Updated: February 2026*
*Version: 3.0*
