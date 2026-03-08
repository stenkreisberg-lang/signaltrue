/**
 * Weekly AI Analysis Service
 *
 * Accepts the same structured data that generateWeeklyBrief already computes
 * and asks an LLM to produce:
 *   1. Executive Narrative   – a 3–5 sentence "what happened this week" story
 *   2. Cross-Metric Insights – correlations the rule engine can't detect
 *   3. Industry Benchmarking – contextualise numbers against the client's sector
 *   4. Strategic Recommendations – 3 prioritised, actionable, org-specific actions
 *   5. Look-Ahead Warning    – one paragraph on what to watch next week
 *
 * Privacy: The prompt receives ONLY aggregate metadata, never individual names,
 * message content, or anything identifiable.  The system prompt enforces this.
 *
 * Fallback: If no OPENAI_API_KEY / ANTHROPIC_API_KEY is set, returns null
 * so the caller can skip the section gracefully.
 */

import getProvider from '../utils/aiProvider.js';

// ─── Industry benchmarks (research-sourced averages) ───
// Meeting hours per person per week, after-hours %, back-to-back threshold
const INDUSTRY_BENCHMARKS = {
  'Technology':       { meetingHoursPerWeek: 12, afterHoursPct: 18, b2bThreshold: 6, description: 'Tech companies typically run meeting-heavy but tolerate more async. High after-hours norms in startup culture, lower in mature orgs.' },
  'SaaS':             { meetingHoursPerWeek: 14, afterHoursPct: 20, b2bThreshold: 7, description: 'SaaS teams skew toward higher meeting density due to cross-functional syncs (Sales↔Product↔CS). Sprint cadences drive back-to-back spikes.' },
  'Digital Agency':   { meetingHoursPerWeek: 10, afterHoursPct: 22, b2bThreshold: 5, description: 'Agencies often have deadline-driven bursts with high after-hours. Client meetings add to load. Bench time between projects is normal.' },
  'Consulting':       { meetingHoursPerWeek: 16, afterHoursPct: 25, b2bThreshold: 8, description: 'Consulting is inherently meeting-heavy. Client workshops, steering committees, and travel create sustained coordination load.' },
  'Financial Services': { meetingHoursPerWeek: 14, afterHoursPct: 15, b2bThreshold: 6, description: 'Financial firms have regulatory rhythm. Compliance cycles create periodic spikes. After-hours is structurally lower due to trading-hour boundaries.' },
  'Healthcare':       { meetingHoursPerWeek: 8, afterHoursPct: 12, b2bThreshold: 4, description: 'Healthcare teams have shift-based boundaries. Meeting load is lower but clinical handoffs matter. After-hours work is a stronger burnout signal here.' },
  'Manufacturing':    { meetingHoursPerWeek: 7, afterHoursPct: 10, b2bThreshold: 3, description: 'Manufacturing has clear shift boundaries. Elevated meeting hours usually signal operational disruption or change management.' },
  'Education':        { meetingHoursPerWeek: 9, afterHoursPct: 20, b2bThreshold: 5, description: 'Education has term-driven cycles. After-hours work is common during grading / reporting periods.' },
  'Retail':           { meetingHoursPerWeek: 6, afterHoursPct: 15, b2bThreshold: 3, description: 'Retail HQ teams have moderate meeting loads. Store-level teams have almost none. Seasonal spikes are expected.' },
  'Nonprofit':        { meetingHoursPerWeek: 10, afterHoursPct: 22, b2bThreshold: 5, description: 'Nonprofits often have lean teams doing broad work. Meeting load is moderate but after-hours is high due to passion-driven overwork.' },
  'Other':            { meetingHoursPerWeek: 11, afterHoursPct: 17, b2bThreshold: 5, description: 'Cross-industry average. Companies with 20-200 employees typically average 11 meeting-hours/person/week.' },
};

// ─── Build the prompt ───
function buildPrompt(data) {
  const {
    orgName, industry, orgSize, teamCount, employeeCount,
    tw, lw, // this-week / last-week metric objects
    twMeetings, lwMeetings, twMessages, lwMessages,
    twSignals, lwSignals, twCKSignals, lwCKSignals,
    teamBDIData, observations, risks,
    connectedSources,
  } = data;

  const bench = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['Other'];

  const signalSummary = [
    ...twSignals.map(s => `${s.signalType} (severity: ${s.severity}, team: ${s.teamId?.name || 'org-level'})`),
    ...twCKSignals.map(s => `${s.signalType} (severity: ${s.severity}/100)`),
  ];

  const bdiSummary = teamBDIData.map(t => {
    const prev = t.prevBDI ? `prev: ${t.prevBDI.driftScore}` : 'no previous';
    return `${t.teamName}: score ${t.bdi.driftScore}/100, state "${t.bdi.driftState}", confidence ${t.bdi.confidence} (${prev})`;
  });

  return `You are SignalTrue's senior workplace intelligence analyst.  You write weekly executive briefings for HR leaders.

RULES — follow strictly:
1. Never mention individuals by name. All analysis is team-level or org-level.
2. Never use clinical language ("burnout", "depression"). Use pattern language: "capacity pressure", "recovery erosion", "boundary drift".
3. Only reference the exact numbers provided below. Never invent statistics.
4. Be direct, specific, and evidence-based. Avoid filler. Every sentence must add insight.
5. Where relevant, compare to industry benchmarks and explain what the gap means.
6. Frame recommendations as system changes (processes, norms, meeting rules), not individual actions.
7. Recommendations must be concrete, actionable within 1 week, and reversible.
8. If the data is limited or shows no concerns, say so plainly — do not manufacture problems.

ORGANIZATION CONTEXT:
- Name: ${orgName}
- Industry: ${industry}
- Size: ${orgSize || 'Unknown'}
- Teams: ${teamCount}
- Connected integrations: ${connectedSources.join(', ') || 'None'}

INDUSTRY BENCHMARK (${industry}):
${bench.description}
- Typical meeting hours/week: ${bench.meetingHoursPerWeek}h
- Typical after-hours work: ${bench.afterHoursPct}%
- Back-to-back threshold before concern: ${bench.b2bThreshold}+ blocks/week

THIS WEEK vs LAST WEEK (aggregate):
- Meetings: ${twMeetings} (last week: ${lwMeetings})
- Messages: ${twMessages} (last week: ${lwMessages})
- Meeting hours (7d avg): ${tw.meetingHours?.toFixed(1) || 0}h (last week: ${lw.meetingHours?.toFixed(1) || 0}h)
- Back-to-back blocks: ${tw.backToBack?.toFixed(0) || 0} (last week: ${lw.backToBack?.toFixed(0) || 0})
- Messages/day: ${tw.msgsPerDay?.toFixed(1) || 0} (last week: ${lw.msgsPerDay?.toFixed(1) || 0})
- After-hours messages: ${tw.afterHoursMsg?.toFixed(0) || 0} (last week: ${lw.afterHoursMsg?.toFixed(0) || 0})
- After-hours ratio: ${((tw.afterHoursRatio || 0) * 100).toFixed(0)}% (last week: ${((lw.afterHoursRatio || 0) * 100).toFixed(0)}%)

ACTIVE SIGNALS THIS WEEK (${signalSummary.length} total):
${signalSummary.length > 0 ? signalSummary.map(s => `- ${s}`).join('\n') : '- None detected'}

SIGNALS LAST WEEK: ${lwSignals.length + lwCKSignals.length} total

TEAM HEALTH (BDI Drift Scores):
${bdiSummary.length > 0 ? bdiSummary.map(b => `- ${b}`).join('\n') : '- No BDI data available'}

OBSERVATIONS ALREADY GENERATED (deterministic engine):
${observations.length > 0 ? observations.map(o => `- ${o}`).join('\n') : '- None'}

RISKS ALREADY IDENTIFIED:
${risks.length > 0 ? risks.map(r => `- ${r}`).join('\n') : '- None'}

───────────────────────────────────────
Respond in EXACTLY this JSON format and nothing else:
{
  "executiveNarrative": "3-5 sentence story of what happened this week, written for a busy HR executive. Start with the most important finding. Reference specific numbers.",
  "crossMetricInsights": [
    "Insight 1: a correlation or pattern across 2+ metrics that a simple rule wouldn't catch",
    "Insight 2: another cross-metric observation"
  ],
  "industryComparison": "2-3 sentences comparing this org's key metrics to the ${industry} benchmark. Be specific about where they sit relative to industry norms and what that means.",
  "strategicRecommendations": [
    {
      "priority": 1,
      "action": "Specific action to take this week",
      "rationale": "Why this matters, citing the data",
      "effort": "Low|Medium|High",
      "expectedImpact": "What should improve and by when"
    },
    {
      "priority": 2,
      "action": "...",
      "rationale": "...",
      "effort": "...",
      "expectedImpact": "..."
    },
    {
      "priority": 3,
      "action": "...",
      "rationale": "...",
      "effort": "...",
      "expectedImpact": "..."
    }
  ],
  "lookAheadWarning": "One paragraph on what to watch for next week based on current trajectory. Be predictive but grounded in the data."
}`;
}

// ─── Main export ───
export async function generateWeeklyAIAnalysis(data) {
  // Check if any AI provider is configured (treat empty strings as unset)
  const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 5;
  const hasAnthropic = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 5;
  if (!hasOpenAI && !hasAnthropic) {
    console.log('[WeeklyAI] No AI provider key set — skipping AI analysis');
    return null;
  }

  try {
    const provider = getProvider();
    const prompt = buildPrompt(data);

    console.log('[WeeklyAI] Requesting AI analysis…');
    const startTime = Date.now();

    const response = await provider.generate({
      prompt,
      model: process.env.OPENAI_MODEL || 'gpt-4.1',
      max_tokens: 1500,
    });

    const raw = response.choices?.[0]?.message?.content;
    if (!raw) {
      console.error('[WeeklyAI] Empty response from AI provider');
      return null;
    }

    // Parse JSON from response (handle markdown code fences)
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(jsonStr);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[WeeklyAI] Analysis generated in ${elapsed}s (${response.usage?.total_tokens || '?'} tokens)`);

    return analysis;
  } catch (err) {
    console.error('[WeeklyAI] AI analysis failed, skipping section:', err.message);
    return null;
  }
}

export { INDUSTRY_BENCHMARKS };
