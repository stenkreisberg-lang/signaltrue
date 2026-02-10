# SignalTrue
## Behavioral Drift Intelligence Platform
### Complete Features Guide

---

**Version:** 1.0  
**Date:** February 2026  
**Classification:** Client Documentation

---

## Executive Summary

SignalTrue is the first **Behavioral Early-Warning System** that detects organizational overload and execution drift weeks before surveys, performance drops, or resignations appear. Unlike traditional HR analytics that rely on lagging indicators (surveys, exit interviews, performance reviews), SignalTrue observes behavioral metadata from work systems to reveal systemic strain before it becomes visible.

**Key Differentiators:**
- **No surveys required** — Passive behavioral observation
- **Privacy-first design** — No content access, no individual surveillance
- **Predictive, not reactive** — Early signals, not exit interviews
- **Structural insights** — System-level patterns, not individual blame

---

## Table of Contents

1. [How SignalTrue Works](#1-how-signaltrue-works)
2. [Core Health Metrics](#2-core-health-metrics)
3. [Four Primary Drift Signals](#3-four-primary-drift-signals)
4. [Ten Behavioral Intelligence Features](#4-ten-behavioral-intelligence-features)
5. [AI-Powered Recommendations](#5-ai-powered-recommendations)
6. [Client Dashboard Experience](#6-client-dashboard-experience)
7. [Privacy & Data Handling](#7-privacy--data-handling)
8. [Pricing Tiers](#8-pricing-tiers)

---

## 1. How SignalTrue Works

### The Four-Step Process

| Step | Name | What Happens |
|------|------|--------------|
| **01** | Observe | We observe behavioral patterns from calendar and communication metadata. No content. No surveillance. |
| **02** | Learn Baseline | SignalTrue learns what "normal" looks like for each team before detecting drift. |
| **03** | Detect Drift | Early signals that predict problems weeks before they become visible. |
| **04** | Signal | Leaders receive clear, system-level insights with actionable recommendations. |

### What We Observe

**Calendar Patterns:**
- Meeting hours per week
- Back-to-back meeting frequency
- Focus time availability (2+ hour blocks)
- After-hours meetings
- Meeting acceptance/decline rates

**Communication Patterns:**
- Response time patterns (not content)
- After-hours activity rates
- Collaboration network changes
- Sentiment indicators (emoji usage, tone)

### What We Never Access

- ❌ Email or message content
- ❌ File contents or documents
- ❌ Individual productivity scores
- ❌ Keystroke or screen monitoring
- ❌ Individual performance ratings

---

## 2. Core Health Metrics

### Behavioral Drift Index (BDI)

The BDI is the master health score that combines all risk factors into a single 0-100 metric.

**Formula:**
```
BDI = √((Overload Risk² + Execution Drag² + Retention Strain²) / 3)
```

**Interpretation:**

| Score | Zone | Meaning |
|-------|------|---------|
| 0-35 | 🟢 **Green** | Team operating within healthy patterns |
| 35-65 | 🟡 **Yellow** | Early warning signs, intervention recommended |
| 65-100 | 🔴 **Red** | Urgent action required, team at breaking point |

### Three Core Risk Dimensions

#### 2.1 Overload Risk
**What It Measures:** Burnout risk from excessive meetings and after-hours work

**Calculation Factors:**
- After-hours activity (35% weight)
- Meeting load (30% weight)
- Back-to-back meetings (20% weight)
- Focus time erosion (15% weight)

**What It Means:**
- High score indicates team working nights/weekends
- Predicts burnout, quality degradation, and attrition
- Threshold: >65 = burnout imminent

---

#### 2.2 Execution Drag
**What It Measures:** Slowdown in decision-making and output despite effort

**Calculation Factors:**
- Response time slowdown (40% weight)
- Meeting fragmentation (30% weight)
- Participation drift (30% weight)

**What It Means:**
- Work is taking longer despite effort remaining high
- Often signals coordination problems or unclear priorities
- Threshold: >65 = organizational gridlock

---

#### 2.3 Retention Strain
**What It Measures:** Flight risk across the team

**Calculation Factors:**
- Average attrition risk score (40% weight)
- Network shrinkage patterns (30% weight)
- Sentiment decline (30% weight)

**What It Means:**
- Multiple team members showing behavioral withdrawal
- Predicts resignations 4-8 weeks before notice
- Threshold: >65 = multiple departures likely

---

## 3. Four Primary Drift Signals

These are the early warning signals that predict problems before they become visible.

### 3.1 Focus Fragmentation

| Aspect | Description |
|--------|-------------|
| **What It Means** | Deep work time is being eroded by meetings, interruptions, and context switching |
| **Why It Matters** | Fragmented focus leads to lower quality output and increased stress, even when hours worked stay constant |
| **What We Observe** | Focus time blocks (2+ hours), meeting interruption patterns, context switching frequency |
| **What Leaders Can Change** | Protect focus blocks, consolidate meetings, reduce synchronous communication requirements |

---

### 3.2 Meeting Overload

| Aspect | Description |
|--------|-------------|
| **What It Means** | Calendar density exceeds sustainable thresholds for knowledge work |
| **Why It Matters** | Excessive meetings crowd out actual work, forcing it into evenings and weekends |
| **What We Observe** | Meeting hours per week, back-to-back patterns, recurring meeting load |
| **Threshold** | >25 hours/week in meetings indicates overload |
| **What Leaders Can Change** | Audit recurring meetings, implement meeting-free days, reduce default meeting lengths |

---

### 3.3 Execution Drag

| Aspect | Description |
|--------|-------------|
| **What It Means** | Work is taking longer despite effort levels remaining high |
| **Why It Matters** | Slowing execution often signals coordination problems, unclear priorities, or hidden blockers |
| **What We Observe** | Response time patterns, decision velocity, participation rates |
| **What Leaders Can Change** | Clarify priorities, reduce approval layers, address coordination bottlenecks |

---

### 3.4 After-Hours Drift

| Aspect | Description |
|--------|-------------|
| **What It Means** | Work is creeping into evenings and weekends at unsustainable rates |
| **Why It Matters** | After-hours work predicts burnout and attrition, often before people complain |
| **What We Observe** | Messages/meetings outside 9am-5pm, weekend activity, late-night calendar events |
| **What Leaders Can Change** | Redistribute workload, adjust expectations, address capacity gaps |

---

## 4. Ten Behavioral Intelligence Features

### Feature 1: Attrition Risk Detection ⚠️

**Purpose:** Predict individual flight risk 4-8 weeks before resignation

**How It Works:**
1. Establishes 30-day baseline of normal behavior
2. Compares last 7 days against baseline
3. Detects behavioral collapse patterns

**Warning Signals Detected:**
- Message volume drop (≥30% decline)
- Response time increase (≥50% slower)
- Network shrinkage (≥20% fewer contacts)
- Engagement drop (≥40% fewer thread replies)
- Meeting decline spike (≥30% more declines)
- One-on-one cancellations with manager

**Risk Score Interpretation:**

| Score | Risk Level | Predicted Timeline |
|-------|------------|-------------------|
| 0-39 | Low | Healthy engagement |
| 40-59 | Medium | 2-3 months if unaddressed |
| 60-79 | High | 1-2 months — retention conversation needed |
| 80-100 | Critical | 2-4 weeks — imminent departure |

**Client Sees:**
- List of high-risk individuals with specific behavioral signals
- Risk badges (critical/high/medium)
- Recommended actions for each person
- Trend over time

**Update Frequency:** Daily at 3:00 AM

---

### Feature 2: Manager Effectiveness 📊

**Purpose:** Measure manager quality through behavioral outcomes, not surveys

**How It Works:**

**Calendar Metrics (30% weight):**
- One-on-one consistency with each report
- Team meeting load management
- Last-minute cancellation rate

**Communication Metrics (30% weight):**
- Response time to team
- Recognition rate (kudos/praise per week)
- Escalation bypass frequency

**Team Outcomes (40% weight):**
- Team attrition risk average
- Team BDI score
- Team sentiment

**Score Interpretation:**

| Score | Level | Action |
|-------|-------|--------|
| 80-100 | Excellent | Top-tier manager, model behaviors |
| 65-79 | Good | Solid performance |
| 45-64 | Needs Improvement | Coaching required |
| 0-44 | Critical | Urgent intervention needed |

**Client Sees:**
- Manager leaderboard ranked by effectiveness
- Individual manager scorecards
- Strengths and improvement areas
- Specific coaching recommendations

**Update Frequency:** Monthly on 1st

---

### Feature 3: Crisis Detection 🚨

**Purpose:** Real-time detection of organizational emergencies

**How It Works:**
- Compares last 6 hours against last 7 days
- Detects anomalous patterns requiring immediate action

**Crisis Types Detected:**
- **Sudden sentiment collapse:** ≥60% drop in positive tone
- **Message volume spike:** ≥200% increase (firefighting mode)
- **After-hours flood:** ≥300% spike in night/weekend activity
- **Meeting cancellation wave:** ≥50% of day's meetings cancelled
- **Ad-hoc meeting surge:** ≥5 urgent meetings in 6 hours

**Severity Levels:**

| Severity | Response Time | Example |
|----------|---------------|---------|
| Critical | Immediate (15 min) | Team morale crash, major deadline missed |
| High | Within 2 hours | Project firefighting, blocked delivery |
| Moderate | Within 24 hours | Elevated stress, coordination issues |

**Client Sees:**
- Real-time crisis banner on dashboard
- Crisis type, severity, and likely triggers
- Recommended immediate actions
- Acknowledge/Resolve workflow

**Update Frequency:** Every 15 minutes

---

### Feature 4: Network Health 🔗

**Purpose:** Detect collaboration silos, bottlenecks, and knowledge concentration

**What We Analyze:**
- Communication patterns between teams
- Question/answer flows (who asks who)
- Topic expertise distribution

**Issues Detected:**

**Silos:**
- Teams with <20% cross-communication
- Departments operating in isolation

**Bottlenecks:**
- Individuals with ≥8 unique questioners
- Average response time >4 hours
- High dependency concentration

**Knowledge Concentration:**
- Topics with single expert (bus factor = 1)
- Critical areas with no backup

**Score Interpretation:**

| Score | Status | Meaning |
|-------|--------|---------|
| 80-100 | Healthy | Good collaboration patterns |
| 60-79 | Some Issues | Isolated pockets |
| 40-59 | Silos Detected | Poor knowledge sharing |
| 0-39 | Critical | Single points of failure |

**Client Sees:**
- Network health score
- Silo visualization
- Bottleneck list with overloaded experts
- Recommendations for improving collaboration

**Update Frequency:** Weekly on Sundays

---

### Feature 5: Succession Risk 🎯

**Purpose:** Identify critical knowledge dependencies and flight risks

**How It Works:**
- Analyzes question/answer patterns in communication
- Maps topics to experts
- Identifies potential successors

**Bus Factor Calculation:**
```
Bus Factor = Number of people who can cover ≥70% of critical topics
```

| Bus Factor | Risk Level | Meaning |
|------------|------------|---------|
| 1 | Critical | Single point of failure |
| 2 | High Risk | Limited backup |
| ≥3 | Acceptable | Knowledge distributed |

**Client Sees:**
- Critical dependencies list
- Knowledge areas per person
- Potential successors and readiness level
- Recommendations (cross-training, documentation)

**Update Frequency:** Monthly on 15th

---

### Feature 6: Equity Signals ⚖️

**Purpose:** Detect inequitable treatment from behavioral patterns

**Dimensions Measured:**

| Dimension | What We Observe |
|-----------|-----------------|
| Response Time Equity | Do some people wait longer for responses? |
| Participation Equity | Are some people excluded from meetings/discussions? |
| Workload Equity | Is after-hours work concentrated on certain people? |
| Voice Equity | Whose ideas get acknowledged and amplified? |

**Score Interpretation:**

| Score | Status | Action |
|-------|--------|--------|
| 80-100 | Equitable | Fair treatment across team |
| 70-79 | Minor Issues | Monitor |
| 50-69 | Inequity Detected | Investigate |
| 0-49 | Serious Inequity | Immediate action required |

**Client Sees:**
- Equity score per team
- Breakdown by dimension
- Specific areas needing attention
- Manager coaching recommendations

**Update Frequency:** Weekly on Mondays

---

### Feature 7: Project Risk 📈

**Purpose:** Predict project delays from behavioral patterns (no Jira required)

**Signals Analyzed:**

**Calendar Signals:**
- Meeting frequency changes (spike = firefighting)
- Attendance decline
- Duration increases (longer meetings = trouble)

**Communication Signals:**
- Message volume trends
- Blocker keywords ("stuck", "blocked", "waiting on")
- Escalation keywords ("urgent", "critical", "ASAP")

**Risk Prediction:**

| Score | Prediction |
|-------|------------|
| 80-100 | Likely to miss deadline by >2 weeks |
| 60-79 | May slip 1-2 weeks |
| 40-59 | On track but monitor closely |
| 0-39 | Healthy progress |

**Client Sees:**
- Project list with risk scores
- Risk level badges
- Specific signals detected
- Resource/blocker recommendations

**Update Frequency:** Daily at 2:00 AM

---

### Feature 8: Meeting ROI 📉

**Purpose:** Measure meeting effectiveness from post-meeting behavior

**How It Works:**
Analyzes activity in 4 hours following each meeting:

**Positive Signals:**
- Action messages ("I'll take that", "on it")
- Decision confirmations
- Follow-up threads
- Document shares

**Negative Signals:**
- Confusion ("wait, what did we decide?")
- Re-hashing discussions
- No follow-up (crickets)
- Complaints ("that could've been an email")

**ROI Interpretation:**

| Score | ROI Level | Recommendation |
|-------|-----------|----------------|
| 80-100 | High | Productive meeting, maintain |
| 60-79 | Good | Some value |
| 40-59 | Low | Consider shortening or async |
| 0-39 | Negative | Cancel or restructure |

**Client Sees:**
- Meeting list with ROI scores
- Low-ROI meetings flagged
- Specific improvement recommendations
- Hours recoverable per week

**Update Frequency:** Daily (previous day's meetings)

---

### Feature 9: Outlook Signals 📧

**Purpose:** Email behavioral patterns for Outlook/Exchange users

**What We Observe (metadata only):**
- Send time patterns
- Weekend email count
- Response time median
- CC/BCC network patterns

**Signals Detected:**
- **After-hours email flood:** Burnout risk
- **Response time deterioration:** Overload or disengagement
- **Weekend work spike:** Work-life imbalance
- **Shrinking network:** Isolation/withdrawal

**Client Sees:**
- Outlook signals dashboard
- Critical signal alerts
- Individual pattern insights
- Workload balancing recommendations

**Update Frequency:** Daily at 4:00 AM

---

### Feature 10: Insights Dashboard 🎛️

**Purpose:** All intelligence signals in one unified view

**Seven Compact Widgets:**
1. Network Health (silo score)
2. Succession Risk (bus factor)
3. Equity Signals (equity score)
4. Project Risk (high-risk project count)
5. Meeting ROI (low-ROI percentage)
6. Outlook Signals (critical signals count)
7. Attrition Risk Summary (high-risk individuals)

**Client Sees:**
- Single dashboard with all metrics
- Color-coded scores (red/yellow/green)
- Click to drill into detailed views
- Weekly trend indicators

**Update Frequency:** Real-time polling

---

## 5. AI-Powered Recommendations

### How It Works

SignalTrue uses AI to generate context-aware, actionable recommendations based on all available signals.

**Step 1: Build Context**
Gathers all relevant data:
- Current BDI, overload risk, execution drag, retention strain
- 4-week drift history
- All 10 intelligence signals
- Top risk drivers
- Current team zone

**Step 2: Generate Recommendations**
AI analyzes patterns and generates 3-5 specific actions:

```
Example Recommendation:
┌─────────────────────────────────────────────────────┐
│ 🔴 HIGH PRIORITY                                    │
│                                                     │
│ Title: Reduce meeting load by 30%                   │
│                                                     │
│ Description: Cancel 3 recurring meetings with       │
│ <5 attendees. Focus on weekly status meetings       │
│ that have low ROI scores.                           │
│                                                     │
│ Expected Impact: Recover 6 hours/week per person    │
│                                                     │
│ Category: Overload                                  │
└─────────────────────────────────────────────────────┘
```

**Recommendation Categories:**
- **Overload:** Reduce meetings, protect focus time, limit after-hours
- **Execution:** Speed up decisions, reduce fragmentation, clarify owners
- **Retention:** 1-on-1s, workload review, recognition
- **Crisis:** Immediate actions (all-hands, blocker removal)
- **Network:** Connect silos, distribute knowledge, remove bottlenecks
- **Equity:** Rebalance workload, improve inclusion

**Step 3: Track Implementation**
- Recommendations saved to dashboard
- Implementation status tracking
- Actual impact measurement over time

---

## 6. Client Dashboard Experience

### Dashboard Hierarchy

```
┌──────────────────────────────────────────────────────┐
│                  SIGNALTRUE DASHBOARD                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │    BDI     │  │  OVERLOAD  │  │  EXECUTION │     │
│  │    47      │  │    62      │  │     38     │     │
│  │  STRETCHED │  │    HIGH    │  │   HEALTHY  │     │
│  └────────────┘  └────────────┘  └────────────┘     │
│                                                      │
│  ┌────────────┐  ┌────────────────────────────┐     │
│  │ RETENTION  │  │                            │     │
│  │    41      │  │    4-WEEK TREND CHART      │     │
│  │   MEDIUM   │  │                            │     │
│  └────────────┘  └────────────────────────────┘     │
│                                                      │
├──────────────────────────────────────────────────────┤
│  INTELLIGENCE WIDGETS                                │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │Network│ │Succes│ │Equity│ │Project│ │Meeting│     │
│  │Health │ │ sion │ │Signals│ │ Risk │ │  ROI │     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  AI RECOMMENDATIONS                                  │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🔴 Reduce meeting load by 30%                  │ │
│  │ 🟡 Schedule retention conversation with Sarah  │ │
│  │ 🟢 Establish backup for infrastructure role    │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Available Views

| View | Purpose | Audience |
|------|---------|----------|
| Executive Summary | High-level BDI and trends | C-Suite |
| Team Dashboard | Detailed team metrics | HR / Team Leads |
| Manager Effectiveness | Manager leaderboard | HR / Leadership |
| Attrition Risk | Flight risk individuals | HR |
| Insights Dashboard | All intelligence signals | Analysts |
| Settings | Integration configuration | Admins |

---

## 7. Privacy & Data Handling

### Privacy Principles

| Principle | Implementation |
|-----------|----------------|
| **Metadata Only** | We analyze patterns, never content |
| **No Surveillance** | No keystroke logging, screen capture, or individual tracking |
| **Team-Level Insights** | Recommendations focus on system changes, not individual blame |
| **Transparent** | Employees can see what data categories are analyzed |

### What We Access vs. What We Don't

| ✅ We Access | ❌ We Never Access |
|--------------|-------------------|
| Calendar event times | Email/message content |
| Meeting duration | File contents |
| Response time patterns | Browsing history |
| After-hours activity rates | Keystroke data |
| Collaboration network structure | Screen recordings |
| Sentiment indicators (emoji) | Individual performance scores |

### Data Retention

- Raw behavioral data: 90 days
- Aggregated metrics: 12 months
- Recommendations: Until resolved + 90 days
- Crisis events: 6 months

---

## 8. Pricing Tiers

### Pricing Philosophy

> SignalTrue pricing reflects the **cost of late detection**.  
> One missed signal often costs more than a year of prevention.

### Three Tiers

| Tier | Price | Outcome | Best For |
|------|-------|---------|----------|
| **Visibility** | €99/month | See early system signals | Small teams starting with awareness |
| **Prevention** | €199/month | Track trends and get alerts | Growing teams needing proactive intervention |
| **Resilience** | Custom | Guide interventions with executive insight | Enterprise organizations |

### Feature Comparison

| Feature | Visibility | Prevention | Resilience |
|---------|------------|------------|------------|
| Weekly drift reports | ✅ | ✅ | ✅ |
| Team-level pattern detection | ✅ | ✅ | ✅ |
| Focus fragmentation signals | ✅ | ✅ | ✅ |
| Meeting overload indicators | ✅ | ✅ | ✅ |
| After-hours drift tracking | ✅ | ✅ | ✅ |
| Trend tracking over time | — | ✅ | ✅ |
| Automated drift alerts | — | ✅ | ✅ |
| Monthly leadership summaries | — | ✅ | ✅ |
| Industry benchmarks | — | ✅ | ✅ |
| Executive quarterly summaries | — | — | ✅ |
| Intervention recommendations | — | — | ✅ |
| Custom signal models | — | — | ✅ |
| Dedicated success manager | — | — | ✅ |

---

## Contact

**Request Early Signal Preview:**  
Visit [signaltrue.com/contact](https://signaltrue.com/contact)

**Questions:**  
Email: hello@signaltrue.com

---

*SignalTrue — Behavioral Early-Warning System for Organizations*

*Detect early system-level strain before burnout, disengagement, or attrition occur.*

---

**© 2026 SignalTrue. All rights reserved.**
