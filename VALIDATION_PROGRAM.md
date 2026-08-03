# SignalTrue Validation Program

Last reviewed: 2026-08-03

## Purpose

This program tests SignalTrue's implementation rather than borrowing certainty from related
research. Research may justify a construct or method. Only SignalTrue-specific evidence can
support a claim about SignalTrue's connector accuracy, model validity, forecast performance, or
intervention effectiveness.

The application exposes the program at `/app/validation`. Aggregate study evidence is stored with
the claim it supports and the claim it does not support.

## Study statuses

| Status | Meaning |
| --- | --- |
| Planned | Research question exists; no approved protocol is represented |
| Protocol ready | Versioned protocol, outcomes, analysis, and stop rules are specified |
| Collecting | Data collection is active under the versioned protocol |
| Analyzing | Collection is closed or paused while pre-specified analysis is performed |
| Completed | At least one evidence record is verified and a public result and limitations are published |
| Paused | The study cannot continue under the current protocol or safeguards |

`Completed` does not mean every metric is validated. The public summary must state the population,
model version, supported claim, unsupported claim, uncertainty, and limitations.

## Evidence contract

Each aggregate evidence record requires:

- study and metric identifiers;
- exact data definition and source systems;
- period and aggregate sample counts;
- result, unit, denominator, and interval where appropriate;
- product/model version;
- the claim supported by the result;
- the claim explicitly not supported by the result;
- internal or external evidence level;
- external organization and public report URL for evidence labelled external; and
- pending, verified, or rejected review status.

No names, email addresses, message content, individual scores, or individual network positions are
permitted in validation evidence.

## Progressive studies

### 1. Connector accuracy and reconciliation

Design: Compare normalized SignalTrue records with source-of-truth exports using matched record
definitions, identifiers, timestamps, timezones, and deduplication rules.

Required outputs: missing-record rate, duplicate rate, count agreement, timestamp agreement, sync
delay distribution, known exclusions, and results by connector/version.

Completion gate: The reconciliation protocol and test set are versioned, discrepancies are
classified, and verified aggregate results are published. Mapping coverage alone is not accuracy.

### 2. Reliability and missing-data sensitivity

Design: Re-run deterministic calculations on identical snapshots; test baseline stability and
progressively remove sources, people mappings, days, and teams from complete datasets.

Required outputs: repeatability, sensitivity curves, baseline stability, suppression behavior, and
minimum-data rules. Universal cutoffs must not be selected after viewing favorable results.

Completion gate: Results identify when each metric is reproducible, unstable, or suppressed.

### 3. Metadata versus validated survey constructs

Design: Pre-register hypotheses linking named metadata measures to an appropriately licensed and
validated survey instrument. Use team-level analysis and preserve null and contradictory results.

Required outputs: reliability, construct associations, measurement error, subgroup results,
missingness, and sensitivity analyses. Survey instruments must be administered and scored according
to their validation and licensing requirements.

Completion gate: Each supported interpretation names the construct, population, effect estimate,
uncertainty, and limits. Metadata must not be described as diagnosing burnout or engagement.

### 4. Formal versus observed network validation

Design: Compare inferred team relationships against directory assignments, workflow ownership,
manager-confirmed dependencies, and a short network survey. Validate each communication channel
separately before combining channels.

Required outputs: precision, recall, edge stability, mapping coverage, channel disagreement, and
performance by team size and work arrangement.

Completion gate: Product language and edge rules match what the evidence can identify. Centrality
remains a structural descriptor and is never an individual performance ranking.

### 5. Prospective longitudinal validation

Design: Freeze model versions and outcomes before observing the future period. Evaluate on later
data without using those outcomes for model development.

Required outputs: outcome base rate, lead time, calibration, false alarms, missed outcomes,
discrimination where applicable, subgroup results, and comparison with simple baselines.

Completion gate: A forecast is labelled validated only for the tested outcome, population, horizon,
and model version. Temporal order alone does not prove causation.

### 6. Intervention effectiveness

Design: Register the observation, action, owner, target metric, negative-effect checks, and review
dates before the action begins. Prefer randomized, stepped, or matched comparisons when feasible.

Required outputs: adoption, fidelity, before/after change, comparison effect, uncertainty, adverse
effects, and maintenance at later reviews. Failed and neutral interventions remain in the dataset.

Completion gate: The report distinguishes measured change from a causal effect and identifies the
design that justifies the wording.

### 7. External validation

Design: Evaluate frozen models on organizations not used to develop thresholds, features, or
recommendations. Determine sample size using a pre-specified power or precision analysis.

Required outputs: performance by company size, industry, geography, work arrangement, connector,
coverage, and model version, including settings where performance is inadequate.

Completion gate: The supported population and exclusions are explicit and reproducible.

### 8. Independent methodological and privacy review

Design: Give an external reviewer the model card, protocols, code-relevant formulas, evidence
tables, privacy controls, known incidents, and unresolved limitations.

Required outputs: versioned report, conflicts of interest, required corrections, residual risks,
response from SignalTrue, and re-review date.

Completion gate: The report is linked, material findings are addressed or openly accepted, and the
review scope is not represented as broader than it was.

## Operating sequence

1. Freeze the metric definition, model version, research question, outcomes, and analysis plan.
2. Confirm consent, access, retention, minimum-group, and aggregation requirements.
3. Determine sample size using power or precision analysis; do not invent a universal minimum.
4. Register the study as `protocol_ready`, then `collecting` when data collection actually starts.
5. Store only aggregate evidence and retain null, failed, and contradictory results.
6. Verify evidence separately from recording it.
7. Publish supported and unsupported claims, uncertainty, limitations, and version applicability.
8. Update product labels, recommendations, and stop-use rules from the result.

## Research and reporting foundations

- COSMIN measurement properties: reliability, validity, responsiveness, and interpretability.
- NIOSH WellBQ and appropriately licensed validated instruments for independent survey outcomes.
- Freeman centrality and Newman modularity for graph definitions, not risk thresholds.
- TRIPOD+AI principles for transparent prediction reporting and calibration.
- CONSORT cluster-trial guidance where interventions are assigned by team or organization.
- RE-AIM for reach, effectiveness, adoption, implementation, and maintenance.
- NIST AI RMF for governance, monitoring, transparency, and risk management.
- WHO burnout guidance for the boundary against passive metadata diagnosis.
