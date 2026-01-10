# SignalTrue Complete Features Guide
## All Features, Measurements, Metrics, Formulas & AI Logic

---

## **TABLE OF CONTENTS**

1. [Core Concept](#core-concept)
2. [Data Sources](#data-sources)
3. [Core Team Health Metrics](#core-team-health-metrics)
4. [Behavioral Intelligence Features (10 Total)](#behavioral-intelligence-features)
5. [AI-Powered Recommendations](#ai-powered-recommendations)
6. [Automated Notifications](#automated-notifications)
7. [Technical Architecture](#technical-architecture)

---

## **CORE CONCEPT**

SignalTrue is a **behavioral intelligence platform** that measures team health and predicts risks **without surveys**. It uses only passive behavioral data from:
- Slack/Google Chat (communication patterns)
- Google Calendar/Outlook (calendar behavior)
- No employee input required

The platform operates on a **3-layer architecture**:

### **Layer 1: Measurement & Tracking**
- Pulls data from Slack, Google Calendar, Outlook
- Stores daily metrics for each team
- Tracks individual behavioral patterns

### **Layer 2: Diagnosis, Decision & Impact**
- Calculates risk scores (overload, execution drag, retention strain)
- Detects behavioral anomalies
- Determines team state (Stable, Stretched, Critical, Recovery)

### **Layer 3: AI-Powered Actions**
- Generates context-aware recommendations
- Integrates intelligence signals into prompts
- Suggests specific interventions

---

## **DATA SOURCES**

### **1. Slack / Google Chat**
**What We Measure:**
- Message volume (daily/weekly count)
- Response time (median time to reply)
- After-hours activity (% of messages outside 9am-5pm)
- Sentiment (emoji usage, tone analysis)
- Unique contacts (network size)
- Thread participation (engagement level)
- Ad-hoc meetings mentions ("can we hop on a call?")

**How We Measure:**
- Slack API: Monitor channels, DMs, reactions, threads
- Google Chat API: Monitor spaces, messages, threads
- Aggregated daily into MetricsDaily collection
- Individual-level tracking for attrition/manager effectiveness

### **2. Google Calendar**
**What We Measure:**
- Meeting hours per week
- Back-to-back meetings (% with <15min gap)
- After-hours meetings (% outside 9am-5pm)
- Focus time (blocks ≥2 hours with no meetings)
- One-on-one frequency (manager-report meetings)
- Meeting acceptance rate (accepted vs declined)
- Recurring vs ad-hoc meetings

**How We Measure:**
- Google Calendar API: Read events, attendees, responses
- Calculate focus time = total work hours - meeting hours - 30min breaks
- Track meeting patterns over 7-day and 30-day windows

### **3. Outlook Calendar**
**What We Measure:**
- Meeting load (same as Google Calendar)
- Email send patterns (time-of-day distribution)
- Email response time
- CC/BCC patterns (collaboration signals)
- Weekend email activity

**How We Measure:**
- Microsoft Graph API: Read calendar events + email metadata
- No email content reading (privacy-first)
- Aggregate behavioral signals only

---

## **CORE TEAM HEALTH METRICS**

### **1. BDI (Behavioral Drift Index)**
**What It Measures:** Overall team deviation from healthy baseline

**Formula:**
```
BDI = SQRT(
  (overload_risk² + execution_drag² + retention_strain²) / 3
)
```

**Score Range:**
- 0-35: **Green** (Healthy)
- 35-65: **Yellow** (Stretched)
- 65-100: **Red** (Critical)

**What It Means:**
- **Green:** Team operating within healthy patterns
- **Yellow:** Early warning signs, intervention recommended
- **Red:** Urgent action required, team at breaking point

---

### **2. Overload Risk**
**What It Measures:** Burnout risk from excessive meetings and after-hours work

**Formula:**
```
overload_risk = (
  0.35 × deviation(after_hours_activity) +
  0.30 × deviation(meeting_load) +
  0.20 × deviation(back_to_back_meetings) +
  0.15 × -deviation(focus_time)
) × 100
```

**Deviation Calculation:**
```
deviation = (current_value - baseline_mean) / baseline_mean
Clamped to [-1, +1]
```

**What It Means:**
- **High after-hours activity:** Team working nights/weekends
- **High meeting load:** >25 hours/week in meetings
- **No focus time:** Can't complete deep work
- **Result:** Burnout risk, quality degradation

**Thresholds:**
- <35: Healthy workload
- 35-65: Stretched, monitor closely
- >65: Burnout imminent

---

### **3. Execution Drag**
**What It Measures:** Slowdown in decision-making and output

**Formula:**
```
execution_drag = (
  0.40 × deviation(response_time) +
  0.30 × deviation(meeting_fragmentation) +
  0.30 × deviation(participation_drift)
) × 100
```

**What It Means:**
- **Slow response time:** Decisions taking days instead of hours
- **Meeting fragmentation:** Too many short, unproductive meetings
- **Participation drift:** Key people disengaging from discussions

**Thresholds:**
- <35: Fast execution
- 35-65: Slowing down
- >65: Gridlock

---

### **4. Retention Strain**
**What It Measures:** Flight risk across team

**Formula:**
```
retention_strain = (
  0.40 × avg_attrition_risk +
  0.30 × deviation(network_shrinkage) +
  0.30 × deviation(sentiment_drop)
) × 100
```

**What It Means:**
- **High attrition risk:** Multiple team members showing flight patterns
- **Network shrinkage:** People pulling back from collaboration
- **Sentiment drop:** Negative tone in Slack messages

**Thresholds:**
- <35: Low flight risk
- 35-65: Some risk, monitor
- >65: Multiple people likely to quit

---

## **BEHAVIORAL INTELLIGENCE FEATURES**

### **Feature 1: Attrition Risk Detection**

**What It Measures:** Individual flight risk from behavioral collapse

**How It Works:**
1. **Baseline Period:** Last 30 days of normal behavior
2. **Current Period:** Last 7 days
3. **Compare Slack Signals:**
   - Message volume drop (≥30% decline)
   - Response time increase (≥50% slower)
   - Network shrinkage (≥20% fewer contacts)
   - Engagement drop (≥40% fewer thread replies)
   - Sentiment decline (≥30% fewer positive emojis)
   - After-hours withdrawal (working but not responding)

4. **Compare Calendar Signals:**
   - Meeting decline rate spike (≥30% more declines)
   - One-on-one cancellations (with manager)
   - Recurring meeting drops (stopped attending)
   - Focus time collapse (no 2-hour blocks)
   - Weekend work spike (burnout signal)

**Risk Score Formula:**
```
risk_score = (
  0.25 × slack_message_drop +
  0.20 × response_time_increase +
  0.15 × network_shrinkage +
  0.15 × engagement_drop +
  0.10 × sentiment_decline +
  0.10 × meeting_decline_spike +
  0.05 × one_on_one_cancellations
) × 100
```

**Score Interpretation:**
- **0-39:** Low risk (healthy)
- **40-59:** Medium risk (monitor)
- **60-79:** High risk (retention conversation needed)
- **80-100:** Critical risk (leaving within 2-4 weeks)

**Predicted Exit Window:**
- **80-100:** 2-4 weeks
- **60-79:** 1-2 months
- **40-59:** 2-3 months

**What Clients See:**
- HR Dashboard: List of high-risk individuals with behavioral signals
- Risk badges (critical/high/medium)
- Behavioral indicators (specific patterns detected)
- Recommended actions (schedule 1-on-1, workload review, etc.)

**Cron Job:** Daily at 3:00 AM

---

### **Feature 2: Manager Effectiveness**

**What It Measures:** Manager quality through behavioral outcomes (no surveys)

**How It Works:**
1. **Calendar Metrics (30% weight):**
   - One-on-one consistency (weekly 1-on-1s with each report)
   - Expected vs actual 1-on-1s
   - Team meeting load (not over-meeting the team)
   - Last-minute cancellations (respect for team time)

2. **Slack Metrics (30% weight):**
   - Response time to team (median hours)
   - Message-to-team ratio (% of messages to their reports)
   - Recognition rate (kudos/praise per week)
   - Escalation bypass (how often team goes around them)

3. **Team Outcomes (40% weight):**
   - Team attrition risk (avg flight risk of reports)
   - Team BDI (overall team health)
   - Team sentiment (positive vs negative tone)

**Effectiveness Score Formula:**
```
score = 0
# Calendar component (30 points max)
if (one_on_one_consistency > 0.80): score += 15
if (last_minute_cancellations < 2): score += 10
if (team_meeting_load < 20 hours/week): score += 5

# Slack component (30 points max)
if (response_to_team < 4 hours): score += 15
if (recognition_rate > 1 per week): score += 10
if (escalation_bypass < 3 per month): score += 5

# Team outcomes (40 points max)
if (team_attrition_risk < 40): score += 10
if (team_bdi < 50): score += 15
if (team_sentiment > 0): score += 15

effectiveness_score = score
```

**Score Interpretation:**
- **80-100:** Excellent (top-tier manager)
- **65-79:** Good (solid performance)
- **45-64:** Needs improvement (coaching required)
- **0-44:** Critical (poor outcomes, urgent intervention)

**What Clients See:**
- Manager leaderboard (ranked by effectiveness)
- Individual manager cards with metrics
- Strengths (what they do well)
- Improvement areas (specific coaching needs)
- Coaching recommendations

**Cron Job:** Monthly on 1st at 4:00 AM

---

### **Feature 3: Crisis Detection**

**What It Measures:** Real-time disasters requiring immediate action

**How It Works:**
1. **Baseline:** Last 7 days average
2. **Current:** Last 6 hours
3. **Anomaly Detection:**
   - Sudden sentiment collapse (≥60% drop in positive emojis)
   - Message volume spike (≥200% increase)
   - After-hours flood (≥300% spike in night/weekend messages)
   - Response time spike (≥150% slower)
   - Meeting cancellation wave (≥50% of day's meetings cancelled)
   - Ad-hoc meeting surge (≥5 "can we hop on a call?" in 6 hours)

**Crisis Types:**
- **sudden_sentiment_collapse:** Team morale crash
- **message_volume_spike:** Firefighting mode
- **after_hours_flood:** All-hands emergency
- **meeting_cancellation_wave:** Major disruption
- **ad_hoc_meeting_surge:** Unplanned crisis response

**Severity Calculation:**
```
severity_points = 0
if (sentiment_drop > 60%): severity_points += 3
if (message_spike > 200%): severity_points += 2
if (after_hours_spike > 300%): severity_points += 3
if (meeting_cancellations > 50%): severity_points += 2

severity = 
  if severity_points >= 6: 'critical'
  if severity_points >= 4: 'high'
  else: 'moderate'
```

**Urgency:**
- **Critical:** Immediate (notify within 15 minutes)
- **High:** Today (notify within 2 hours)
- **Moderate:** This week

**What Clients See:**
- Real-time crisis banner (top of dashboard)
- Crisis type and severity
- Likely triggers (detected from Slack keywords)
- Recommended action (specific next steps)
- Acknowledge/Resolve buttons

**Cron Job:** Every 15 minutes

---

### **Feature 4: Network Health**

**What It Measures:** Collaboration patterns, silos, bottlenecks, knowledge concentration

**How It Works:**
1. **Get Slack Collaboration Data:**
   - Who DMs/mentions who (interaction graph)
   - Who asks questions to who (dependency graph)
   - Channel participation patterns
   - Topic experts (keywords → people)

2. **Detect Silos:**
   - Identify subgroups with <20% cross-communication
   - Measure silo score (0-100, higher = worse)

3. **Detect Bottlenecks:**
   - Find individuals with ≥8 unique questioners
   - Avg response time >4 hours
   - High dependency concentration

4. **Detect Knowledge Concentration:**
   - Topics with single expert (bus factor = 1)
   - Critical areas with no backup

**Health Score Formula:**
```
health_score = 100 - (
  0.40 × silo_score +
  0.35 × bottleneck_score +
  0.25 × knowledge_concentration_score
)
```

**Score Interpretation:**
- **80-100:** Healthy network (good collaboration)
- **60-79:** Some issues (isolated pockets)
- **40-59:** Silos detected (poor knowledge sharing)
- **0-39:** Critical (single points of failure)

**What Clients See:**
- Network health score
- Silo visualization (teams not talking to each other)
- Bottleneck list (overloaded experts)
- Knowledge risks (critical dependencies)
- Recommendations (connect teams, distribute knowledge)

**Cron Job:** Weekly on Sunday at 5:00 AM

---

### **Feature 5: Succession Risk**

**What It Measures:** Bus factor and knowledge dependencies

**How It Works:**
1. **Analyze Slack Q&A Patterns:**
   - Who asks who questions
   - Topic/keyword extraction
   - Response time patterns
   - Unique askers per expert

2. **Identify Knowledge Areas:**
   - Group questions by topic (database, frontend, infrastructure, etc.)
   - Map topics to experts

3. **Calculate Dependency Metrics:**
   - Total questions received (last 30 days)
   - Unique askers
   - Topics covered
   - Avg response time

4. **Find Potential Successors:**
   - Who else answers questions in same topics
   - Competency overlap score

**Bus Factor Calculation:**
```
bus_factor = number of people who can cover ≥70% of topics

If bus_factor = 1: Critical (single point of failure)
If bus_factor = 2: High risk
If bus_factor ≥ 3: Acceptable
```

**Risk Score Formula:**
```
risk_score = (
  0.40 × (100 - bus_factor × 20) +
  0.30 × dependency_concentration +
  0.30 × successor_readiness_gap
)
```

**What Clients See:**
- Succession risk dashboard
- Critical dependencies (people who can't be replaced)
- Knowledge areas per person
- Potential successors and readiness level
- Recommendations (pair programming, documentation, cross-training)

**Cron Job:** Monthly on 15th at 3:00 AM

---

### **Feature 6: Equity Signals**

**What It Measures:** Inequitable treatment from behavioral patterns (no surveys)

**How It Works:**
1. **Response Time Equity:**
   - Measure avg response time per person
   - Calculate coefficient of variation (CV)
   - CV > 0.5 = inequity detected

2. **Participation Equity:**
   - Meeting invitations per person
   - Message volume per person
   - Voice in discussions (thread participation)

3. **Workload Equity:**
   - After-hours work per person
   - Meeting load per person
   - Weekend work patterns

4. **Voice Equity:**
   - Who gets heard (message reactions/replies)
   - Who gets interrupted (Slack thread hijacking)
   - Whose ideas are acknowledged

**Equity Score Formula:**
```
equity_score = 100 - (
  0.30 × response_time_inequity +
  0.25 × participation_inequity +
  0.25 × workload_inequity +
  0.20 × voice_inequity
)
```

**Score Interpretation:**
- **80-100:** Equitable (fair treatment)
- **70-79:** Minor issues (monitor)
- **50-69:** Inequity detected (investigate)
- **0-49:** Serious inequity (immediate action)

**What Clients See:**
- Equity score per team
- Breakdown by dimension (response time, participation, workload, voice)
- Specific individuals disadvantaged (privacy-protected)
- Recommendations (manager coaching, workload rebalancing)

**Cron Job:** Weekly on Monday at 6:00 AM

---

### **Feature 7: Project Risk**

**What It Measures:** Project health from meeting titles and Slack patterns (no Jira needed)

**How It Works:**
1. **Discover Projects:**
   - Parse Google Calendar meeting titles for project names
   - Identify Slack channels related to projects
   - Group recurring meetings by topic

2. **Calendar Signals:**
   - Meeting frequency change (spike = firefighting, drop = stalled)
   - Attendance decline (people dropping off)
   - Last-minute rescheduling
   - Duration changes (longer meetings = trouble)

3. **Slack Signals:**
   - Message volume trend (spike = crisis, drop = stalled)
   - Sentiment in project channels
   - Blocker keywords ("stuck", "blocked", "waiting on")
   - Escalation keywords ("urgent", "critical", "ASAP")

**Risk Score Formula:**
```
risk_score = (
  0.25 × meeting_frequency_spike +
  0.20 × attendance_decline +
  0.20 × message_volume_spike +
  0.15 × negative_sentiment +
  0.10 × blocker_frequency +
  0.10 × escalation_frequency
) × 100
```

**Prediction:**
- **80-100:** Project likely to miss deadline by >2 weeks
- **60-79:** Project at risk, may slip 1-2 weeks
- **40-59:** On track but watch closely
- **0-39:** Healthy progress

**What Clients See:**
- Project list with risk scores
- Risk level badges (critical/high/medium/low)
- Specific signals detected (meeting cancellations, blocker keywords)
- Recommendations (add resources, remove blockers, etc.)

**Cron Job:** Daily at 2:00 AM

---

### **Feature 8: Meeting ROI**

**What It Measures:** Meeting effectiveness from post-meeting Slack behavior

**How It Works:**
1. **Get Meeting Details:**
   - Title, duration, attendees from Google Calendar
   - Recurring vs one-time

2. **Analyze Post-Meeting Slack Activity** (next 4 hours):
   - **Positive Signals:**
     - Action messages ("I'll take that", "on it")
     - Decision confirmations ("agreed", "let's do it")
     - Follow-up threads
     - Document shares
     - Next steps clarifications
   
   - **Negative Signals:**
     - Confusion ("wait, what did we decide?")
     - Re-hashing ("can we revisit...")
     - Duplicate discussions (same topic in DMs after meeting)
     - No follow-up (crickets)
     - Complaints ("that could've been an email")

**ROI Score Formula:**
```
roi_score = (
  0.35 × positive_signals_count +
  0.25 × (10 - negative_signals_count) +
  0.20 × decision_velocity +
  0.20 × follow_through_rate
) × 10
```

**Score Interpretation:**
- **80-100:** High ROI (productive meeting)
- **60-79:** Good ROI (some value)
- **40-59:** Low ROI (marginal value)
- **0-39:** Negative ROI (waste of time)

**What Clients See:**
- Meeting list with ROI scores
- Low ROI meetings flagged
- Specific signals (what went wrong/right)
- Recommendations (shorten, make async, cancel recurring)

**Cron Job:** Daily at 2:00 AM (analyzes previous day's meetings)

---

### **Feature 9: Outlook Signals**

**What It Measures:** Email behavioral patterns (Outlook/Exchange users)

**How It Works:**
1. **Email Send Patterns:**
   - Time-of-day distribution
   - Weekend email count
   - After-hours email %
   - Batch vs continuous sending

2. **Email Response Patterns:**
   - Response time median
   - Response rate (% of emails replied to)
   - Response time deterioration

3. **Collaboration Patterns:**
   - CC/BCC usage (network size)
   - To: list size (meeting-heavy vs focused)
   - Reply-all frequency

**Signals Detected:**
- **After-hours email flood:** Burnout risk
- **Delayed responses:** Overload or disengagement
- **Weekend work spike:** Work-life imbalance
- **Shrinking network:** Isolation/withdrawal

**Signal Score Formula:**
```
signal_score = (
  0.30 × after_hours_email_rate +
  0.25 × response_time_increase +
  0.25 × weekend_work_rate +
  0.20 × network_shrinkage
) × 100
```

**What Clients See:**
- Outlook signals dashboard
- Critical signals (after-hours, delayed responses)
- Individual patterns (who's overworked)
- Recommendations (workload balancing, time management)

**Cron Job:** Daily at 4:00 AM

---

### **Feature 10: Enhanced Insights Dashboard**

**What It Measures:** All intelligence signals in one view

**How It Works:**
- Aggregates data from all 9 intelligence services
- Shows 7 compact widgets:
  1. Network Health (silo score)
  2. Succession Risk (bus factor)
  3. Equity Signals (equity score)
  4. Project Risk (high-risk projects count)
  5. Meeting ROI (low ROI meetings %)
  6. Outlook Signals (critical signals count)
  7. Attrition Risk Summary (high-risk individuals)

**What Clients See:**
- Single dashboard with all intelligence metrics
- Color-coded scores (red/yellow/green)
- Click to drill down into detailed dashboards
- Weekly trend indicators

**Auto-Updates:** Real-time (polling every 30 seconds for crisis, 5 minutes for others)

---

## **AI-POWERED RECOMMENDATIONS**

### **How AI Recommendations Work**

SignalTrue uses **OpenAI GPT-4o** to generate context-aware action recommendations.

**Step 1: Build Context**
Gather all relevant data:
- Current BDI, overload risk, execution drag, retention strain
- Team drift history (last 4 weeks)
- Intelligence signals:
  - Attrition risk (high-risk count, avg score, top signals)
  - Manager effectiveness (score, level, improvement areas)
  - Crisis events (active crises, severity, type)
  - Network health (silo score, bottlenecks, knowledge risks)
  - Succession risk (bus factor, critical dependencies)
  - Equity signals (inequity areas, affected individuals)
- Top risk drivers (what's causing the drift)
- Current team zone (Stable, Stretched, Critical, Recovery)

**Step 2: Format Context for AI Prompt**
```
You are a behavioral intelligence expert analyzing team health.

CURRENT TEAM STATE:
- Zone: ${teamState.zone}
- BDI: ${teamState.bdi}/100
- Overload Risk: ${overloadRisk}/100
- Execution Drag: ${executionDrag}/100
- Retention Strain: ${retentionStrain}/100

INTELLIGENCE SIGNALS:
${intelligenceSignals formatted}

TOP RISK DRIVERS:
${topDrivers formatted}

DRIFT HISTORY:
${last 4 weeks trend}

Generate 3-5 specific, actionable recommendations to improve team health.
Focus on the highest-impact interventions.
```

**Step 3: AI Generates Recommendations**
OpenAI returns JSON with:
```json
{
  "recommendations": [
    {
      "title": "Reduce meeting load by 30%",
      "description": "Cancel 3 recurring meetings with <5 attendees",
      "category": "overload",
      "priority": "high",
      "expectedImpact": "Recover 6 hours/week per person"
    },
    ...
  ]
}
```

**Step 4: Store and Display**
- Save recommendations to database
- Display in dashboard
- Track implementation status
- Measure actual impact

**Recommendation Categories:**
- **Overload:** Reduce meetings, protect focus time, limit after-hours
- **Execution:** Speed up decisions, reduce fragmentation, clarify owners
- **Retention:** 1-on-1s, workload review, recognition
- **Crisis:** Immediate actions (all-hands, blocker removal)
- **Network:** Connect silos, distribute knowledge, remove bottlenecks
- **Equity:** Rebalance workload, improve inclusion, manager coaching

**Intelligence Integration:**
The AI prompt now includes **6 intelligence signals** to make recommendations 10x smarter:

```
BEHAVIORAL INTELLIGENCE SIGNALS:

${attrition risk signals}
- ⚠️ CRITICAL ATTRITION RISK: ${count} team members at critical flight risk
- Signals: message drop, network shrinkage, sentiment decline

${manager effectiveness signals}
- ⚠️ Manager Effectiveness: critical (38/100)
- Issues: low 1-on-1 consistency, poor team sentiment

${crisis signals}
- 🚨 ACTIVE CRISIS: sudden_sentiment_collapse (severity: critical)
- Trigger: Major deadline missed, team morale crash

${network health signals}
- Network Silos: Engineering and Product not communicating (silo score: 78)
- Bottleneck: Sarah (database expert) getting 45 questions/week

${succession risk signals}
- Critical Dependency: Mark (only person who knows infrastructure)
- Bus Factor: 1 (single point of failure)

${equity signals}
- Equity Issue: Junior devs getting 3x slower responses than seniors
- Workload Inequity: 2 people doing 60% of after-hours work
```

**Result:** AI generates recommendations that address **root causes**, not just symptoms.

Example:
- **Without intelligence:** "Reduce meeting load"
- **With intelligence:** "Reduce meeting load AND schedule 1-on-1s with Sarah (attrition risk) AND redistribute database questions from Sarah (bottleneck) AND pair junior devs with Mark (succession risk)"

---

## **AUTOMATED NOTIFICATIONS**

### **Who Gets Notified:**
- **HR/Admin roles only** for sensitive intelligence (attrition, manager effectiveness, equity issues)
- **All users** for team-level insights (BDI, overload, general recommendations)

### **Notification Types:**

#### **1. Attrition Risk Alerts**
**Trigger:** Individual risk score ≥60

**Notification Content:**
```
🚨 High Attrition Risk Detected

Employee: [Name] (Team: [Team Name])
Risk Score: 78/100 (High Risk)
Predicted Exit: 1-2 months

Behavioral Signals:
- Message volume dropped 45%
- Network shrinkage (20% fewer contacts)
- 1-on-1 cancellations (3 in last 2 weeks)

Recommended Action:
Schedule retention conversation this week
```

**Severity:**
- **Critical** (score ≥80): Immediate notification
- **High** (score 60-79): Daily digest

---

#### **2. Manager Coaching Alerts**
**Trigger:** Manager effectiveness score <65

**Notification Content:**
```
⚠️ Manager Coaching Recommended

Manager: [Name] (Team: [Team Name])
Effectiveness: Needs Improvement (58/100)

Improvement Areas:
- Low 1-on-1 consistency (40% of expected)
- High team attrition risk (avg 62/100)
- Poor response time to team (6.5 hours avg)

Coaching Topics:
1. Time management and prioritization
2. Regular check-ins with reports
3. Team engagement strategies
```

**Severity:**
- **Critical** (score <45): Immediate
- **High** (score 45-64): Weekly digest

---

#### **3. Crisis Event Alerts**
**Trigger:** Crisis detected with severity = critical or high

**Notification Content:**
```
🚨 TEAM CRISIS DETECTED

Team: [Team Name]
Crisis Type: Sudden Sentiment Collapse
Severity: Critical
Detected: 15 minutes ago

Signals:
- Sentiment dropped 68% in last 6 hours
- After-hours message spike +320%
- 5 "urgent" keywords in last hour

Likely Trigger:
Major production outage (detected from Slack keywords)

Recommended Action:
Hold all-hands meeting within 2 hours to address
```

**Severity:**
- **Critical:** Immediate (push notification + email)
- **High:** Within 2 hours

---

#### **4. Network Health Alerts**
**Trigger:** Silo score ≥70 or bottleneck count ≥3

**Notification Content:**
```
⚠️ Network Health Issue Detected

Team: [Team Name]
Issue: Collaboration Silos

Details:
- Engineering and Product teams have <15% cross-communication
- Silo score: 78/100

Impact:
- Slow decision-making
- Duplicate work
- Knowledge gaps

Recommended Action:
Schedule cross-functional sync meetings
Create shared Slack channels
```

**Severity:** Weekly digest

---

#### **5. Succession Risk Alerts**
**Trigger:** Bus factor <50 or critical role with single expert

**Notification Content:**
```
⚠️ Succession Risk Identified

Team: [Team Name]
Critical Dependency: [Name]

Knowledge Areas:
- Infrastructure (only expert, 45 questions/month)
- Database architecture (only expert, 38 questions/month)

Bus Factor: 1 (single point of failure)

Recommended Action:
- Pair programming sessions
- Documentation sprint
- Cross-training plan
```

**Severity:** Monthly digest

---

#### **6. Equity Issue Alerts**
**Trigger:** Equity score <70

**Notification Content:**
```
⚠️ Equity Issue Detected

Team: [Team Name]
Equity Score: 62/100

Issues Detected:
- Response Time Inequity: Junior devs getting 3x slower responses
- Workload Inequity: 2 people doing 60% of after-hours work

Affected Individuals: [Privacy-protected, HR only]

Recommended Action:
Manager coaching on equitable treatment
Workload rebalancing
```

**Severity:** Weekly digest

---

## **TECHNICAL ARCHITECTURE**

### **Technology Stack**
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **AI:** OpenAI GPT-4o
- **Integrations:** Slack, Google Calendar, Outlook/Microsoft Graph
- **Hosting:** Render (backend), Vercel (frontend)

### **Data Pipeline**

#### **1. Data Collection (Layer 1)**
```
Slack API ────┐
              ├──> integrationPullService.js ──> MetricsDaily (MongoDB)
Calendar API ─┘
```

**Frequency:** Every 6 hours

**Services:**
- `slackService.js`: Pull messages, reactions, threads
- `googleCalendarService.js`: Pull events, attendees
- `outlookSignalsService.js`: Pull email metadata
- `employeeSyncService.js`: Sync employee roster daily

**Models:**
- `MetricsDaily`: Daily aggregated metrics per team
- `User`: Employee profiles
- `Team`: Team definitions

---

#### **2. Risk Calculation (Layer 2)**
```
MetricsDaily ──> riskCalculationService.js ──> {
  Baseline comparison
  Deviation calculation
  Risk scores (overload, execution, retention)
  Team state determination
} ──> TeamState (MongoDB)
```

**Frequency:** Weekly (Sunday night)

**Services:**
- `baselineService.js`: Calculate healthy baselines (30-60 day avg)
- `riskCalculationService.js`: Calculate risk scores from deviations
- `teamStateService.js`: Determine zone (Stable/Stretched/Critical/Recovery)

**Models:**
- `Baseline`: Healthy baseline for each team
- `TeamState`: Weekly snapshot of team health
- `RiskDriver`: What's causing the drift

---

#### **3. Intelligence Analysis (Layer 2)**
```
User + Team + MetricsDaily ──> Intelligence Services ──> {
  attritionRiskService.js
  managerEffectivenessService.js
  crisisDetectionService.js
  networkHealthService.js
  successionRiskService.js
  equitySignalsService.js
  projectRiskService.js
  enhancedMeetingROIService.js
  outlookSignalsService.js
} ──> Intelligence Models (MongoDB)
```

**Frequency:** Varies by service (see cron schedule)

**Models:**
- `AttritionRisk`: Individual flight risk records
- `ManagerEffectiveness`: Manager quality scores
- `CrisisEvent`: Real-time crisis events
- `NetworkHealth`: Collaboration patterns
- `SuccessionRisk`: Knowledge dependencies
- `EquitySignal`: Inequity detection
- `ProjectRisk`: Project health scores
- `MeetingROI`: Meeting effectiveness
- `OutlookSignals`: Email behavior patterns

---

#### **4. AI Recommendations (Layer 3)**
```
TeamState + Intelligence Signals ──> aiRecommendationContext.js ──> {
  Build context
  Format prompt
  Call OpenAI API
} ──> actionGenerationService.js ──> {
  Generate recommendations
  Store in DB
  Trigger notifications
} ──> Action (MongoDB)
```

**Frequency:** Weekly after team state calculation

**Services:**
- `aiRecommendationContext.js`: Gather context, build prompt
- `actionGenerationService.js`: Call AI, store recommendations
- `intelligenceNotificationService.js`: Send HR/admin alerts

**Models:**
- `Action`: Recommended interventions
- `Notification`: Alerts to HR/admins

---

### **Cron Job Schedule**

```
┌────────────────────────────────────────────────────────┐
│ CRON JOB SCHEDULE                                      │
├────────────────────────────────────────────────────────┤
│ Every 15 min    │ Crisis Detection                     │
│ Every 6 hours   │ Slack/Calendar Data Pull             │
│ Daily 2:00 AM   │ Project Risk Analysis                │
│ Daily 2:00 AM   │ Meeting ROI Analysis                 │
│ Daily 3:00 AM   │ Attrition Risk Calculation           │
│ Daily 4:00 AM   │ Outlook Signals Analysis             │
│ Weekly Sun 5AM  │ Network Health Analysis              │
│ Weekly Mon 6AM  │ Equity Signals Analysis              │
│ Weekly Sun 11PM │ Team State Calculation (BDI)         │
│ Monthly 1st 4AM │ Manager Effectiveness Calculation    │
│ Monthly 15th 3AM│ Succession Risk Analysis             │
└────────────────────────────────────────────────────────┘
```

---

### **API Endpoints**

#### **Core Team Health**
```
GET  /api/teams/:teamId/state           # Current BDI, zone, risks
GET  /api/teams/:teamId/history         # Historical drift
GET  /api/teams/:teamId/drivers         # Top risk drivers
GET  /api/teams/:teamId/recommendations # AI-generated actions
```

#### **Attrition Risk**
```
GET  /api/intelligence/attrition/org/:orgId/high-risk    # All high-risk individuals
GET  /api/intelligence/attrition/team/:teamId/summary    # Team summary
GET  /api/intelligence/attrition/user/:userId            # Individual risk
```

#### **Manager Effectiveness**
```
GET  /api/intelligence/managers/org/:orgId               # All managers
GET  /api/intelligence/managers/org/:orgId/coaching      # Managers needing coaching
GET  /api/intelligence/managers/:managerId/team/:teamId  # Specific manager
```

#### **Crisis Detection**
```
GET  /api/intelligence/crisis/org/:orgId/active          # Active crises
GET  /api/intelligence/crisis/team/:teamId/check         # Check team crisis
POST /api/intelligence/crisis/:crisisId/acknowledge      # Acknowledge crisis
POST /api/intelligence/crisis/:crisisId/resolve          # Resolve crisis
```

#### **Network Health**
```
GET  /api/intelligence/network/team/:teamId/analyze      # Analyze network
GET  /api/intelligence/network/team/:teamId/silos        # Detect silos
GET  /api/intelligence/network/team/:teamId/bottlenecks  # Detect bottlenecks
```

#### **Succession Risk**
```
GET  /api/intelligence/succession/team/:teamId/analyze   # Analyze team
GET  /api/intelligence/succession/org/:orgId/critical    # Critical risks
```

#### **Equity Signals**
```
GET  /api/intelligence/equity/team/:teamId/analyze       # Analyze team equity
GET  /api/intelligence/equity/org/:orgId/issues          # Org-wide issues
```

#### **Project Risk**
```
GET  /api/intelligence/projects/team/:teamId/analyze     # Analyze team projects
GET  /api/intelligence/projects/org/:orgId/high-risk     # High-risk projects
```

#### **Meeting ROI**
```
GET  /api/intelligence/meetings/recent                   # Recent meetings analyzed
GET  /api/intelligence/meetings/low-roi/org/:orgId       # Low ROI meetings
```

#### **Outlook Signals**
```
GET  /api/intelligence/outlook/team/:teamId/analyze      # Analyze team
GET  /api/intelligence/outlook/org/:orgId/critical       # Critical signals
```

---

## **FRONTEND COMPONENTS**

### **Dashboard Views**

1. **Main Insights Page** (`src/pages/app/Insights.js`)
   - Shows BDI, zone, trend
   - 7 intelligence widgets (compact view)
   - AI recommendations
   - Click to drill down

2. **Attrition Risk Dashboard** (`src/components/intelligence/AttritionRiskDashboard.js`)
   - Summary stats (critical/high/medium/total)
   - Filterable list of high-risk individuals
   - Behavioral indicators per person
   - Retention action buttons

3. **Manager Effectiveness Dashboard** (`src/components/intelligence/ManagerEffectivenessDashboard.js`)
   - Manager leaderboard
   - Filterable by effectiveness level
   - Metrics grid (calendar, Slack, team outcomes)
   - Coaching recommendations

4. **Crisis Alert Banner** (`src/components/intelligence/CrisisAlertBanner.js`)
   - Real-time crisis alerts (polls every 30 seconds)
   - Severity-based styling
   - Acknowledge/resolve actions

5. **Intelligence Widgets** (`src/components/intelligence/IntelligenceWidgets.js`)
   - 7 compact widgets for Insights page
   - Color-coded scores (red/yellow/green)
   - Click to view details

---

## **HOW SUGGESTIONS ARE GENERATED**

### **End-to-End Flow**

1. **Data Collection** (Every 6 hours)
   - Slack API pulls messages, reactions, threads
   - Google Calendar API pulls events, attendees
   - Outlook API pulls email metadata
   - Store in `MetricsDaily` collection

2. **Weekly Diagnosis** (Sunday 11 PM)
   - `riskCalculationService.js` runs:
     - Calculate current metrics (last 7 days avg)
     - Get baselines (30-60 day avg)
     - Calculate deviations
     - Calculate risk scores (overload, execution, retention)
     - Calculate BDI = sqrt((overload² + execution² + retention²) / 3)
     - Determine zone (Stable/Stretched/Critical/Recovery)
     - Store in `TeamState`
   
   - `Intelligence services` run in parallel:
     - Attrition risk (for each user)
     - Manager effectiveness (for each manager)
     - Crisis detection (real-time, every 15 min)
     - Network health
     - Succession risk
     - Equity signals
     - Project risk
     - Meeting ROI
     - Outlook signals

3. **AI Context Building**
   - `aiRecommendationContext.js` gathers:
     - Current TeamState (BDI, risks, zone)
     - Intelligence signals (attrition, manager, crisis, network, succession, equity)
     - Drift history (last 4 weeks)
     - Top risk drivers (what metrics are worst)

4. **Prompt Formatting**
   - Build structured prompt with all context
   - Include intelligence signals with emoji indicators (🚨⚠️)
   - Format as clear sections (state, signals, drivers, history)

5. **AI Generation**
   - Call OpenAI GPT-4o API
   - Request 3-5 specific, actionable recommendations
   - Include category, priority, expected impact

6. **Recommendation Storage**
   - Parse AI response (JSON)
   - Store in `Action` collection
   - Link to TeamState and Team

7. **Display to User**
   - Frontend fetches recommendations
   - Shows on Insights page
   - User can mark as implemented
   - Track actual impact vs expected

8. **Notification Dispatch** (If critical)
   - `intelligenceNotificationService.js` checks:
     - Attrition risk ≥60? → Notify HR
     - Manager effectiveness <65? → Notify HR
     - Crisis severity = critical? → Notify HR immediately
     - Succession bus factor <50? → Notify HR
     - Equity score <70? → Notify HR
     - Network silo score ≥70? → Notify HR

---

## **EXAMPLE: Full Workflow**

### **Scenario: Team in Crisis**

**Day 1 (Monday 9 AM):**
- Major production outage occurs
- Team frantically Slacking, holding ad-hoc meetings

**Day 1 (Monday 9:15 AM):**
- Crisis detection cron runs (every 15 min)
- Detects:
  - Message volume spike +320%
  - After-hours activity spike +400%
  - Sentiment drop -68%
  - Ad-hoc meeting surge (8 in last hour)
- Classifies as: **sudden_sentiment_collapse**, severity **critical**
- Creates `CrisisEvent` in database
- Triggers immediate HR notification
- Shows crisis banner on dashboard

**Day 1 (Monday 9:17 AM):**
- HR gets push notification: "🚨 TEAM CRISIS DETECTED"
- Clicks link, sees crisis details
- Recommended action: "Hold all-hands meeting within 2 hours"

**Day 1 (Monday 11 AM):**
- Manager holds all-hands, addresses outage
- Team feels heard, sentiment stabilizes

**Day 2 (Tuesday 3 AM):**
- Attrition risk cron runs daily
- Detects 2 team members showing flight patterns:
  - Message volume drop -45% (comparing last 7 days to 30-day baseline)
  - Network shrinkage -30%
  - Sentiment decline -35%
- Calculates risk scores: 72 and 68 (both HIGH risk)
- Stores in `AttritionRisk` collection
- Triggers HR notification: "⚠️ High Attrition Risk Detected"

**Sunday Night:**
- Weekly diagnosis runs
- Calculates:
  - Overload risk: 78 (RED)
  - Execution drag: 65 (YELLOW)
  - Retention strain: 72 (RED)
  - BDI: 72 (RED)
- Zone: **Critical**

**Sunday Night (continued):**
- AI recommendation service runs
- Builds context:
  ```
  TEAM STATE: Critical (BDI 72/100)
  - Overload risk: 78 (after-hours spike, meeting overload)
  - Retention strain: 72 (2 high-risk individuals)
  
  INTELLIGENCE SIGNALS:
  - 🚨 ACTIVE CRISIS: sudden_sentiment_collapse (resolved Mon 11AM)
  - ⚠️ ATTRITION RISK: 2 team members at high flight risk
  - ⚠️ Manager Effectiveness: 62/100 (needs improvement)
  
  TOP RISK DRIVERS:
  1. After-hours activity +120%
  2. Meeting load +45%
  3. Sentiment drop -35%
  ```

- AI generates recommendations:
  ```json
  {
    "recommendations": [
      {
        "title": "Schedule immediate 1-on-1s with high-risk team members",
        "description": "Meet with Sarah and John this week to address concerns and workload",
        "category": "retention",
        "priority": "critical",
        "expectedImpact": "Reduce flight risk by 30%, improve team morale"
      },
      {
        "title": "Implement meeting-free afternoons",
        "description": "Block 2-5 PM Wed/Fri for focus time, reduce meeting load by 30%",
        "category": "overload",
        "priority": "high",
        "expectedImpact": "Recover 8 hours/week per person, reduce burnout"
      },
      {
        "title": "Post-mortem for production outage",
        "description": "Conduct blameless post-mortem, document lessons learned",
        "category": "crisis",
        "priority": "high",
        "expectedImpact": "Prevent future crises, rebuild trust"
      }
    ]
  }
  ```

**Monday Morning:**
- Manager logs in to dashboard
- Sees BDI: 72 (RED), Zone: Critical
- Crisis banner: "Crisis resolved Monday 11 AM"
- AI recommendations: 3 specific actions
- Intelligence widgets:
  - Attrition Risk: 2 high-risk (RED)
  - Manager Effectiveness: 62/100 (YELLOW)
  - Network Health: 85/100 (GREEN)

**Result:**
- Manager implements recommendations
- Schedules 1-on-1s with Sarah and John
- Blocks Wed/Fri afternoons for focus time
- Conducts post-mortem meeting
- Next week: BDI drops to 55 (YELLOW), team stabilizes

---

## **DATA PRIVACY & SECURITY**

### **What We DON'T Collect:**
- ❌ Email/message content (only metadata)
- ❌ Personal information beyond work email
- ❌ Individual keystrokes or screen monitoring
- ❌ Browsing history
- ❌ Personal calendar events (only work calendars)

### **What We DO Collect:**
- ✅ Message timestamps and volume (not content)
- ✅ Meeting metadata (title, duration, attendees)
- ✅ Response time patterns
- ✅ Collaboration patterns (who works with who)
- ✅ Emoji reactions (sentiment proxy)

### **Privacy Protections:**
- Individual-level data only shown to HR/Admin roles
- Managers see team aggregates, not individual names
- Behavioral signals anonymized when shown to non-HR
- Data encrypted at rest and in transit
- GDPR/CCPA compliant
- Users can request data deletion

---

## **SUMMARY: WHAT SIGNALTRUE DOES**

SignalTrue is a **behavioral intelligence platform** that:

1. **Passively collects** data from Slack, Google Calendar, and Outlook
2. **Measures** team health across 10 dimensions (BDI, attrition, manager quality, etc.)
3. **Detects** risks and anomalies in real-time
4. **Predicts** future problems (flight risk, project delays, burnout)
5. **Generates** AI-powered recommendations using OpenAI GPT-4o
6. **Notifies** HR/admins of critical issues
7. **Tracks** impact of interventions

**No surveys. No employee input. Just behavioral intelligence.**

All measurements use **formula-based calculations** from passive data sources, making it objective, real-time, and actionable.

---

**END OF DOCUMENT**

Last Updated: January 10, 2026
Version: 2.0
