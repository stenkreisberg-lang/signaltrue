/**
 * Engagement Explanation Service
 *
 * Generates plain-language explanations for Engagement Strain Risk scores
 * using an LLM (OpenAI by default, model configurable via env).
 *
 * ─── SPEC SECTION 18 CONSTRAINTS ─────────────────────────────────────────────
 * The LLM is explicitly prohibited from:
 *   1. Inferring individual emotions, mental state, or wellbeing
 *   2. Naming, inferring, or implying specific individuals
 *   3. Making clinical or psychological diagnoses
 *   4. Reading message or email content — only metadata counts are provided
 *   5. Speculating about root causes beyond what the signal data supports
 *
 * Input to the LLM is a structured metric snapshot only.
 * No message text, no email content, no identity-linked data.
 *
 * ─── GRACEFUL DEGRADATION ────────────────────────────────────────────────────
 * If the LLM is unavailable (no API key, network error, quota), the service
 * falls back to a deterministic rule-based explanation built from the same
 * structured input. The system never blocks on LLM availability.
 */

import OpenAI from 'openai';

// ── Config ─────────────────────────────────────────────────────────────────────

const MODEL    = process.env.OPENAI_MODEL   ?? 'gpt-4o-mini';
const MAX_TOKENS = parseInt(process.env.EXPLANATION_MAX_TOKENS ?? '400', 10);

// Lazy-initialise client — only created if OPENAI_API_KEY is set
let _openai = null;
function getClient() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) return null;
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a plain-language explanation for a team's weekly Engagement Strain result.
 *
 * @param {Object} input
 * @param {string}   input.teamName               — team display name (not an ID)
 * @param {string}   input.weekStart               — ISO date string
 * @param {number}   input.engagementStrainRisk    — 0–100
 * @param {string}   input.riskState               — healthy|watch|strain|critical
 * @param {string}   input.trend                   — rising|stable|improving
 * @param {Object}   input.subscores               — 7 subscore values
 * @param {Array}    input.topDrivers              — top 3 driver objects
 * @param {Array}    input.patterns                — detected pattern objects
 * @param {number}   input.confidenceScore         — 0–100
 * @param {string}   input.confidenceLabel         — low|moderate|high
 * @returns {Promise<string>}                      — plain English explanation paragraph
 */
export async function generateExplanation(input) {
  const client = getClient();

  if (client) {
    try {
      return await callLLM(client, input);
    } catch (err) {
      console.warn('[EngagementExplanation] LLM call failed, using fallback:', err.message);
    }
  }

  return buildFallbackExplanation(input);
}

// ── LLM Call ───────────────────────────────────────────────────────────────────

async function callLLM(client, input) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt   = buildUserPrompt(input);

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.3,       // Low temperature — factual, consistent output
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? buildFallbackExplanation(input);
}

// ── System Prompt ──────────────────────────────────────────────────────────────

function buildSystemPrompt() {
  return `You are an expert workplace analytics interpreter for SignalTrue, an engagement intelligence platform.

Your role is to translate structured team work-pattern metrics into clear, factual, manager-friendly explanations.

STRICT CONSTRAINTS — you must never violate these:
1. Do NOT infer, imply, or speculate about any individual person's emotions, mental health, motivation, or intent.
2. Do NOT name, identify, or imply the identity of any specific person.
3. Do NOT make clinical, psychological, or medical statements about wellbeing or burnout.
4. Do NOT reference message content, email content, or document content — only metadata counts and ratios are available to you.
5. Do NOT speculate beyond what the provided metric signals directly support.
6. Always speak at the team level, not the individual level.
7. Be factual, measured, and constructive. Avoid alarming language beyond what the data warrants.
8. Keep the explanation concise — 3 to 5 sentences maximum.
9. Where confidence is low or moderate, acknowledge the data quality limitation briefly.

Your output is one paragraph. No bullet points. No headers. Plain prose only.`;
}

// ── User Prompt ────────────────────────────────────────────────────────────────

function buildUserPrompt(input) {
  const {
    teamName,
    weekStart,
    engagementStrainRisk,
    riskState,
    trend,
    subscores,
    topDrivers,
    patterns,
    confidenceScore,
    confidenceLabel,
  } = input;

  const topDriverSummary = (topDrivers ?? [])
    .slice(0, 3)
    .map(d => `${d.driver} (score: ${d.score})`)
    .join(', ');

  const patternSummary = (patterns ?? [])
    .map(p => p.title)
    .join(', ') || 'none detected';

  return `Generate a plain-language explanation for the following team engagement strain result.

Team: ${teamName ?? 'the team'}
Week starting: ${weekStart}
Overall Engagement Strain Risk: ${engagementStrainRisk}/100 (${riskState})
Trend vs last week: ${trend}
Data confidence: ${confidenceLabel} (${confidenceScore}/100)

Subscore breakdown:
- Recovery Debt: ${subscores?.recoveryDebt ?? 'N/A'}
- Focus Erosion: ${subscores?.focusErosion ?? 'N/A'}
- Coordination Friction: ${subscores?.coordinationFriction ?? 'N/A'}
- Responsiveness Pressure: ${subscores?.responsivenessPressure ?? 'N/A'}
- Collaboration Withdrawal: ${subscores?.collaborationWithdrawal ?? 'N/A'}
- Manager Support Gap: ${subscores?.managerSupportGap ?? 'N/A'}
- Workload Volatility: ${subscores?.workloadVolatility ?? 'N/A'}

Top risk drivers: ${topDriverSummary || 'none identified'}
Detected patterns: ${patternSummary}

Remember: speak only to team-level patterns. Do not identify individuals. Do not infer emotions. Do not reference message content. 3–5 sentences only.`;
}

// ── Fallback Rule-Based Explanation ───────────────────────────────────────────

function buildFallbackExplanation(input) {
  const {
    engagementStrainRisk,
    riskState,
    trend,
    subscores,
    topDrivers,
    confidenceLabel,
  } = input;

  const score = engagementStrainRisk ?? 0;
  const state = riskState ?? 'watch';

  // Opening sentence based on risk state
  const opening = {
    healthy:  `This team's engagement strain risk score of ${score} places it in the healthy range this week.`,
    watch:    `This team's engagement strain risk score of ${score} is in the watch range, warranting light monitoring.`,
    strain:   `This team's engagement strain risk score of ${score} indicates elevated strain this week.`,
    critical: `This team's engagement strain risk score of ${score} is in the critical range and requires prompt attention.`,
  }[state] ?? `Engagement strain risk this week is ${score}.`;

  // Trend sentence
  const trendMap = {
    rising:    'The score has been rising compared to last week.',
    improving: 'The score has improved compared to last week.',
    stable:    'The score is stable week-over-week.',
  };
  const trendSentence = trendMap[trend] ?? '';

  // Top driver sentence
  let driverSentence = '';
  if (topDrivers?.length) {
    const names = topDrivers.slice(0, 2).map(d => formatDriverName(d.driver)).join(' and ');
    driverSentence = `The primary contributing factors are ${names}.`;
  } else if (subscores) {
    const sorted = Object.entries(subscores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([k]) => formatDriverName(k));
    if (sorted.length) driverSentence = `The highest-scoring dimensions are ${sorted.join(' and ')}.`;
  }

  // Confidence caveat
  const confidenceSentence =
    confidenceLabel === 'low'
      ? 'Data confidence is low this week; interpret this score with caution until more signal data is available.'
      : confidenceLabel === 'moderate'
      ? 'Data confidence is moderate — results are directionally reliable but may shift as more data accumulates.'
      : '';

  return [opening, trendSentence, driverSentence, confidenceSentence]
    .filter(Boolean)
    .join(' ');
}

function formatDriverName(key) {
  const labels = {
    recoveryDebt:            'Recovery Debt',
    focusErosion:            'Focus Erosion',
    coordinationFriction:    'Coordination Friction',
    responsivenessPressure:  'Responsiveness Pressure',
    collaborationWithdrawal: 'Collaboration Withdrawal',
    managerSupportGap:       'Manager Support Gap',
    workloadVolatility:      'Workload Volatility',
  };
  return labels[key] ?? key;
}
