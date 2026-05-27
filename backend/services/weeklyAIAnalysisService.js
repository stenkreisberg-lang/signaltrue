/**
 * Weekly AI Analysis Service — v2
 *
 * Restructured output format:
 *   1. Hypotheses        – ranked interpretations with confidence + alternative explanations
 *   2. Role-Based Recommendations – split by HR / Manager / Leadership
 *   3. Trend Outlook     – what happens if pattern continues
 *   4. Industry Comparison – secondary context (demoted from v1)
 *
 * Privacy: The prompt receives ONLY aggregate metadata, never individual names,
 * message content, or anything identifiable.
 *
 * Fallback: If no OPENAI_API_KEY / ANTHROPIC_API_KEY is set, returns null.
 */

import getProvider from '../utils/aiProvider.js';

// ─── Industry benchmarks (secondary reference only) ───
const INDUSTRY_BENCHMARKS = {
  Technology: {
    meetingHoursPerWeek: 12,
    afterHoursPct: 18,
    b2bThreshold: 6,
    description: 'Tech companies typically run meeting-heavy but tolerate more async.',
  },
  SaaS: {
    meetingHoursPerWeek: 14,
    afterHoursPct: 20,
    b2bThreshold: 7,
    description: 'SaaS teams skew toward higher meeting density due to cross-functional syncs.',
  },
  'Digital Agency': {
    meetingHoursPerWeek: 10,
    afterHoursPct: 22,
    b2bThreshold: 5,
    description: 'Agencies often have deadline-driven bursts with high after-hours.',
  },
  Consulting: {
    meetingHoursPerWeek: 16,
    afterHoursPct: 25,
    b2bThreshold: 8,
    description: 'Consulting is inherently meeting-heavy.',
  },
  'Financial Services': {
    meetingHoursPerWeek: 14,
    afterHoursPct: 15,
    b2bThreshold: 6,
    description: 'Financial firms have regulatory rhythm.',
  },
  Healthcare: {
    meetingHoursPerWeek: 8,
    afterHoursPct: 12,
    b2bThreshold: 4,
    description: 'Healthcare teams have shift-based boundaries.',
  },
  Manufacturing: {
    meetingHoursPerWeek: 7,
    afterHoursPct: 10,
    b2bThreshold: 3,
    description: 'Manufacturing has clear shift boundaries.',
  },
  Education: {
    meetingHoursPerWeek: 9,
    afterHoursPct: 20,
    b2bThreshold: 5,
    description: 'Education has term-driven cycles.',
  },
  Retail: {
    meetingHoursPerWeek: 6,
    afterHoursPct: 15,
    b2bThreshold: 3,
    description: 'Retail HQ teams have moderate meeting loads.',
  },
  Nonprofit: {
    meetingHoursPerWeek: 10,
    afterHoursPct: 22,
    b2bThreshold: 5,
    description: 'Nonprofits often have lean teams doing broad work.',
  },
  Other: {
    meetingHoursPerWeek: 11,
    afterHoursPct: 17,
    b2bThreshold: 5,
    description: 'Cross-industry average.',
  },
};

// ─── Build the prompt ───
function buildPrompt(data) {
  const {
    orgName,
    industry,
    orgSize,
    teamCount,
    employeeCount,
    tw,
    lw,
    sixWeekAvg,
    twMeetings,
    lwMeetings,
    twMessages,
    lwMessages,
    twSignals,
    lwSignals,
    twCKSignals,
    lwCKSignals,
    teamBDIData,
    observations,
    risks,
    connectedSources,
    contextTags,
    teamStatus,
  } = data;

  const bench = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['Other'];

  const signalSummary = [
    ...twSignals.map(
      (s) => `${s.signalType} (severity: ${s.severity}, team: ${s.teamId?.name || 'org-level'})`
    ),
    ...twCKSignals.map((s) => `${s.signalType} (severity: ${s.severity}/100)`),
  ];

  const bdiSummary = teamBDIData.map((t) => {
    const prev = t.prevBDI ? `prev: ${t.prevBDI.driftScore}` : 'no previous';
    return `${t.teamName}: score ${t.bdi.driftScore}/100, state "${t.bdi.driftState}", confidence ${t.bdi.confidence} (${prev})`;
  });

  const contextTagsStr =
    (contextTags || []).length > 0
      ? contextTags
          .map((t) => `${t.tag} (${t.confidenceReduction} confidence reduction)`)
          .join(', ')
      : 'None';

  return `You are SignalTrue's senior workplace intelligence analyst. You write weekly briefings for HR leaders.

CRITICAL RULES:
1. Never mention individuals by name. All analysis is team-level or org-level.
2. Never use clinical language ("burnout", "depression"). Use: "capacity pressure", "recovery erosion", "boundary drift".
3. Only reference exact numbers provided. Never invent statistics.
4. ALWAYS show uncertainty. Distinguish fact from interpretation.
5. ALWAYS include confidence level (Low / Medium / High) for every hypothesis.
6. ALWAYS include at least one alternative explanation for each hypothesis.
7. Use plain business language. No therapy language. No generic AI commentary.
8. If data is limited or shows no concerns, say so plainly — do not manufacture problems.
9. Industry benchmarks are SECONDARY to the team's own baseline patterns.
10. Recommendations must specify the OWNER role (HR, Manager, or Leadership).

ORGANIZATION CONTEXT:
- Name: ${orgName}
- Industry: ${industry}
- Size: ${orgSize || 'Unknown'}
- Teams: ${teamCount}
- Team Status: ${teamStatus || 'Unknown'}
- Connected integrations: ${connectedSources.join(', ') || 'None'}
- Context tags this week: ${contextTagsStr}

THIS WEEK vs LAST WEEK vs 6-WEEK AVERAGE:
- Meetings: ${twMeetings} (last week: ${lwMeetings}, 6wk avg: ${sixWeekAvg?.meetings?.toFixed(0) || '—'})
- Messages: ${twMessages} (last week: ${lwMessages}, 6wk avg: ${sixWeekAvg?.messages?.toFixed(0) || '—'})
- Meeting hours: ${tw.meetingHours?.toFixed(1) || 0}h (last week: ${lw.meetingHours?.toFixed(1) || 0}h, 6wk avg: ${sixWeekAvg?.meetingHours?.toFixed(1) || '—'}h)
- Back-to-back blocks: ${tw.backToBack?.toFixed(0) || 0} (last week: ${lw.backToBack?.toFixed(0) || 0}, 6wk avg: ${sixWeekAvg?.backToBack?.toFixed(0) || '—'})
- After-hours ratio: ${((tw.afterHoursRatio || 0) * 100).toFixed(0)}% (last week: ${((lw.afterHoursRatio || 0) * 100).toFixed(0)}%, 6wk avg: ${sixWeekAvg?.afterHoursRatioPct?.toFixed(0) || '—'}%)
- Focus time availability: ${tw.focusTimeAvailability?.toFixed(1) || '—'}h (last week: ${lw.focusTimeAvailability?.toFixed(1) || '—'}h)
- Calendar fragmentation: ${tw.calendarFragmentation?.toFixed(0) || '—'}/100 (last week: ${lw.calendarFragmentation?.toFixed(0) || '—'}/100)
- Recurring meeting burden: ${((tw.recurringBurden || 0) * 100).toFixed(0)}% (last week: ${((lw.recurringBurden || 0) * 100).toFixed(0)}%)

INDUSTRY BENCHMARK (${industry}, secondary reference only):
- Typical meeting hours/week: ${bench.meetingHoursPerWeek}h | After-hours: ${bench.afterHoursPct}%

ACTIVE SIGNALS: ${signalSummary.length > 0 ? signalSummary.map((s) => `- ${s}`).join('\n') : '- None detected'}
TEAM HEALTH (BDI): ${bdiSummary.length > 0 ? bdiSummary.map((b) => `- ${b}`).join('\n') : '- No BDI data'}

───────────────────────────────────────
Respond in EXACTLY this JSON format:
{
  "hypotheses": [
    {
      "patternObserved": "One sentence, plain language. What happened.",
      "evidence": ["metric 1 with number", "metric 2 with number"],
      "whatThisMayMean": "One cautious interpretation.",
      "confidence": "Low|Medium|High",
      "whatCouldAlsoExplainIt": "Alternative explanation."
    }
  ],
  "hrActions": [
    {
      "action": "Specific action",
      "effort": "Low|Medium|High",
      "expectedOutcome": "What should improve",
      "reviewWindow": "7 days|14 days"
    }
  ],
  "managerActions": [
    {
      "action": "Specific action",
      "effort": "Low|Medium|High",
      "expectedOutcome": "What should improve",
      "reviewWindow": "7 days|14 days"
    }
  ],
  "leadershipActions": [
    {
      "action": "Specific action (only if risk elevated)",
      "effort": "Low|Medium|High",
      "expectedOutcome": "What should improve",
      "reviewWindow": "14 days|30 days"
    }
  ],
  "trendOutlook": {
    "likelyNextStageRisk": "What happens if this pattern continues.",
    "metricToWatchNextWeek": "Which metric to monitor.",
    "escalationTrigger": "What threshold would trigger escalation."
  },
  "industryComparison": "1-2 sentences comparing to ${industry} benchmarks. Keep brief and secondary."
}`;
}

// ─── Main export ───
export async function generateWeeklyAIAnalysis(data) {
  const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 5;
  const hasAnthropic =
    process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 5;
  if (!hasOpenAI && !hasAnthropic) {
    console.log('[WeeklyAI] No AI provider key set — skipping AI analysis');
    return null;
  }

  try {
    const provider = getProvider();
    const prompt = buildPrompt(data);

    console.log('[WeeklyAI] Requesting AI analysis (v2 structured format)…');
    const startTime = Date.now();

    const response = await provider.generate({
      prompt,
      model: process.env.OPENAI_MODEL || 'gpt-4.1',
      max_tokens: 2000,
    });

    const raw = response.choices?.[0]?.message?.content;
    if (!raw) {
      console.error('[WeeklyAI] Empty response from AI provider');
      return null;
    }

    const jsonStr = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const analysis = JSON.parse(jsonStr);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[WeeklyAI] Analysis generated in ${elapsed}s (${response.usage?.total_tokens || '?'} tokens)`
    );

    return analysis;
  } catch (err) {
    console.error('[WeeklyAI] AI analysis failed, skipping section:', err.message);
    return null;
  }
}

export { INDUSTRY_BENCHMARKS };
