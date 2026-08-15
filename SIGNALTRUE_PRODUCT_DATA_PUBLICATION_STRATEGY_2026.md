# SignalTrue Product, Data, and Publication Strategy

**Audit date:** June 11, 2026  
**Purpose:** Identify what SignalTrue can credibly publish to attract the market, what the current data can support, and what evidence should be collected before making predictive claims.

## Executive conclusion

SignalTrue has a strong product thesis: work-system strain becomes visible in collaboration metadata before it becomes obvious in surveys, delivery failures, or resignations. The product is differentiated by team-level analysis, within-team baselines, explainable signals, and an intended intervention loop.

The strongest market story is not another generic report about too many meetings. Microsoft, ActivTrak, Worklytics, Atlassian, and others already publish large descriptive benchmarks on meetings, focus time, and the workday. SignalTrue can own a more valuable question:

> **Which changes in team work patterns provide a reliable early warning, how early do they appear, and which low-risk interventions reverse them?**

The current production dataset cannot yet substantiate that claim. As of June 11, 2026, it is best described as an early pilot dataset with meaningful Microsoft calendar coverage but incomplete attribution, incomplete metric enrichment, no validated outcome labels, no intervention outcomes, and no records from the newest Engagement Strain pipeline.

The recommended publication sequence is:

1. Publish a transparent methods and pilot protocol paper first.
2. Run a prospective 12- to 26-week validation study pairing metadata signals with survey and delivery outcomes.
3. Publish a flagship lead-lag report: **Before the Survey Moves**.
4. Build an annual benchmark only after multi-organization coverage and data-quality thresholds are met.
5. Publish an intervention effectiveness report once there are at least 100 completed, consistently measured interventions.

## 1. What the product really is

SignalTrue is most compelling as **work-system observability for organizations**. It is not primarily an engagement platform and should not compete on a single wellbeing score.

The product observes three layers:

| Layer | Product question | Current examples |
|---|---|---|
| Demand | How much coordination and response demand is entering the system? | Meeting load, attendee-hours, messages, response pressure, workload volatility |
| Recovery | Is work consuming time and attention needed to recover? | After-hours activity, back-to-back meetings, fragmented days, focus availability |
| Flow | Is coordination helping work move, or creating drag? | Reciprocity, collaboration breadth, task aging, WIP, reopen loops, cycle time |

Its intended value loop is stronger than a dashboard:

1. Observe metadata.
2. Establish a team-specific baseline.
3. Detect sustained deviation.
4. Explain the drivers and confidence.
5. Recommend a reversible structural action.
6. Re-measure the same metrics after 14 days.
7. Learn which actions work in which conditions.

The final two steps are the potential category-defining advantage. They are modeled in `Action` and `Intervention`, but there is not yet production evidence in those collections.

## 2. Product strengths

### Strong conceptual strengths

- **Within-team baselines:** The 42-day median and MAD approach is more defensible than comparing every team to a universal norm.
- **Explainability:** Scores can be decomposed into metric changes, subscores, patterns, confidence, and recommended actions.
- **Metadata-first design:** The central proposition does not require semantic analysis of employee conversations.
- **Longitudinal structure:** Daily metrics, weekly scores, scoring versions, and intervention rechecks can support serious panel research.
- **Multi-source architecture:** Calendar, messaging, email, task, documentation, and CRM event types can eventually connect work demand to work outcomes.
- **Privacy controls:** Minimum group sizes, per-metric contributor thresholds, and concentration flags are present in the newest pipeline.

### Strong market fit

The product addresses a real executive blind spot: leaders see employee sentiment late and operational failure even later. SignalTrue can show the structural conditions under which work is happening, while preserving a team-level view.

The best buyers and publication hooks are:

| Audience | Question that earns attention |
|---|---|
| CEO / COO | Which work patterns predict slower delivery or loss of capacity? |
| CHRO / People leader | Which operating conditions move before engagement or strain surveys? |
| Team leader | What should we change this week, and did it work? |
| IT / Security / Works council | Can this be useful without becoming employee surveillance? |

## 3. Current production data inventory

This is an aggregate audit of the connected database. No customer names or individual identities are included.

### Dataset size as of June 11, 2026

| Asset | Current volume | Research readiness |
|---|---:|---|
| Organizations | 5 | Mostly setup/demo organizations; one has active connected event data |
| Teams | 10 | Team-size metadata is missing across the current records |
| Work events | 1,090 | Useful pilot material, but requires cleaning and deduplication |
| Outlook meeting records | 847 | Represents about 251 user-independent meeting IDs |
| Teams message records | 243 | Almost entirely unattributed and missing required thread/channel enrichment |
| Integration daily metric records | 699 | 591 contain no contributing source; only 108 processed any events |
| Engagement team daily records | 0 | New scoring pipeline is not producing data |
| Engagement baselines | 0 | No valid 42-day baselines yet |
| Engagement strain weekly records | 0 | No publishable strain history |
| Actions | 0 | No product learning data |
| Interventions | 0 | No measured intervention outcomes |
| Category signals | 5 | All currently have confidence 0 |
| Generic signals | 4 | All currently have confidence 0 |
| Privacy suppressions | 376 | Primarily caused by missing team-size metadata reported as zero |

### Coverage and quality observations

- The 847 Outlook records correspond to approximately 251 meetings, or 3.37 stored attendee-copies per meeting on average.
- Six stored meeting copies exceed 12 hours; the longest is nine days. These require all-day and malformed-duration filtering.
- Recurrence metadata is absent from all current Outlook records, so recurring-meeting burden cannot yet be measured.
- Only 2 of 243 Teams message records currently have both actor and team attribution.
- Teams message records do not currently populate the channel type, channel hash, or reply fields required for response latency, reciprocity, public/private ratio, and collaboration breadth.
- One team has 13 days with at least eight active calendar contributors. The new baseline requires at least 20 active days, so it cannot yet produce a valid baseline.
- The latest integration coverage record reports only one mapped user out of 92 users for each Microsoft integration, although historical events contain more actor references. Coverage semantics need to be made consistent.
- `RCI` is non-zero on every daily metric record, including no-data records. `WAP` and `PIS` are exactly 50 on every record. Neutral defaults must not be presented as observations.

### What the current data can support

After cleaning, the current data can support:

- A private pilot diagnostic.
- A design-partner case study with careful, descriptive language.
- A technical methods article about architecture, privacy, baselines, and limitations.
- A research protocol announcing what SignalTrue intends to validate.

It cannot yet support:

- An industry benchmark.
- A causal claim.
- A claim that a score predicts burnout, attrition, or delivery failure.
- A quantified ROI claim.
- A validated comparison between teams, functions, industries, or company sizes.
- A report on intervention effectiveness.

## 4. Evidence and implementation risks to resolve

### 4.1 Duplicate and compounded meeting measurement

Microsoft calendar ingestion intentionally stores one event per internal attendee. That can be useful for per-person load, but downstream logic must distinguish:

- unique meeting count,
- attendee-hours,
- per-person meeting hours, and
- organization-wide calendar load.

The current daily metric service counts attendee-copies as meetings. The newer engagement aggregation also calculates attendee-hours by multiplying attendee-copies by attendee count, which can compound the load. Every publication metric needs a canonical grain and a tested formula.

### 4.2 The newest scoring pipeline is not operational

The weekly scheduler queries `Team.find({ isActive: true })`, but the Team schema has no `isActive` field. The daily Engagement Strain aggregation is also not called by the integration scheduler. This explains the empty daily, baseline, and weekly engagement collections.

### 4.3 Proxy reuse weakens construct validity

Several Engagement Strain components reuse one available metric as a proxy for multiple concepts. Examples include:

- after-hours email as a proxy for general after-hours activity and recovery gaps,
- average attendee count as a proxy for cross-team meeting ratio,
- P90 response time as a proxy for response-time volatility,
- unique collaborators as both collaboration breadth and cross-team interaction,
- general meeting load and response time as manager-specific measures.

This is acceptable for an early directional product, but not for a validation paper unless the proxy status is explicit and sensitivity analyses are included.

### 4.4 Missing outcomes prevent predictive validation

The system has no current records for turnover, absence, delivery reliability, validated survey measures, or intervention outcomes. The outcomes endpoint describes correlation but returns hard-coded multipliers, and the Team schema does not define the `outcomeHistory` field used by that endpoint.

### 4.5 Privacy claims and storage need alignment

Public documentation says individual data is never stored or calculated. The WorkEvent schema stores `actorUserId`, `targetUserId`, normalized organizer/sender emails, attendee emails, and per-person event copies. That is pseudonymized or identifiable source data used for aggregation, not “no individual data.”

The accurate claim is closer to:

> Individual-level metadata is processed transiently or in a restricted event layer to create team aggregates. Individual analytics and individual scores are not exposed to customers.

Before a privacy whitepaper, reduce stored identifiers, hash or tokenize identities consistently, remove unnecessary email fields, document retention, test deletion, and reconcile the minimum group size of 5 in older documentation with 8 in the new privacy gate.

The retention purge also queries `occurredAt` for WorkEvent, while WorkEvent stores `timestamp`. This prevents the intended raw-event deletion and likely explains records older than the documented 90-day retention period.

### 4.6 Unsupported claims create reputational risk

Current product text contains specific claims such as burnout within 4-6 weeks, attrition risk doubling, 15% weekly risk increases, and fixed intervention effects. The database contains no evidence for those numbers. These should be removed or labeled as hypotheses until validated.

Use these language rules:

| Avoid | Use instead |
|---|---|
| “predicts burnout” | “is associated with work-pattern strain in prior research; SignalTrue validation is ongoing” |
| “attrition risk doubles” | “may warrant workload and retention review” |
| “burnout imminent above 65” | “elevated deviation from this team's baseline” |
| “this action will improve focus by 30%” | “intended metric movement: more protected focus time” |
| “caused improvement” | “was followed by improvement,” unless the design supports causality |

## 5. What the market already publishes

The market is crowded with large descriptive reports:

- Microsoft's 2025 Work Trend Index described the “infinite workday” using Microsoft 365 telemetry and surveys.
- ActivTrak's 2026 State of the Workplace report is based on more than 195,000 employees and emphasizes workday span, focus, and after-hours activity.
- Worklytics' 2025 productivity benchmarks analyze billions of collaboration events and publish meeting, focus-time, and cross-functional collaboration norms.
- Microsoft Viva Insights already provides organizational collaboration metrics with privacy thresholds and minimum group sizes.

SignalTrue should not try to beat these companies on dataset scale. It should beat them on a tighter research question and a more useful loop:

> **leading signal -> confidence -> intervention -> measured outcome**

This is the opening for a smaller company to publish something more interesting than a large collection of averages.

## 6. Ranked publication opportunities

Scores are 1-10. “Readiness” reflects the product and data as of June 11, 2026.

| Rank | Publication concept | Market interest | Product fit | Current readiness | Strategic value |
|---:|---|---:|---:|---:|---|
| 1 | **Before the Survey Moves** | 10 | 10 | 2 | Proves the core early-warning promise |
| 2 | **What Actually Restores Focus** | 10 | 10 | 1 | Converts recommendations into proprietary evidence |
| 3 | **The Coordination Debt Curve** | 9 | 9 | 4 | Connects meetings to lost flow and execution |
| 4 | **Privacy Without Blindness** | 8 | 10 | 6 | Opens IT, security, and works-council conversations |
| 5 | **The Manager Capacity Multiplier** | 8 | 8 | 3 | Strong CHRO and leadership story |
| 6 | **The Hidden Strain Pattern** | 8 | 9 | 3 | Memorable category narrative, but needs validation |
| 7 | **Annual Work Signals Benchmark** | 7 | 8 | 1 | Valuable later, but scale-dependent and crowded |

### Concept 1: Before the Survey Moves

**Proposed title:**  
**Before the Survey Moves: Which Team Work Signals Change First?**

**Core research question:** Do changes in recovery, focus, coordination, response pressure, and collaboration appear one to six weeks before validated team survey changes or delivery deterioration?

**Why this is the flagship:** It directly proves why SignalTrue should exist. A credible result such as “three signal families moved two weeks before the team pulse” is more valuable than “people have too many meetings.”

**Data required:**

- Team-week metadata for at least 50 teams, preferably 100+.
- At least 16 weeks, preferably 26 weeks.
- A weekly or biweekly validated pulse, such as UWES-3 for engagement plus short items for workload sustainability and detachment.
- Delivery labels from Jira, Asana, Linear, or customer operational systems.
- Calendar events for holidays, launches, planning weeks, incidents, and reorganizations.

**Analysis:** Mixed-effects longitudinal models, within-team normalization, lagged features, holdout organizations, calibration curves, and sensitivity tests. Report effect sizes and uncertainty, not only significance.

**Potential headline, only if the data supports it:**  
“Recovery and focus signals moved 2-3 weeks before team-reported strain, while raw activity volume did not.”

### Concept 2: What Actually Restores Focus

**Proposed title:**  
**What Actually Restores Focus: Evidence from 14-Day Team Interventions**

**Core research question:** Which reversible changes most consistently improve the metric they target?

Candidate interventions:

- Remove or shorten low-value recurring meetings.
- Add 10- or 15-minute meeting buffers.
- Protect two focus blocks per week.
- Introduce quiet hours or delayed-send norms.
- Clarify escalation and response expectations.
- Restore manager 1:1 cadence.

**Best study design:** A stepped-wedge cluster trial or randomized encouragement design. If customers choose their own interventions, use matched controls and difference-in-differences, with cautious causal language.

**Minimum useful evidence:** 100 completed interventions across at least 20 organizations, with baseline, 14-day, and 28-day measurements and an adherence check.

**Why it creates a moat:** Competitors can copy a meeting-load chart. A proprietary action-outcome dataset is harder to copy and makes the product more useful over time.

### Concept 3: The Coordination Debt Curve

**Proposed title:**  
**The Coordination Debt Curve: When Collaboration Starts Reducing Capacity**

**Core research question:** At what point do attendee-hours, recurring meeting burden, fragmentation, and messaging demand stop supporting execution and begin correlating with slower cycle time, more work aging, or more after-hours spillover?

This should focus on nonlinear thresholds and combinations, not universal claims such as “more than X meetings is bad.” Compare every team primarily with its own history, then show role- or function-specific distributions.

**Required addition:** A functioning Jira/Asana/Linear outcome connector. Without execution data, this becomes another meeting-overload report.

### Concept 4: Privacy Without Blindness

**Proposed title:**  
**Privacy Without Blindness: A Technical Method for Team-Level Work Signals Without Content Analysis**

This can be the first publication after the privacy implementation is aligned with the documentation.

Include:

- Event allowlists by integration.
- Fields explicitly excluded.
- Identity tokenization and data-flow diagram.
- Aggregation grain and minimum group thresholds.
- Small-cell suppression and concentration detection.
- Retention and deletion tests.
- Role-based access and anti-weaponization controls.
- How LLMs are separated from raw events.
- Known limitations and threat model.

This is a trust paper, not a claim that the strain score is validated. It can help sales immediately with IT, legal, and employee representatives.

### Concept 5: The Manager Capacity Multiplier

**Proposed title:**  
**The Manager Capacity Multiplier: What Happens When Coordination Crowds Out Support**

Study manager meeting load, 1:1 consistency, cancellations, response latency, team focus, and delivery outcomes. The model must distinguish managers from other team members and measure actual manager-specific behavior; general team metrics cannot be reused as manager proxies.

### Concept 6: The Hidden Strain Pattern

**Proposed title:**  
**Responsive but Running on Empty: The Hidden Strain Pattern in Modern Teams**

The memorable hypothesis is that some teams maintain fast response and visible activity while recovery and focus deteriorate. This is a strong narrative, but “Hidden Strain” must be validated against independent outcomes rather than defined only by SignalTrue's own score.

## 7. Recommended flagship study design

### Study objective

Estimate whether privacy-preserving team work signals provide useful, incremental warning of future team-reported strain and execution drag.

### Cohort

- 10-20 organizations.
- 50-150 teams.
- Minimum eight active contributors per reported team.
- 16-26 weeks of observation.
- Multiple functions: engineering, product, sales, marketing, operations, support.
- Record remote, hybrid, and office policy as context, not as an outcome.

### Unit of analysis

Use **team-week** as the primary research unit. Keep daily data for feature construction and quality checks.

### Signal families

Publish raw, interpretable families before publishing one composite score:

1. Recovery: after-hours ratio, weekend activity, short overnight recovery gaps.
2. Focus: protected 90-minute blocks, fragmented-day ratio, back-to-back load.
3. Coordination: attendee-hours, recurring burden, meeting concentration, cross-team ratio.
4. Responsiveness: inbound demand, P50/P90 response time, after-hours responses, burstiness.
5. Collaboration: unique collaborators, reciprocity, public/private balance, concentration.
6. Manager support: manager-specific 1:1 rhythm, cancellations, meeting load, response time.
7. Flow: WIP, task aging, reopen rate, cycle time, completion-to-interruption ratio.

### Outcome measures

Use at least one independent label in each category:

| Outcome family | Examples |
|---|---|
| Employee-reported | UWES-3 engagement; a validated exhaustion or detachment scale; workload sustainability pulse |
| Execution | Cycle time, work aging, reopen rate, missed sprint commitment, SLA breach |
| People | Voluntary turnover and absence at a sufficiently aggregated level |
| Manager validation | Structured weekly “signal accurate / inaccurate / context event” review |
| Intervention | Target metric at baseline, 14 days, and 28 days; action adherence |

Do not train or validate a “burnout” classifier unless the outcome is measured with an appropriate validated instrument and the ethical/legal use is tightly defined.

### Statistical approach

- Pre-register primary hypotheses and exclusions.
- Normalize primarily within team using past-only baselines.
- Prevent leakage: never let future data enter a baseline or feature.
- Use mixed-effects models with organization and team effects.
- Test 1-, 2-, 3-, 4-, and 6-week lags.
- Compare against simple baselines: prior survey score, meeting hours only, and activity volume only.
- Hold out complete organizations for external validation.
- Report discrimination, calibration, effect sizes, confidence intervals, and false-alert rate.
- Separate exploratory pattern discovery from confirmatory validation.
- Treat holidays, incidents, launches, onboarding, and reorgs as context variables.
- Publish null findings. They increase trust and prevent overfitting the story.

## 8. Minimum publishable data standard

Do not include a team-week in a public analysis unless all applicable rules pass:

1. At least eight active contributors for the week.
2. At least five contributors for each displayed metric.
3. At least 20 active days in the past-only baseline window.
4. Integration coverage above a declared threshold.
5. No single contributor accounts for more than 40% of a sensitive metric, or the cell is flagged/suppressed.
6. Meeting records are deduplicated to the correct grain.
7. All-day, cancelled, malformed, and implausibly long events are handled explicitly.
8. Missing data remains missing; it is not converted to a neutral score.
9. Every score carries a scoring version and data-quality version.
10. Every published result passes k-anonymity/small-cell rules across organization, function, and team-size cuts.

### Public data product

Publish aggregated benchmark tables and a synthetic sample dataset, not raw event data.

Recommended release package:

- Research paper PDF.
- Methods appendix.
- Metric dictionary with formulas and directionality.
- Cohort and exclusion flowchart.
- Aggregate CSV by function and team-size band where cell sizes permit.
- Synthetic team-week dataset for reproducibility examples.
- Model card with intended use, prohibited use, limitations, and validation dates.
- Interactive benchmark explorer that never exposes customer-level cells.

## 9. What to publish now

### Immediate publication: methods and research agenda

**Title:**  
**From Activity Exhaust to Work Signals: A Privacy-Preserving Research Framework for Organizational Drift**

This paper should clearly distinguish:

- research-backed constructs,
- SignalTrue's operational definitions,
- current proxies,
- hypotheses not yet validated,
- privacy controls,
- planned validation design.

It can include a small descriptive pilot appendix after the event data is cleaned, but it should not present the current composite scores as validated.

### Immediate commercial asset: design-partner brief

**Title:**  
**The SignalTrue Work Signals Study: Founding Cohort 2026**

Offer participants:

- a private baseline report,
- a privacy and works-council pack,
- a research-quality data-quality report,
- quarterly benchmark access,
- a co-designed intervention test,
- early access to the final findings.

This turns the publication plan into a customer acquisition mechanism.

## 10. Publication roadmap

### Phase 0: Evidence cleanup, 0-6 weeks

- Fix meeting grain and duplicate handling.
- Fix Teams user/team attribution and required message metadata.
- Populate recurrence, cancellation, reschedule, meeting type, and internal attendee fields.
- Wire daily Engagement Strain aggregation into the scheduler.
- Remove the nonexistent `isActive` filter or add a real lifecycle field.
- Fix retention deletion to use WorkEvent `timestamp`.
- Make team size derive from the directory and/or observed active contributors.
- Replace no-data neutral scores with null plus a reason code.
- Add tests for every formula, privacy gate, and edge case.
- Freeze unsupported predictive and effect-size claims in product copy.

### Phase 1: Methods launch, 6-10 weeks

- Publish the methods paper and model card.
- Recruit the founding research cohort.
- Start validated surveys and context-event collection.
- Launch Jira/Asana/Linear outcome ingestion.
- Add explicit research consent and benchmark opt-in at organization level.

### Phase 2: First evidence, 4-6 months

- Publish 2-4 anonymized design-partner case studies.
- Report data coverage, false-alert rate, and manager-confirmed usefulness.
- Publish descriptive distributions by function only where sample sizes permit.
- Avoid industry rankings and causal language.

### Phase 3: Flagship report, 6-9 months

- Publish **Before the Survey Moves** with pre-registered lead-lag results.
- Launch a benchmark explorer based on validated raw signal families.
- Use independent academic or statistical review before release.

### Phase 4: Proprietary action evidence, 9-15 months

- Publish **What Actually Restores Focus**.
- Turn action-effectiveness estimates into product recommendations.
- Update recommendations by team context and evidence strength.

## 11. Proposed whitepaper outline

For the flagship report:

1. The visibility gap: why surveys and operational failures arrive late.
2. Research question and pre-registered hypotheses.
3. Privacy-preserving data architecture.
4. Cohort, observation period, and exclusions.
5. Metric definitions and baseline method.
6. Data quality and missingness.
7. Which signals moved first.
8. Lead time and false-alert tradeoffs.
9. Differences by function and team context.
10. What did not predict the outcomes.
11. Intervention examples.
12. Limitations and prohibited uses.
13. Practical playbook for leaders.
14. Methods appendix and model card.

## 12. The single best “wow” result to pursue

The most valuable possible result is a validated warning window:

> **A combination of recovery loss, focus fragmentation, and coordination burden identified team-level deterioration two to four weeks before an independent survey or delivery outcome, with a known false-alert rate.**

That finding would be:

- novel enough for press and conference talks,
- directly tied to the product's buying reason,
- useful to CEOs and HR leaders,
- defensible because it uses independent outcomes,
- difficult for a dashboard-only competitor to copy,
- compatible with privacy-first positioning.

The second most valuable result is intervention evidence:

> **Specific reversible changes produced measurable improvement in the metric they targeted, and the effect persisted at 28 days.**

Together, those two results create a complete story: SignalTrue sees an important change early and helps leaders choose an action that is likely to work.

## 13. External reference points

- [Microsoft 2025 Work Trend Index: Breaking down the infinite workday](https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday)
- [ActivTrak 2026 State of the Workplace](https://www.activtrak.com/resources/reports/state-of-the-workplace/)
- [Worklytics 2025 productivity benchmarks](https://www.worklytics.co/resources/2025-productivity-benchmarks-knowledge-workers-teams-above-below-line)
- [Microsoft Viva Insights privacy guide](https://learn.microsoft.com/en-us/viva/insights/advanced/privacy/privacy)
- [Microsoft Research: Research-backed practices for better meetings](https://www.microsoft.com/en-us/research/articles/research-backed-practices-for-better-meetings/)
- [Schaufeli et al.: UWES-3 validation](https://pmc.ncbi.nlm.nih.gov/articles/PMC6161491/)
- [Bakker, Demerouti, and Sanz-Vergel: Job Demands-Resources theory](https://www.annualreviews.org/content/journals/10.1146/annurev-orgpsych-120920-053933)
- [European Data Protection Board, 2026 guidelines on personal-data processing for scientific research](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2026/guidelines-12026-processing-personal-data_en)

## Final recommendation

Do not publish an industry score or a “burnout prediction” report from the current dataset. Publish the methodology and founding research program, use it to recruit design partners, and build the first independent longitudinal evidence that work-pattern signals move before a meaningful outcome.

The category claim should be simple:

> **SignalTrue makes the operating conditions of work visible early enough to change them.**

The research program must then prove three things in order:

1. The signals are measured correctly.
2. They move before outcomes leaders care about.
3. Acting on them improves those outcomes or their leading conditions.
