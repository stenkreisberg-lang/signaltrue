# SignalTrue — Pivoted Report & Intelligence Spec (Manager / Systemic Overload)

**Audience:** engineering. **Goal:** rebuild the weekly brief around *manager / systemic overload* (cause), not *burnout* (symptom). Every section below gives: purpose, on-screen copy, the formula behind it, the chart spec, and where AI is used.

**Plug-in points (existing code):**
`backend/services/engagementSubscoreService.js`, `engagementScoringService.js`, `engagementPatternService.js`, `engagementRecommendationService.js`, `engagementExplanationService.js`, `engagementWeeklyEmailService.js`, `utils/privacyGate.js`, models under `backend/models/`.

---

## 0. Global principles (apply everywhere)

1. **Canonical grain.** Deduplicate meetings to *unique meeting* before any org-level metric. Keep attendee-copies only for per-person load. Never multiply attendee-copies × attendee count.
2. **Privacy / EU AI Act line.** We measure **structural conditions**, never infer an individual's emotional/psychological state. No section may output an individual-level emotion/burnout label. All copy uses workload/structure language (see §9).
3. **Suppression first.** Render nothing for a cell that fails the privacy gate (§9). A suppressed cell shows a reason code, not a score.
4. **Missing ≠ neutral.** If a metric has no data, emit `null` + reason code. Never default to 50 / 0 and present it as an observation.
5. **Every output carries** `scoringVersion`, `dataQualityVersion`, and a `confidence` enum (`high|medium|low`) derived from coverage (§1.4).

---

## 1. Data models to add / change

### 1.1 `OrgStructure` (NEW — unblocks the entire pivot)
```
OrgUnit {
  _id, orgId,
  personHash: string,        // pseudonymized id (HMAC, see §9)
  managerHash: string|null,  // reportsTo
  role: string,              // e.g. "EM","IC","Director","PM"
  roleLevel: int,            // 0=IC ... n=exec
  teamId,
  isManager: boolean,
  effectiveFrom, effectiveTo // history, for span trend
}
```
Source: HRIS/Directory connector (SCIM, Google Directory, Entra ID), or inferred fallback (a person who is the modal organizer/approver for a stable set of reports).

### 1.2 `ManagerWeekly` (NEW — per-manager metrics, replaces team proxies)
```
ManagerWeekly {
  orgId, managerHash, teamId, weekStart, scoringVersion,
  span: int,                 // # direct reports active this week
  spanBaselineMedian, spanBaselineMAD,
  coordinationLoadHours,     // manager's own meeting+sync hours
  oneOnOneMinutesPerReport,
  responseLatencyP50Min, responseLatencyP90Min,
  afterHoursActivityRatio,
  decisionConcentration,     // see §3.6
  brokerageScore,            // ONA betweenness, §5
  spanOverloadIndex,         // §3.5  (0-100)
  riskState, trend, confidence,
  drivers: [{key, score, direction, evidence}],
  dataCoverageRatio
}
```

### 1.3 `Intervention` / `Outcome` (EXISTS but empty — wire it)
Ensure `Action`, `Intervention`, `teamAction`, and a real `outcomeHistory` field on team/manager are populated. Add `OutcomeConnector` ingest (Jira/Linear cycle time; HRIS voluntary attrition; absence). Remove hard-coded multipliers in the outcomes endpoint.

### 1.4 Coverage → confidence
```
coverage = mappedActiveUsers / max(teamMembers, 1)
confidence = high   if coverage >= 0.7 && activeDaysInBaseline >= 20
           = medium if coverage >= 0.4
           = low    otherwise
```

---

## 2. Core math (shared helpers)

### 2.1 Robust baseline (already used — keep)
Per team/manager/metric over a **past-only** 42-day window:
```
median_b = median(values)
MAD      = median(|value_i - median_b|)
sigma    = 1.4826 * MAD          // robust std estimate; if 0, fall back to IQR/ or mark low-variance
```

### 2.2 Robust deviation score (z-equivalent)
```
z = (value - median_b) / max(sigma, epsilon)        // epsilon guards divide-by-zero
```

### 2.3 Metric risk 0–100 (directional)
`risk()` for metrics where *higher = worse* (e.g. after-hours, span, latency):
```
risk = clamp( 50 + 12.5 * z , 0, 100 )      // z=0 →50, z=+4 →100
```
`riskInverse()` for metrics where *lower = worse* (e.g. 1:1 minutes, focus blocks):
```
riskInverse = clamp( 50 - 12.5 * z , 0, 100 )
```

### 2.4 Risk state + trend
```
state = Healthy <40 | Watch 40-59 | Strain 60-79 | Critical >=80
trend = improving (Δ <= -5) | stable (-5..+5) | worsening (+5..+8) | accelerating (>+8)   // Δ vs prior week
```

---

## 3. Signals & formulas

### 3.1 Keep the 7 Engagement Strain subscores (team level)
Recovery Debt (20%), Focus Erosion (18%), Coordination Friction (17%), Responsiveness Pressure (14%), Collaboration Withdrawal (12%), Manager Support Gap (11%), Workload Volatility (8%). Composite:
```
strainRisk = Σ (weight_i * subscore_i)
```

### 3.2 Recovery Debt
```
recoveryDebt = 0.5*risk(afterHoursActivityRatio)
             + 0.3*risk(weekendActivityRatio)
             + 0.2*riskInverse(overnightGapHours)   // gap between last & first activity
```

### 3.3 Focus Erosion
```
focusErosion = 0.5*riskInverse(protected90minBlocksPerWeek)
             + 0.3*risk(fragmentedDayRatio)         // days with >N context switches
             + 0.2*risk(backToBackMeetingRatio)
```

### 3.4 Coordination Friction
```
coordinationFriction = 0.4*risk(attendeeHoursPerPerson)   // dedup grain!
                     + 0.3*risk(recurringMeetingBurden)
                     + 0.3*risk(crossTeamMeetingRatio)
```

### 3.5 **Span Overload Index (NEW — flagship per-manager signal)**
```
SOI = 0.35*risk(span)                         // vs manager's own span baseline
    + 0.25*risk(coordinationLoadHours)
    + 0.20*riskInverse(oneOnOneMinutesPerReport)
    + 0.20*risk(decisionConcentration)
```
Manager risk state via §2.4. `span` deviation is computed against the manager's **own** 42-day baseline AND flagged against an absolute band (warn ≥ 10, high ≥ 15, severe ≥ 20 reports — from 2025 norms).

### 3.6 Decision / coordination concentration
Share of the team's coordination edges that route through the manager:
```
decisionConcentration = managerBetweenness / Σ(teamBetweenness)   // 0..1, from ONA graph §5
```

### 3.7 **Flattening Signal (NEW — org level)**
```
reportsPerManager      = activeNonManagers / activeManagers
flatteningDelta        = reportsPerManager - reportsPerManager_baseline(13wk)
managersAboveThreshold = count(managers where span >= 12) / activeManagers
```
Surface as a trend + “N of M managers above healthy span.”

---

## 4. Report layout (top → bottom) with copy, formulas, charts, AI

> Order changed: **lead with the manager/cost finding; demote data-mapping to footer.**

### SECTION A — Executive headline (NEW lead)
**Purpose:** one fundable sentence: cause + manager + cost.
**Copy template:**
> **{{managersInStrain}} of your {{totalManagers}} managers are carrying span + coordination load above their own baseline — the structural pattern that precedes manager attrition.**
> Estimated exposure: **{{estRegrettedExits}} regretted manager departure(s)** (~{{estCost}}).
> Status: **{{orgRiskState}}** · Trend **{{trend}}** · Confidence **{{confidence}}**.

**Formula (cost):**
```
estRegrettedExits = Σ over managers in Critical/Strain of P(exit | SOI)   // calibrated; until calibrated use band, not point
estCost = estRegrettedExits * avgManagerReplacementCost   // config per org; default 1.5x salary
```
**Chart:** none (headline) + 3 KPI tiles: SOI org avg (gauge), managers in strain (count), flattening delta (sparkline).
**AI:** LLM writes the sentence from structured inputs; deterministic fallback template. Guardrail: structural language only.

### SECTION B — Structure & Span panel (NEW)
**Purpose:** answer "which managers, how overloaded."
**Copy:** “Reports per manager: **{{reportsPerManager}}** ({{flatteningDelta_signed}} vs 13-wk baseline). **{{managersAboveThreshold}}** managers above a healthy span (≥12).”
**Table (per manager, suppression-gated):** Manager (role label, not name) · Span · Δ span · Coordination load (h) · 1:1 min/report · SOI · State.
**Formulas:** §3.5, §3.7.
**Charts:**
- **Scatter:** x = span, y = coordinationLoadHours, dot color = SOI state, dashed lines at span=12 and load baseline. (“overload quadrant” top-right shaded.)
- **Span trend line:** reportsPerManager over 13 weeks with baseline band.
**AI:** pattern note — “Coordination load concentrates on {{role}} managers; the EM layer absorbs {{x}}% of cross-team brokerage.” (from §5).

### SECTION C — Communication patterns & bottlenecks (NEW — ONA/AI, see §5)
**Purpose:** show where work actually flows and where it jams, by role.
**Copy template (per detected pattern):**
> **{{patternTitle}}** — {{plainEnglish}}. Evidence: {{metrics}}. Likely structural cause: {{hypothesis}}.

**Charts:**
- **Network graph (force-directed):** nodes = pseudonymized people sized by weighted degree, colored by team, ring = manager; edges = interaction weight; **bottleneck nodes highlighted** (high betweenness). Only render nodes/edges in cells passing suppression; otherwise collapse to role aggregates.
- **Role heatmap:** rows = roles, cols = {brokerage, in-degree load, response latency, reciprocity}; cell color = risk 0–100.
**AI:** see §5.4 (detection = deterministic graph metrics; narration + cause hypothesis + fix = LLM).

### SECTION D — What changed (keep, fix denominators)
**Copy:** “{{metric}} changed {{pct}}% ({{from}}→{{to}}). {{interpretation}}.” with `CONFIDENCE` badge.
**Formula:** `pct = (to-from)/max(from, minBase)`. **Suppress if `from < minBase`** (e.g. messages 12→2 → hide, don’t flag).
**Chart:** week-over-week bar list with up/down arrows; green=healthy direction, red=concerning.
**AI:** one-line interpretation per row + alternative explanation (already implemented — keep the “alternative explanation” honesty).

### SECTION E — Why it matters (reframe to performance)
**Copy (performance, not wellbeing):**
> “Coordination overload on {{role}} managers is a **leading indicator of slower delivery and regretted attrition** — it appears in system behavior **{{leadWeeks}} weeks before** it shows in surveys or output.”
**Formula:** `leadWeeks` from validated lead-lag once available; until then label as “research-backed window (JD-R), SignalTrue validation ongoing.”
**Chart:** lead-lag timeline: signal line vs (future) outcome line with the warning window shaded.

### SECTION F — Recommended structural actions (reframe)
**Purpose:** replace meeting-hygiene tips with structural moves.
**Copy template (per action):**
> **{{actionTitle}}** — {{description}}. Intended metric movement: **{{targetMetric}} ↓/↑**. Reversible: {{yes/no}}. Effort: {{low/med}}.
**Action library (structural):** rebalance N reports off manager X · narrow span · reassign one decision right · restore 1:1 cadence · kill a recurring cross-team meeting · introduce delayed-send/quiet hours.
**Formula (targeting):** map each high subscore/pattern → eligible actions via rules in `engagementRecommendationService.js`; rank by `leverage = affectedManagers * expectedΔ * reversibility`.
**Chart:** none (action cards) + a small “expected effect” bar per action.
**AI:** LLM refines templated action into context-specific wording + predicts intended metric movement (NOT a guaranteed %). Deterministic fallback = template.

### SECTION G — Did it work? (NEW — closes the loop)
**Copy:** “Last time **{{pattern}}** appeared in a comparable team, after **{{action}}**, {{targetMetric}} moved {{Δ}} within 14 days.”
**Formula:** difference-in-differences vs matched control where available; else pre/post with caution language.
**Chart:** before/after dumbbell (baseline → 14d → 28d) for the targeted metric.
**AI:** summarize outcome history; flag when evidence is too thin to claim.

### SECTION H — Manager discussion prompts (keep)
Diagnostic, non-prescriptive questions for the 1:1. **AI-generated** from this week’s drivers; guardrail: questions about workload/structure, never about feelings/mental state.

### SECTION I — Data readiness (DEMOTE to footer)
Coverage, sources, mapped users/teams, suppression reasons. Confidence badge. Not the lead.

---

## 5. Communication-pattern & bottleneck engine (ONA + AI)

### 5.1 Build the graph (weekly)
- **Nodes** = `personHash` (from §1.1), attrs: teamId, role, managerHash, isManager. Only include nodes active this week.
- **Edges** from `WorkEvent` metadata:
  - meeting co-attendance → undirected edge, weight = shared meeting minutes
  - message reply / email → directed edge sender→recipient, weight = count; store response latency
- Aggregate per ordered pair; keep per-edge: `weight, p50LatencyMin, reciprocated(bool)`.

### 5.2 Graph metrics (deterministic — use a graph lib, e.g. graphology)
```
inDegree, outDegree (weighted)
betweenness   -> bottleneck/brokerage
reciprocity   = reciprocatedEdges / outEdges
clustering    = local clustering coefficient
crossTeamRatio = crossTeamEdges / totalEdges
articulationPoint (bool) -> key-person/single-point-of-failure
```

### 5.3 Named patterns (thresholds; tune on data)
| Pattern | Rule | Means |
|---|---|---|
| **Coordination bottleneck** | betweenness pctl ≥90 AND inDegree pctl ≥75 AND p90 latency rising | one node/role is the jam |
| **Key-person dependency** | articulationPoint AND high weighted degree | removal disconnects the team |
| **Siloing** | crossTeamRatio falling ≥2 wks AND below baseline | coordination breaking down |
| **Manager isolation** | manager↔reports edge weight below baseline | support gap forming |
| **Reciprocity collapse** | upward reciprocity falling | voice/Silence risk |
| **After-hours cascade** | share of edge weight after hours rising | boundary drift, structural |

### 5.4 Role-aware bottleneck rollup
```
for each role r:  roleBrokerage[r] = sum(betweenness of nodes with role r) / totalBetweenness
flag role if roleBrokerage[r] >= 0.5  ("the {{role}} layer absorbs {{x}}% of brokerage")
```

### 5.5 Where AI is used here
- **Detection = deterministic** (graph metrics + thresholds). Reproducible, auditable, EU-AI-Act-safe.
- **AI (LLM) does 3 things on top of the structured result:**
  1. **Narrate** the pattern in plain English from the metric JSON.
  2. **Hypothesize structural cause** (e.g. "EM betweenness spiked the week after Team B's manager left → coverage gap").
  3. **Recommend** the matching structural action.
- **Inputs to LLM:** only aggregate/role-level metrics + pattern flags + pseudonymous role labels above suppression threshold. **Never** raw messages, never individual emotional inference.
- **Output:** strict JSON `{title, plainEnglish, evidence[], hypothesis, recommendedActionId, confidence}`. Validate against schema; on failure use deterministic template.
- **Model:** a capable instruction model with structured-output/JSON mode (current repo uses `gpt-4o-mini`; a stronger model improves hypothesis quality). Keep deterministic fallback for every AI call.

---

## 6. AI usage map (where & how, summary)

| Where | AI job | Input | Output | Fallback | Guardrail |
|---|---|---|---|---|---|
| §A headline | sentence gen | KPIs JSON | 1 sentence | template | structural language |
| §B span note | pattern note | manager/role metrics | 1–2 sentences | template | role-level only |
| §C patterns | narrate+hypothesize+recommend | graph metrics JSON | JSON (schema) | deterministic pattern text | no raw content, no emotion |
| §D what changed | interpret + alt-explanation | metric deltas | 2 lines/row | rule text | confidence badge required |
| §E why it matters | contextualize | drivers + research refs | paragraph | static research text | "validation ongoing" |
| §F actions | refine + predict intended movement | subscores/patterns | action copy + target | template | "intended", never "will" |
| §G did it work | summarize outcomes | outcome history | paragraph | "insufficient evidence" | DiD caution |
| §H prompts | generate questions | drivers | 3–4 questions | static set | workload not feelings |

**AI infra requirements:** JSON-schema-validated outputs, deterministic fallback on every call, prompt + model + version logged per record, token/cost logging (`/api/ai-usage` exists), rate limiting.

---

## 7. Charts catalog (frontend: React + Recharts; network: react-force-graph / d3)

| Chart | Where | Type | Axes / encoding | Thresholds |
|---|---|---|---|---|
| KPI gauge | A | radial gauge | SOI 0–100 | 40/60/80 bands |
| Overload scatter | B | scatter | x=span, y=load, color=state | lines at span12 + load baseline |
| Span trend | B | line + band | weeks × reports/mgr | baseline ±MAD band |
| Network graph | C | force-directed | node size=degree, color=team, halo=bottleneck | top-decile betweenness highlighted |
| Role heatmap | C | heatmap | role × metric | risk 0–100 color ramp |
| WoW bars | D | horizontal bars | metric × %Δ | green=healthy, red=concerning |
| Lead-lag | E | dual line | weeks; signal vs outcome | shaded warning window |
| Effect bar | F | bar | expected Δ per action | — |
| Before/after dumbbell | G | dumbbell | baseline→14d→28d | — |
| Subscore bars | detail | horizontal bars | 7 subscores 0–100 | state colors |
| Sparklines | tiles | sparkline | last 8–12 wks | — |

Color tokens: Healthy=green, Watch=amber, Strain=orange, Critical=red, Suppressed=grey.

---

## 8. Pricing / packaging hook (small but required)
Change `backend/routes/billing.js` line item from fixed `quantity: 1` to **per-manager-monitored** (`quantity = activeManagers`), new Stripe price IDs. Surfaces the value unit the buyer funds.

---

## 9. Privacy / compliance guardrails (hard rules)

1. **Suppression gate** (`utils/privacyGate.js`): team min ≥ 8 contributors; per-metric min ≥ 5; flag/suppress if any single contributor > 40% of a metric. **Raise default `MIN_TEAM_SIZE` from 1.** Suppressed → no score rendered.
2. **Pseudonymization:** `personHash = HMAC_SHA256(orgSalt, userId)`; never store raw name/email in the analytics/graph layer; restrict raw event layer; encrypt OAuth tokens (fix the `SECRET_KEY`/`ENCRYPTION_KEY` mismatch).
3. **Tenant isolation:** apply `requireOrganizationAccess()` + team-ownership check to every `:orgId`/`:teamId` route (fixes IDOR).
4. **Language rules (EU AI Act Art. 5(1)(f)):** never output individual emotional/psychological state. Replace: "burnout/engaged/feeling" → "workload/structural overload/coordination load." All AI prompts include this constraint.
5. **No-data:** emit `null` + reason code; never neutral default presented as observation.
6. **Auditability:** every record carries scoring + data-quality version, inputs, and confidence.

---

## 10. Build order (acceptance criteria)

1. **Trust:** suppression gate enforced (no sub-min cell rendered); tiny-denominator alarms hidden; IDOR + token encryption fixed. *AC: 2-person/Unassigned never scored; cross-org read returns 403.*
2. **Pipeline live:** remove non-existent `isActive` filter; wire daily aggregation into scheduler; retention purge uses `timestamp`. *AC: engagement daily/weekly collections produce records.*
3. **Org structure + ManagerWeekly + SOI + Flattening signal.** *AC: per-manager SOI computed against own baseline; Section B renders.*
4. **ONA engine + patterns (§5).** *AC: bottleneck/role rollup produced; Section C renders with suppression.*
5. **Report reorder + reframed copy (§4).** *AC: headline = manager/cost; data-readiness in footer.*
6. **Outcome connector + loop (§1.3, §G).** *AC: action→outcome records; “did it work” populated.*
7. **AI layer with JSON schema + deterministic fallback (§6).** *AC: every AI call has validated output or fallback; prompts carry compliance guardrail.*
8. **Per-manager pricing (§8).**

---
*Scoring version target: 3.0.0. Keep deterministic-first; AI augments, never gates.*
