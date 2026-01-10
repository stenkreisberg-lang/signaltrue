# AI-Powered Recommendations with Learning Loop

## Overview

SignalTrue now features an **AI-powered recommendation engine** that learns from past experiment outcomes to provide increasingly personalized and effective action recommendations.

### How It Works

```
Behavioral Data → Drift Detection → AI Recommendation Engine → Personalized Actions
                                            ↓
                                    Context: team history, industry, past experiments
                                            ↓
                                    GPT/Claude generates custom playbook
                                            ↓
                                    Learning Loop records outcome
                                            ↓
                                    Future recommendations improve
```

---

## Features

### ✅ AI-Powered Recommendations
- Uses OpenAI GPT or Anthropic Claude to generate contextual recommendations
- Considers team history, industry, function, and past experiments
- Learns from similar teams' successful actions
- Falls back to templates if confidence is low

### ✅ Learning Loop
- Every completed experiment becomes a learning
- Future recommendations use past outcomes as context
- System improves over time as more data is collected

### ✅ Smart Fallback
- Template-based recommendations still available
- AI only used when confidence threshold is met (default: 70%)
- Graceful degradation if AI fails

---

## Setup

### 1. Environment Variables

Add these to your `backend/.env`:

```bash
# Enable AI recommendations
AI_RECOMMENDATIONS_ENABLED=true

# Minimum confidence to use AI (0-100)
# Higher = fewer AI recommendations, but higher quality
AI_CONFIDENCE_THRESHOLD=70

# AI Provider (already configured)
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start the Server

```bash
cd backend
node server.js
```

The system will automatically:
- Start generating AI recommendations when weekly diagnosis runs
- Record outcomes when experiments complete
- Build learning database for future recommendations

---

## API Endpoints

### Learning Statistics

**GET /api/learning/stats/:teamId**
```javascript
// Response
{
  "successes": 12,
  "failures": 3,
  "neutrals": 2,
  "rate": "70.6"  // Success rate percentage
}
```

### Learning Patterns

**GET /api/learning/patterns**

Query parameters:
- `industry` - Filter by industry (e.g., "SaaS", "Healthcare")
- `function` - Filter by team function (e.g., "Engineering", "Sales")
- `riskType` - Filter by risk type (e.g., "overload", "execution")
- `outcome` - Filter by outcome (e.g., "positive", "negative")
- `limit` - Max results (default: 50)

```javascript
// Response
{
  "total": 23,
  "patterns": [
    {
      "teamProfile": {
        "industry": "SaaS",
        "function": "Engineering",
        "size": "6-10"
      },
      "riskType": "overload",
      "action": {
        "title": "Reduce meeting frequency by 20%",
        "generatedBy": "template"
      },
      "outcome": "positive",
      "metricImpact": [
        {
          "metricKey": "meeting_load",
          "percentChange": -22.5
        }
      ],
      "confidence": "high"
    }
  ]
}
```

### Overall Summary

**GET /api/learning/summary**
```javascript
// Response
{
  "totalLearnings": 145,
  "outcomes": {
    "positive": 98,
    "neutral": 32,
    "negative": 15
  },
  "risks": {
    "overload": 67,
    "execution": 45,
    "retention_strain": 33
  },
  "industries": {
    "SaaS": 89,
    "Healthcare": 34,
    "Finance": 22
  },
  "aiGenerated": 34,
  "templateGenerated": 111,
  "aiSuccessRate": "73.5"
}
```

### Top Actions

**GET /api/learning/top-actions**

Query parameters:
- `industry` - Filter by industry
- `function` - Filter by team function
- `riskType` - Filter by risk type

```javascript
// Response
{
  "topActions": [
    {
      "title": "Reduce meeting frequency by 20%",
      "successCount": 23,
      "avgImpact": "-18.7",  // Percent change in target metric
      "industries": ["SaaS", "Healthcare"],
      "functions": ["Engineering", "Product"]
    }
  ]
}
```

---

## How AI Generates Recommendations

### 1. Context Aggregation

For each team, the system gathers:

**Team Profile:**
- Industry (e.g., SaaS, Healthcare)
- Function (e.g., Engineering, Sales)
- Team size
- Current BDI score and zone

**Current Issue:**
- Risk type (overload, execution, retention_strain)
- Top 3 drivers causing the issue
- Risk severity score

**Historical Context:**
- This team's past experiments and outcomes
- Similar teams' successful actions
- Failed actions to avoid
- Recent organizational changes
- Seasonality (Q4, summer, year-end)

### 2. AI Prompt Generation

The system creates a detailed prompt like:

```
You are an expert organizational psychologist specializing in team health.

TEAM CONTEXT:
- Industry: SaaS
- Team Function: Engineering
- Team Size: 6-10 (8 people)
- Current State: strained (high confidence)
- BDI Score: 65/100 (Zone: Watch, Trend: +8%)

CURRENT ISSUE:
- Risk Type: overload
- Top Drivers: meeting_load, after_hours_activity

THIS TEAM'S PAST EXPERIMENTS:
- "Reduce meeting frequency by 20%" → positive (meeting_load: -18%, focus_time: +12%)
- "Block 2-hour focus periods" → positive (focus_time: +22%)

WHAT WORKED FOR SIMILAR TEAMS:
- "Shift Thursday All-Hands to async recap" (Engineering, 6-10) → meeting_load: -24%, focus_time: +15%
- "Introduce quiet hours policy" (Engineering, 6-10) → after_hours_activity: -35%

RECENT CHANGES:
- Recent stress increase detected

TIMING CONTEXT:
- January 2026 (Q1)

Generate a personalized action recommendation...
```

### 3. AI Response

AI responds with structured JSON:

```json
{
  "title": "Shift your Thursday All-Hands to async recap + office hours",
  "why": "Your engineering team has successfully reduced meeting load by 18% in past experiments. Similar 6-10 person SaaS eng teams saw 24% meeting reduction with async All-Hands. Given your Q1 timing, this preserves planning while cutting coordination overhead.",
  "duration": 3,
  "confidence": 85,
  "reasoning": "Strong evidence from both this team's history and similar teams. Async pattern proven effective for engineering teams of this size."
}
```

### 4. Confidence Validation

If confidence < threshold (default 70%), system falls back to template-based recommendation.

---

## Learning Loop Workflow

### 1. Experiment Starts
```javascript
// User activates a suggested action
POST /api/insights/action/:actionId/activate
```

### 2. Experiment Runs
- System tracks metrics (2-4 weeks)
- Pre-metrics and post-metrics captured

### 3. Experiment Completes
```javascript
// Automatically triggered when endDate reached
// experimentTrackingService.completeExperiment()
```

### 4. Impact Generated
```javascript
// System analyzes metric changes
{
  "result": "positive",  // or "neutral", "negative"
  "confidence": "high",
  "metricChanges": [
    {
      "metricKey": "meeting_load",
      "preMean": 18.5,
      "postMean": 14.2,
      "delta": -4.3,
      "percentChange": -23.2
    }
  ]
}
```

### 5. Learning Recorded
```javascript
// learningLoopService.recordActionOutcome()
// Stores in ActionLearning collection
{
  "teamProfile": { "industry": "SaaS", "function": "Engineering", "size": "6-10" },
  "riskType": "overload",
  "action": { "title": "...", "generatedBy": "ai" },
  "outcome": "positive",
  "metricImpact": [...],
  "confidence": "high"
}
```

### 6. Future Recommendations Improve
Next time AI generates a recommendation for a similar team, this learning is included in the context.

---

## Configuration Options

### AI_RECOMMENDATIONS_ENABLED

```bash
AI_RECOMMENDATIONS_ENABLED=true   # Use AI when possible
AI_RECOMMENDATIONS_ENABLED=false  # Use templates only
```

### AI_CONFIDENCE_THRESHOLD

```bash
# Conservative (fewer AI recs, higher quality)
AI_CONFIDENCE_THRESHOLD=85

# Balanced (default)
AI_CONFIDENCE_THRESHOLD=70

# Aggressive (more AI recs, may be lower quality)
AI_CONFIDENCE_THRESHOLD=60
```

### Recommendation Strategy

The system uses a **progressive approach**:

**First 50 clients:**
- Limited learning data
- AI confidence typically 60-75%
- Mix of AI and template recommendations

**After 500+ learnings:**
- Rich learning data
- AI confidence typically 80-95%
- Mostly AI recommendations
- Highly personalized to team context

---

## Monitoring AI Performance

### View AI vs Template Success Rates

```bash
curl http://localhost:8080/api/learning/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Look for:
- `aiGenerated` vs `templateGenerated` counts
- `aiSuccessRate` percentage

### Track Learning Growth

```javascript
// Check total learnings over time
GET /api/learning/summary

// Response shows growth
{
  "totalLearnings": 145,  // Started at 0, grows with each experiment
  ...
}
```

### Compare Recommendations

```javascript
// Get patterns for your industry
GET /api/learning/patterns?industry=SaaS&outcome=positive

// See what's working for similar teams
```

---

## Database Schema

### ActionLearning Collection

```javascript
{
  experimentId: ObjectId,
  teamProfile: {
    industry: String,
    function: String,
    size: String,
    actualSize: Number
  },
  riskType: String,  // 'overload', 'execution', 'retention_strain'
  topDrivers: [String],
  action: {
    title: String,
    duration: Number,
    generatedBy: String  // 'template' or 'ai'
  },
  outcome: String,  // 'positive', 'neutral', 'negative'
  metricImpact: [{
    metricKey: String,
    preMean: Number,
    postMean: Number,
    delta: Number,
    percentChange: Number
  }],
  confidence: String,  // 'low', 'medium', 'high'
  recordedAt: Date
}
```

### Indexes

```javascript
// Fast queries by team profile
{ 'teamProfile.industry': 1, 'teamProfile.function': 1, riskType: 1, outcome: 1 }

// Time-based queries
{ riskType: 1, outcome: 1, recordedAt: -1 }
```

---

## Cost Estimation

### AI API Costs

**Per AI Recommendation:**
- Context prompt: ~500 tokens
- AI response: ~150 tokens
- Total: ~650 tokens

**Pricing (GPT-4o-mini):**
- $0.150 per 1M input tokens
- $0.600 per 1M output tokens
- **Cost per recommendation: ~$0.0001** (0.01 cents)

**Monthly at Scale:**
- 100 clients, 1 rec/week: $0.40/month
- 1000 clients, 1 rec/week: $4.00/month
- 10000 clients, 1 rec/week: $40.00/month

**Negligible cost!** 🎉

---

## Troubleshooting

### AI Recommendations Not Generating

**Check environment variables:**
```bash
echo $AI_RECOMMENDATIONS_ENABLED  # Should be "true"
echo $OPENAI_API_KEY             # Should have value
```

**Check logs:**
```bash
# Look for these messages
✨ AI-generated recommendation for team...
⚠️ AI confidence too low...
```

**Check learning data:**
```bash
curl http://localhost:8080/api/learning/summary
# totalLearnings should be > 0
```

### Low AI Confidence

**Possible reasons:**
- Not enough learning data yet (< 3 relevant learnings)
- No past experiments for this team
- No similar teams in database

**Solution:** Use system for 1-3 months to build learning database

### AI Response Errors

**Check logs for:**
- JSON parsing errors
- API timeout errors
- Missing required fields

**Fallback:** System automatically uses templates when AI fails

---

## Future Enhancements

### Phase 2: Semantic Search (Months 4-9)
- Add vector embeddings for similarity matching
- Find non-obvious patterns across industries
- Require MongoDB Atlas Vector Search or Pinecone

### Phase 3: Fine-Tuning (Year 2+)
- Train custom model on SignalTrue data
- Best performance at massive scale (5000+ learnings)
- Requires ML infrastructure

---

## Example Usage

### Enable AI Recommendations

```bash
# backend/.env
AI_RECOMMENDATIONS_ENABLED=true
AI_CONFIDENCE_THRESHOLD=70
```

### Monitor Learning Growth

```javascript
// Week 1: 0 learnings
GET /api/learning/summary
// { totalLearnings: 0 }

// Month 3: 50 learnings
GET /api/learning/summary
// { totalLearnings: 50, aiGenerated: 12, templateGenerated: 38 }

// Month 6: 200 learnings
GET /api/learning/summary
// { totalLearnings: 200, aiGenerated: 89, templateGenerated: 111 }
// AI now handles 45% of recommendations!
```

### View Top Performing Actions

```javascript
GET /api/learning/top-actions?industry=SaaS&function=Engineering

// Response
{
  "topActions": [
    {
      "title": "Reduce meeting frequency by 20%",
      "successCount": 23,
      "avgImpact": "-18.7%"
    }
  ]
}
```

---

## Support

For questions or issues:
1. Check logs: `node server.js`
2. Verify env vars: `cat backend/.env`
3. Check learning data: `GET /api/learning/summary`

---

**Built with ❤️ to help teams work better, powered by AI that learns from real outcomes.**
