# SignalTrue Loop-Closing Feature Implementation

## Overview

This document describes the implementation of the Loop-Closing pilot features designed to turn SignalTrue from "interesting signals" into a system that:
- Shows concrete problems
- Simulates what to change
- Proves improvement within 30 days

## Phase 1 Features (Implemented)

### 1. Meeting ROI Score (Team-Level)

**Purpose:** Quantify how much meeting time is likely wasted vs productive, without reading content.

**Location:**
- Model: `backend/models/loopClosing.js` → `MeetingROI`
- Service: `backend/services/meetingROIService.js`
- API: `GET/POST /api/loop-closing/meeting-roi/:teamId`
- Frontend: `src/components/LoopClosingDashboard.js` → `MeetingROITile`

**Metrics Calculated:**
- **Meeting Cost** = Σ(duration × attendees)
- **Follow-up Load** = messages_48h_after_meeting / meeting_cost
- **Rework Indicator** = % of meetings followed by another meeting with >60% same attendees within 72h
- **ROI Score** (0-100) = weighted combination of above

**Dashboard Display:**
- Score out of 100 with progress bar
- "42% of meeting time last month shows low ROI"
- Meeting count badge

### 2. Focus Recovery Forecast

**Purpose:** Show near-future focus loss if nothing changes.

**Location:**
- Model: `backend/models/loopClosing.js` → `FocusForecast`
- Service: `backend/services/focusForecastService.js`
- API: `GET/POST /api/loop-closing/focus-forecast/:teamId`
- Frontend: `src/components/LoopClosingDashboard.js` → `FocusForecastTile`

**Metrics Calculated:**
- **Focus Blocks/Day** = ≥90 min uninterrupted windows
- **Fragmentation Index** = context switches per day
- **14-Day Trend Slope** = linear regression on rolling data
- **Focus Capacity Change** = extrapolated % change

**Warning States:**
- **Stable**: No significant degradation
- **Degrading**: Focus trend negative or fragmentation increasing
- **Critical**: Severe degradation projected

**Dashboard Display:**
- Percentage change with color coding
- Warning state badge
- Forecast message: "At current trend, team will lose ~18% focus capacity in 14 days"
- Mini trend visualization

### 3. 30-Day Work Health Delta Report

**Purpose:** Answer "Did this help us?"

**Location:**
- Model: `backend/models/loopClosing.js` → `WorkHealthDelta`
- Service: `backend/services/workHealthDeltaService.js`
- API: `GET/POST /api/loop-closing/health-delta/:teamId`
- Frontend: `src/components/LoopClosingDashboard.js` → `WorkHealthDeltaTile`

**Comparison Periods:**
- **Baseline**: First 7 days of 30-day window
- **Current**: Last 7 days of 30-day window

**Metrics Compared:**
| Metric | Good Direction |
|--------|---------------|
| Focus Time | ↑ Increase |
| Meeting Load | ↓ Decrease |
| Fragmentation | ↓ Decrease |
| After-Hours | ↓ Decrease |
| Load Balance | ↑ Increase |
| Meeting ROI | ↑ Increase |

**Status Colors:**
- 🟢 Green: >5% improvement
- 🟡 Yellow: ±5% stable
- 🔴 Red: >15% decline

**Dashboard Display:**
- Overall status badge (Improved/Stable/Declined)
- Summary message
- 6-metric grid with delta percentages
- Export PDF button

## API Endpoints

### Meeting ROI
```
GET  /api/loop-closing/meeting-roi/:teamId         # Latest ROI
GET  /api/loop-closing/meeting-roi/:teamId/history # Historical trend
POST /api/loop-closing/meeting-roi/:teamId/compute # Trigger calculation
```

### Focus Forecast
```
GET  /api/loop-closing/focus-forecast/:teamId         # Latest forecast
GET  /api/loop-closing/focus-forecast/:teamId/history # Historical data
POST /api/loop-closing/focus-forecast/:teamId/compute # Trigger calculation
```

### Work Health Delta
```
GET  /api/loop-closing/health-delta/:teamId         # Latest report
GET  /api/loop-closing/health-delta/:teamId/history # Past reports
GET  /api/loop-closing/health-delta/:teamId/pdf     # PDF-formatted data
POST /api/loop-closing/health-delta/:teamId/compute # Generate report
```

### Combined Dashboard
```
GET  /api/loop-closing/dashboard/:teamId         # Phase 1 metrics
GET  /api/loop-closing/full-dashboard/:teamId    # Phase 1 + 2 metrics
GET  /api/loop-closing/complete-dashboard/:teamId # All phases
POST /api/loop-closing/compute-all/:teamId       # Trigger all calculations
```

### After-Hours Cost (Phase 2)
```
GET  /api/loop-closing/after-hours/:teamId         # Latest calculation
GET  /api/loop-closing/after-hours/:teamId/history # Historical data
POST /api/loop-closing/after-hours/:teamId/compute # Trigger calculation
```

### Meeting Collision (Phase 2)
```
GET  /api/loop-closing/collision/:teamId         # Latest heatmap
GET  /api/loop-closing/collision/:teamId/history # Historical data
POST /api/loop-closing/collision/:teamId/compute # Trigger calculation
```

### Intervention Simulator (Phase 3)
```
GET  /api/loop-closing/simulator/presets           # Available presets
POST /api/loop-closing/simulator/:teamId/run       # Run custom simulation
POST /api/loop-closing/simulator/:teamId/quick     # Run preset simulation
```

### Load Balance (Phase 3)
```
GET  /api/loop-closing/load-balance/:teamId         # Get load balance index
POST /api/loop-closing/load-balance/:teamId/compute # Compute with metrics
```

### Execution Drag (Phase 3)
```
GET  /api/loop-closing/execution-drag/:teamId         # Get execution drag
GET  /api/loop-closing/execution-drag/:teamId/history # Historical trend
POST /api/loop-closing/execution-drag/:teamId/compute # Compute with periods
```

## Data Sources

All features use metadata already available:
- **Calendar**: Google Calendar, Outlook (via existing integrations)
- **Messaging**: Slack, MS Teams (metadata only, no content)
- **Aggregation**: Team level only, minimum 5 members

## Phase 2 Features (Implemented)

### 4. Meeting Collision Heatmap

**Purpose:** Expose structural focus dead zones.

**Location:**
- Model: `MeetingCollision` in `loopClosing.js`
- Service: `backend/services/meetingCollisionService.js`
- API: `GET/POST /api/loop-closing/collision/:teamId`
- Frontend: `src/components/LoopClosingDashboard.js` → `CollisionHeatmapTile`

**Metrics Calculated:**
- **Collision Density** per time slot (0-100)
- **Red Zones** = slots with >70% meeting probability
- **Focus Windows** = slots with <20% meeting probability
- **Congestion Rate** = % of work hours in red zones

**Dashboard Display:**
- Weekly heatmap (Mon-Fri × hours)
- Color-coded slots (green/yellow/red)
- Red zone and focus window counts
- Worst/best day identification

### 5. After-Hours Cost Calculator

**Purpose:** Translate invisible work into cost language.

**Location:**
- Model: `AfterHoursCost` in `loopClosing.js`
- Service: `backend/services/afterHoursCostService.js`
- API: `GET/POST /api/loop-closing/after-hours/:teamId`
- Frontend: `src/components/LoopClosingDashboard.js` → `AfterHoursCostTile`

**Metrics Calculated:**
- **After-Hours Hours** = weekly hours outside 8am-6pm
- **Equivalent FTE** = after-hours / 40 hours
- **Estimated Cost** = FTE × avg salary
- **Monthly Accumulated** = 4-week running total

**Dashboard Display:**
- FTE value with color coding
- Weekly hours badge
- Bar chart of daily breakdown
- Monthly cost estimate

## Phase 3 Features (Implemented)

### 6. Intervention Simulator (What-If Engine)

**Purpose:** Let users test changes before committing.

**Location:**
- Model: `InterventionSimulation` in `loopClosing.js`
- Service: `backend/services/interventionSimulatorService.js`
- API: `GET/POST /api/loop-closing/simulator/:teamId`
- Frontend: `src/components/LoopClosingDashboard.js` → `InterventionSimulatorTile`

**Intervention Types:**
- `remove_meeting` - Remove specific recurring meetings
- `shorten_meeting` - Reduce meeting duration by percentage
- `add_focus_block` - Add protected focus blocks
- `batch_meetings` - Consolidate meetings to specific days
- `no_meeting_day` - Designate meeting-free days

**Presets Available:**
- "Cancel Low-ROI Meetings" - Remove bottom 20% ROI meetings
- "Shorten All Meetings 25%" - Reduce all durations
- "Add Daily Focus Block" - 2-hour protected windows
- "No-Meeting Wednesday" - Meeting-free midweek day

**Dashboard Display:**
- Preset buttons for quick simulation
- Before/after delta preview (Focus, Fragmentation, After-Hours, Meeting Hours)
- Summary message with projected impact

### 7. Team Load Balance Index

**Purpose:** Reveal hidden load concentration without identifying individuals.

**Location:**
- Model: `LoadBalance` in `loopClosing.js`
- Service: `backend/services/loadBalanceService.js`
- API: `GET/POST /api/loop-closing/load-balance/:teamId`
- Frontend: `src/components/LoopClosingDashboard.js` → `LoadBalanceTile`

**Metrics Calculated:**
- **Coefficient of Variation (CV)** per dimension
- **Dimensions**: meeting_hours, after_hours, response_pressure
- **Load Balance Index** = 100 - (weighted CV average × 100)
- **Skewed Dimensions** = dimensions with CV > 0.4

**Balance States:**
- **Balanced**: Index ≥ 70
- **Moderately Skewed**: Index 40-70
- **Highly Skewed**: Index < 40

**Dashboard Display:**
- Gauge visualization (0-100)
- Dimension breakdown grid
- Skewed dimension warnings
- Explanation message

### 8. Execution Drag Indicator

**Purpose:** Detect when coordination overhead eats execution capacity.

**Location:**
- Model: `ExecutionDrag` in `loopClosing.js`
- Service: `backend/services/executionDragService.js`
- API: `GET/POST /api/loop-closing/execution-drag/:teamId`
- Frontend: `src/components/LoopClosingDashboard.js` → `ExecutionDragTile`

**Metrics Calculated:**
- **Coordination Growth** = % change in meetings + messages
- **Response Efficiency** = % change in response time
- **Execution Drag** = coordination_growth - response_efficiency
- **Trend Analysis** = multi-week comparison

**Drag States:**
- **Efficient**: Drag ≤ 5
- **Drag Building**: Drag 5-15
- **High Drag**: Drag > 15

**Dashboard Display:**
- Drag percentage with color coding
- Coordination vs efficiency comparison bars
- Warning banner for high drag
- Trend explanation

## Implementation Notes

### No ML Required
All features are deterministic and explainable:
- Linear regression for trends
- Simple formulas for scores
- Clear input → output mappings

### Scoring Approach
All scores use 0-100 range:
- Higher = better for positive metrics (ROI, Focus, Balance)
- Thresholds are configurable
- Weights can be tuned per organization

### Data Privacy
- No message content is read
- Only metadata analyzed (timestamps, attendees, durations)
- Team-level aggregation (min 5 members)
- Compliant with existing consent framework

## Testing

### Backend Tests
```bash
cd backend
npm test -- --grep "loop-closing"
```

### Manual API Testing
```bash
# Get dashboard for team
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/loop-closing/dashboard/{teamId}

# Trigger computation
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/loop-closing/compute-all/{teamId}
```

## Integration with Existing System

The Loop-Closing dashboard is integrated into:
- Main Dashboard (`src/components/Dashboard.js`)
- Appears above existing DriftAlerts and PlaybookRecommendations
- Uses same authentication and team context

## Next Steps

1. **Connect Calendar Data**: Wire up actual calendar events from Google/Outlook integrations
2. **Connect Slack/Teams Data**: Wire up message metadata for follow-up and after-hours calculations
3. **Schedule Daily Computation**: Add cron job to compute metrics daily via `compute-all` endpoint
4. **PDF Export**: Implement actual PDF generation for 30-Day Health Delta reports
5. **User Testing**: Pilot with 3-5 teams to validate formulas and thresholds
6. **Threshold Tuning**: Adjust scoring weights based on pilot feedback
7. **Notification Integration**: Alert admins when critical thresholds are crossed
