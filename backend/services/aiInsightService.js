/**
 * AI Insight Service.
 *
 * Layers natural-language narration on top of the DETERMINISTIC engine outputs
 * (manager overload, flattening, ONA patterns). The engine decides; AI only
 * describes. Every call:
 *   - injects the compliance guardrail (EU AI Act Art. 5(1)(f): never infer an
 *     individual's emotional/psychological state; structural language only),
 *   - requests strict JSON, validates it, and
 *   - falls back to a deterministic template on any failure.
 *
 * See docs/PIVOT_REPORT_SPEC.md §6 / §5.5.
 */

import getProvider from '../utils/aiProvider.js';
import { incrementUsage } from '../utils/aiUsage.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const GUARDRAIL =
  'You describe STRUCTURAL work conditions only (workload, span of control, ' +
  'coordination load, communication topology). You must NEVER infer or mention ' +
  'an individual person\'s emotions, mental health, burnout, or psychological ' +
  'state — this is prohibited (EU AI Act Art. 5(1)(f)). Refer to people only by ' +
  'role, never by name or id. Output STRICT JSON matching the requested shape, ' +
  'no prose outside the JSON.';

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Executive headline sentence from the flattening + top-manager summary.
 * @returns {{sentence:string, source:'ai'|'fallback'}}
 */
export async function generateHeadline(summary) {
  const fallback = headlineFallback(summary);
  const prompt =
    `Given this org summary JSON, write ONE sentence naming the cause ` +
    `(manager/span overload), how many managers are affected, and that it is a ` +
    `leading indicator of manager attrition. Return {"sentence": "..."}.\n` +
    JSON.stringify(summary);
  const out = await callJson(prompt, ['sentence']);
  return out ? { sentence: String(out.sentence).slice(0, 280), source: 'ai' } : { sentence: fallback, source: 'fallback' };
}

/**
 * Narrate + hypothesize + recommend for each ONA pattern.
 * @param {Array} patterns
 * @returns {Array} enriched patterns (always returns one entry per input)
 */
export async function narratePatterns(patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) return [];
  const prompt =
    `For each pattern in this JSON array, add a one-sentence "plainEnglish" ` +
    `description, a "hypothesis" for the likely STRUCTURAL cause, and a ` +
    `"recommendedAction" (a reversible structural move). Keep role labels; never ` +
    `name individuals. Return {"patterns":[{"patternType","plainEnglish","hypothesis","recommendedAction"}]}.\n` +
    JSON.stringify(patterns.map((p) => ({ patternType: p.patternType, evidence: p.evidence, scope: p.scope })));
  const out = await callJson(prompt, ['patterns']);
  const byType = new Map();
  if (out?.patterns) for (const p of out.patterns) byType.set(p.patternType, p);

  return patterns.map((p) => {
    const ai = byType.get(p.patternType);
    return {
      ...p,
      plainEnglish: ai?.plainEnglish || p.plainEnglish,
      hypothesis: ai?.hypothesis || patternHypothesisFallback(p),
      recommendedAction: ai?.recommendedAction || patternActionFallback(p),
      source: ai ? 'ai' : 'fallback',
    };
  });
}

/**
 * Non-prescriptive 1:1 discussion prompts from drivers. Workload/structure only.
 * @returns {{questions:string[], source:'ai'|'fallback'}}
 */
export async function generateDiscussionPrompts(drivers) {
  const fallback = promptsFallback(drivers);
  const prompt =
    `From these structural drivers, write 3 diagnostic, non-prescriptive ` +
    `questions a leader could ask in a 1:1 about WORKLOAD and STRUCTURE (never ` +
    `feelings or mental state). Return {"questions":["...","...","..."]}.\n` +
    JSON.stringify(drivers || []);
  const out = await callJson(prompt, ['questions']);
  return out?.questions?.length
    ? { questions: out.questions.slice(0, 4).map(String), source: 'ai' }
    : { questions: fallback, source: 'fallback' };
}

// ── Provider call + JSON validation ──────────────────────────────────────────────

async function callJson(prompt, requiredKeys) {
  if (!hasProviderKey()) return null;
  try {
    const provider = getProvider();
    const completion = await provider.generate({
      prompt: `${GUARDRAIL}\n\n${prompt}`,
      model: MODEL,
      max_tokens: 600,
    });
    const text = completion?.choices?.[0]?.message?.content || '';
    if (completion?.usage) {
      incrementUsage({
        model: MODEL,
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      }).catch(() => {});
    }
    const parsed = extractJson(text);
    if (!parsed) return null;
    for (const k of requiredKeys) if (!(k in parsed)) return null;
    return parsed;
  } catch (err) {
    console.warn('[aiInsightService] AI call failed, using fallback:', err.message);
    return null;
  }
}

function hasProviderKey() {
  const p = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (p === 'anthropic' || p === 'claude') return !!process.env.ANTHROPIC_API_KEY;
  return !!process.env.OPENAI_API_KEY;
}

function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Deterministic fallbacks ──────────────────────────────────────────────────────

function headlineFallback(s) {
  const inStrain = s?.managersInStrain ?? 0;
  const total = s?.totalScoredManagers ?? s?.activeManagers ?? 0;
  if (!total) return 'Not enough mapped manager data yet to assess span and coordination overload.';
  return (
    `${inStrain} of ${total} managers are carrying span and coordination load above ` +
    `their own baseline — the structural pattern that precedes manager attrition.`
  );
}

function patternHypothesisFallback(p) {
  switch (p.patternType) {
    case 'coordination_bottleneck':
      return 'Coordination is routing through one role, likely after a span increase or a coverage gap.';
    case 'key_person_dependency':
      return 'Work depends on a single role with no redundant path — a structural single point of failure.';
    case 'siloing':
      return 'Cross-team interaction has thinned, likely from reorg or unclear interfaces.';
    case 'reciprocity_collapse':
      return 'Communication has become one-directional, often an early withdrawal signal.';
    case 'after_hours_cascade':
      return 'Demand is spilling past working hours at a structural level, eroding recovery.';
    case 'role_brokerage_concentration':
      return 'One layer absorbs most brokerage, concentrating coordination risk.';
    default:
      return 'Structural coordination pattern detected.';
  }
}

function patternActionFallback(p) {
  switch (p.patternType) {
    case 'coordination_bottleneck':
      return 'Reassign one decision right or redistribute reports to relieve the bottleneck role.';
    case 'key_person_dependency':
      return 'Add a documented backup path / secondary owner for the key role.';
    case 'siloing':
      return 'Restore one recurring cross-team sync or a shared planning ritual.';
    case 'reciprocity_collapse':
      return 'Restore manager 1:1 cadence and clarify response expectations.';
    case 'after_hours_cascade':
      return 'Introduce quiet hours / delayed-send norms and review escalation paths.';
    case 'role_brokerage_concentration':
      return 'Distribute cross-team coordination across more roles.';
    default:
      return 'Review workload distribution and coordination structure.';
  }
}

function promptsFallback(drivers) {
  const top = (drivers || [])[0]?.key;
  const base = [
    'Which recurring meetings this week were essential vs. could be delegated or dropped?',
    'Where is coordination load concentrating, and can a decision right move closer to the work?',
    'Is the current number of direct reports sustainable for the coordination this team needs?',
  ];
  if (top === 'oneOnOneSupport')
    base.unshift('Has 1:1 time per report held steady, or is calendar pressure compressing it?');
  return base.slice(0, 4);
}

export default {
  generateHeadline,
  narratePatterns,
  generateDiscussionPrompts,
};
