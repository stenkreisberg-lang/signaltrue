# Behavioral Drift Diagnostic Implementation

## Overview

This document summarizes the implementation of the Behavioral Drift Diagnostic feature - a free, anonymous lead generation tool that helps prospects assess their organization's coordination drift risk before committing to the full SignalTrue product.

## Routes

### Frontend Routes (React)

| Route | Component | Description |
|-------|-----------|-------------|
| `/drift-diagnostic` | `DriftDiagnostic.tsx` | Landing page with "Start Diagnostic" button |
| `/drift-report/:sessionId` | `DriftReport.tsx` | Gated results page (requires email unlock) |
| `/drift/run.html` | Static HTML | The multi-step diagnostic UI |

### Backend API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/drift/submit` | Saves answers and scores, returns `{ sessionId }` |
| `POST` | `/api/drift/unlock` | Takes work email, links to session, returns `{ reportUrl }` |
| `GET` | `/api/drift/report/:sessionId` | Returns report data (requires `unlocked=true`) |
| `GET` | `/api/drift/stats` | Admin statistics endpoint (requires `x-admin-key` header) |

## Data Model

### DriftSession (MongoDB)

```javascript
{
  sessionId: String (UUID, unique, indexed),
  answers: {
    company_size: String,    // '1-25', '26-80', '81-250', '251-1000', '1000+'
    work_mode: String,       // 'on-site', 'hybrid', 'remote'
    meeting_time: String,    // 'lt20', '20-40', '40-60', 'gt60'
    back_to_back: String,    // 'rare', 'sometimes', 'often', 'daily'
    response_expectations: String, // 'flex', 'same_day', 'hours', 'minutes'
    interruptions: String,   // 'low', 'moderate', 'high', 'constant'
    manager_urgency: String, // 'rare', 'monthly', 'weekly', 'daily'
    recovery_gaps: String    // 'often', 'sometimes', 'rare', 'never'
  },
  score: {
    totalScore: Number (0-100),
    category: String,  // 'Stable', 'Early Drift', 'Active Drift', 'Critical Drift'
    subScores: {
      meeting_pressure: Number,
      response_pressure: Number,
      focus_fragmentation: Number,
      recovery_deficit: Number,
      urgency_culture: Number
    },
    findings: [String]
  },
  email: String (nullable),
  emailVerified: Boolean (default: false),
  unlockedAt: Date (nullable),
  utm: {
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    utm_content: String,
    utm_term: String,
    referrer: String
  },
  consentMarketing: Boolean (default: true),
  ipHash: String (nullable),
  userAgent: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Scoring Logic

### Total Score Calculation

Each question contributes points based on the answer:

| Question | Weights |
|----------|---------|
| company_size | 4-9 points |
| work_mode | 5-8 points |
| meeting_time | 3-12 points |
| back_to_back | 3-12 points |
| response_expectations | 3-12 points |
| interruptions | 3-12 points |
| manager_urgency | 3-12 points |
| recovery_gaps | 3-12 points |

Total raw score is normalized to 0-100 scale.

### Category Mapping

| Score Range | Category |
|-------------|----------|
| 0-24 | Stable |
| 25-49 | Early Drift |
| 50-74 | Active Drift |
| 75-100 | Critical Drift |

## Files Created/Modified

### New Files

1. **Backend**
   - `backend/models/driftSession.js` - MongoDB model
   - `backend/routes/drift.js` - API routes
   - `backend/services/driftEmailService.js` - Email templates and sending

2. **Frontend (Static)**
   - `public/drift/run.html` - Diagnostic UI
   - `public/drift/drift.css` - Styling
   - `public/drift/drift.js` - Logic and state management

3. **Frontend (React)**
   - `src/pages/DriftDiagnostic.tsx` - Landing page
   - `src/pages/DriftReport.tsx` - Report page

### Modified Files

1. `backend/server.js` - Added drift route import and mount
2. `src/App.tsx` - Added drift routes to React Router
3. `src/components/Navbar.tsx` - Added "Free Diagnostic" nav item
4. `src/components/Hero.tsx` - Added diagnostic CTA section

## Analytics Events

The implementation fires these events (ready for GA4/PostHog integration):

| Event | Description |
|-------|-------------|
| `drift_start` | User opens diagnostic |
| `drift_step_view` | User views a question (with step number) |
| `drift_submit` | User completes all questions |
| `drift_unlock_view` | User sees email gate |
| `drift_unlock_submit` | User submits email |
| `drift_report_view` | User views full report |
| `drift_cta_baseline_calibration` | User clicks baseline CTA |

## Email Sequence

5-email nurture sequence implemented in `driftEmailService.js`:

| Email | Timing | Subject |
|-------|--------|---------|
| #1 | Immediate | Your Behavioral Drift Report (and what it means) |
| #2 | Day 2 | Why surveys miss drift until it's too late |
| #3 | Day 5 | The first thing that breaks is coordination, not motivation |
| #4 | Day 9 | A practical way to reduce burnout risk without surveillance |
| #5 | Day 14 | Want to see this on real data in 30 days? |

## Privacy Copy

Consistent messaging throughout:

> "No personal data. No message content. This diagnostic is about system patterns—not surveillance."

> "SignalTrue is built for prevention, not surveillance. This diagnostic collects no names, no content, and no employee-level tracking. Team-level patterns only."

## Testing

### Backend API Testing

```bash
# Submit diagnostic
curl -X POST http://localhost:8080/api/drift/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "company_size": "81-250",
      "work_mode": "hybrid",
      "meeting_time": "40-60",
      "back_to_back": "often",
      "response_expectations": "hours",
      "interruptions": "high",
      "manager_urgency": "weekly",
      "recovery_gaps": "rare"
    },
    "score": {
      "totalScore": 67,
      "category": "Active Drift",
      "subScores": {
        "meeting_pressure": 79,
        "response_pressure": 75,
        "focus_fragmentation": 75,
        "recovery_deficit": 75,
        "urgency_culture": 75
      },
      "findings": ["Meeting load is compressing recovery and focus time."]
    },
    "utm": { "utm_source": "test" }
  }'

# Unlock report
curl -X POST http://localhost:8080/api/drift/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<session-id-from-above>",
    "email": "test@example.com",
    "consent_marketing": true
  }'

# Fetch report
curl http://localhost:8080/api/drift/report/<session-id>
```

### Frontend Testing

1. Visit `/drift-diagnostic` - should see landing page
2. Click "Start Diagnostic" - opens `/drift/run.html`
3. Complete 8 questions - shows score preview
4. Enter email - redirects to `/drift-report/:sessionId`
5. View full report with recommendations

## Environment Variables

Required for email functionality:

```env
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=SignalTrue <notifications@signaltrue.ai>
FRONTEND_URL=https://signaltrue.ai
CALENDAR_LINK=https://calendly.com/signaltrue/drift-review
```

## Next Steps

1. **Email Automation**: Set up automated drip campaign for emails 2-5
2. **PDF Report**: Implement `/api/drift/report/:sessionId/pdf` endpoint
3. **A/B Testing**: Test different scoring thresholds and copy variations
4. **Analytics Integration**: Connect events to GA4/PostHog
5. **CRM Integration**: Sync leads to your CRM system
