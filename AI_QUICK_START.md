# 🚀 Quick Start: AI Recommendations

## Setup (5 minutes)

### 1. Add Environment Variables

Edit `backend/.env` and add these three lines:

```bash
# Enable AI-powered recommendations
AI_RECOMMENDATIONS_ENABLED=true

# Minimum confidence to use AI (70-100, higher = more conservative)
AI_CONFIDENCE_THRESHOLD=70

# You should already have one of these:
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start the Server

```bash
cd backend
node server.js
```

Look for this in the logs:
```
✅ MongoDB connected
✅ Server running on port 8080
⏰ Weekly diagnosis scheduled
```

### 3. Done! 🎉

The system is now:
- ✅ Recording outcomes from completed experiments
- ✅ Using AI to generate recommendations (when confidence > 70%)
- ✅ Learning from every team's results
- ✅ Getting smarter over time

---

## Verify It's Working

### Check Learning Data
```bash
curl http://localhost:8080/api/learning/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected response (initially):**
```json
{
  "totalLearnings": 0,
  "outcomes": { "positive": 0, "neutral": 0, "negative": 0 },
  "aiGenerated": 0,
  "templateGenerated": 0
}
```

### After First Experiment Completes

Wait 2-4 weeks for an experiment to complete, then check again:

```bash
curl http://localhost:8080/api/learning/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Now shows:**
```json
{
  "totalLearnings": 1,
  "outcomes": { "positive": 1, "neutral": 0, "negative": 0 },
  "aiGenerated": 0,
  "templateGenerated": 1
}
```

### After 50+ Learnings (Month 3+)

```json
{
  "totalLearnings": 87,
  "outcomes": { "positive": 62, "neutral": 18, "negative": 7 },
  "aiGenerated": 34,
  "templateGenerated": 53,
  "aiSuccessRate": "76.5"
}
```

AI now handles 39% of recommendations! 🚀

---

## Watch AI in Action

### Monitor Server Logs

When weekly diagnosis runs (Monday 1 AM), look for:

```bash
# Template recommendation (fallback)
⚠️ AI confidence too low (65%), using template

# AI recommendation (success!)
✨ AI-generated recommendation for team 507f1f77bcf86cd799439011: 
   Shift your Thursday All-Hands to async recap + office hours
   (confidence: 82%)

# Learning recorded
📚 Learning recorded for experiment 507f191e810c19729de860ea
✅ Learning recorded: positive outcome for Reduce meeting frequency by 20% (Engineering team)
```

---

## Common Scenarios

### Scenario 1: First Week (No Data Yet)
- **Learnings**: 0
- **AI Usage**: 0%
- **Behavior**: All recommendations use templates
- **This is normal!** System needs data first.

### Scenario 2: Month 3 (Some Data)
- **Learnings**: 50-100
- **AI Usage**: 30-50%
- **Behavior**: AI starts making recommendations when it has relevant examples
- **Confidence**: 70-85%

### Scenario 3: Month 6 (Rich Data)
- **Learnings**: 200-400
- **AI Usage**: 60-80%
- **Behavior**: AI handles most recommendations, highly personalized
- **Confidence**: 80-95%

---

## Troubleshooting

### "AI confidence too low" in logs

**Reason**: Not enough learning data for this team type yet

**Solution**: Wait for more experiments to complete. System needs 3-5 relevant learnings before AI confidence reaches 70%+.

### "AI recommendation failed, falling back to template"

**Reason**: AI API error or JSON parsing failed

**Solution**: Check your API key is valid. System automatically uses templates as fallback.

### No learnings showing up

**Reason**: No experiments have completed yet

**Solution**: 
1. Activate an action: POST /api/insights/action/:actionId/activate
2. Wait 2-4 weeks (or manually complete experiment)
3. Check `/api/learning/summary` again

---

## What to Expect

### Timeline

**Week 1**: Setup complete, 0 learnings
**Week 4**: First 5-10 experiments complete, AI starts occasionally
**Month 3**: 50+ learnings, AI handling 40% of recommendations
**Month 6**: 200+ learnings, AI handling 70% of recommendations
**Month 12**: 1000+ learnings, AI is expert-level, 90% usage

### Success Metrics

Track these via `/api/learning/summary`:

1. **Total Learnings**: Should grow ~10-20 per month per 100 clients
2. **AI Success Rate**: Target 75%+ (better than templates)
3. **AI Generated %**: Target 50%+ by month 6

---

## Configuration Tuning

### Conservative (Fewer AI recs, higher quality)
```bash
AI_CONFIDENCE_THRESHOLD=85
```
Result: AI only used when very confident

### Balanced (Default)
```bash
AI_CONFIDENCE_THRESHOLD=70
```
Result: Good mix of AI and templates

### Aggressive (More AI recs)
```bash
AI_CONFIDENCE_THRESHOLD=60
```
Result: AI used more often, quality may vary

---

## Next Steps

1. ✅ Add env vars to `backend/.env`
2. ✅ Start server
3. ✅ Complete a few experiments
4. ✅ Watch learning data grow
5. ✅ Enjoy self-improving AI! 🎉

---

## Need Help?

1. **Run test**: `./test-ai-recommendations.sh`
2. **Check logs**: `node server.js`
3. **Verify setup**: `curl http://localhost:8080/api/learning/summary`
4. **Read docs**: `AI_RECOMMENDATIONS_README.md`

---

**That's it!** Your AI recommendations system is now learning from every client interaction and getting smarter over time. 🧠✨
