# SignalTrue Measurement Model Card

Last reviewed: 2026-08-03

## Validation status

SignalTrue combines direct workplace-metadata measurements with descriptive statistics, network
analysis, internal review rules, and AI-generated hypotheses. The custom SignalTrue indices and
their exact weights or review bands have not been externally validated as clinical, psychometric,
causal, or predictive instruments.

They must not be presented as probabilities of burnout, disengagement, attrition, performance,
manager quality, or project failure.

## Measurement classes

| Class | Examples | Interpretation |
| --- | --- | --- |
| Observed | meeting count, participant-hours, message count, activity outside the configured schedule | Direct aggregates from connected account metadata, subject to connector coverage and mapping quality |
| Derived | percentage change, per-person average, after-hours share, median/MAD deviation, network concentration | Reproducible calculations from observed metadata; descriptive rather than causal |
| Model index | work-pattern deviation, drift, capacity, fragmentation, or other 0-100 indices | SignalTrue prioritization aids based on documented internal formulas; not validated probabilities or diagnoses |
| AI interpretation | explanations, questions, and recommended experiments | Hypotheses that require human review; not new measurements or proof of cause |

## Intended use

- Identify team-level work patterns worth discussing.
- Compare a team with its own historical baseline when sufficient data exists.
- Choose a reversible operating experiment and measure the same direct metric before and after.
- Support organizational learning without reading message content or ranking individuals.

## Prohibited use

- Employment, compensation, promotion, disciplinary, or termination decisions.
- Individual employee scoring or attrition prediction.
- Diagnosing burnout, mental health, engagement, or medical conditions.
- Claiming causation from correlation or metadata alone.
- Treating an internal review band as an industry norm or scientific threshold.

## Methods and limits

- Robust baselines use medians and median absolute deviation where historical coverage is adequate.
- Work Network uses established graph concepts such as team links and concentration. SignalTrue's
  privacy gates and action-review rules are product rules, not research-validated risk thresholds.
- A model score can be useful for prioritization while still being unvalidated. It must always be
  shown with coverage, the underlying observed metrics, the comparison period, and the model status.
- Missing or weakly mapped data lowers readiness and can suppress conclusions.
- AI may organize evidence and propose questions, but it cannot turn a correlation into a fact.

## Validation program

SignalTrue maintains eight progressive validation tracks covering connector accuracy, reliability,
construct validity, network-map validity, longitudinal performance, intervention effectiveness,
external validation, and independent review. Study progress and client-specific evidence counts
are shown in the application's Validation Center.

The complete evidence contract, status definitions, study outputs, and completion gates are in
`VALIDATION_PROGRAM.md`. A study cannot be marked complete without verified aggregate evidence and
a public summary. Citations alone do not satisfy this requirement.

## Research foundations

- Demerouti et al. (2001), *The job demands-resources model of burnout*, Journal of Applied
  Psychology. DOI: 10.1037/0021-9010.86.3.499
- Bakker and Demerouti (2007), *The Job Demands-Resources model: state of the art*.
  DOI: 10.1108/02683940710733115
- Freeman (1977), *A set of measures of centrality based on betweenness*.
  DOI: 10.2307/3033543
- NIST/SEMATECH e-Handbook, median absolute deviation.
- NIST AI Risk Management Framework 1.0, requirements for valid and reliable measurement,
  documented limitations, uncertainty, and evaluation.
- WHO ICD-11 guidance: burnout is an occupational phenomenon, not a medical condition, and cannot
  be inferred from passive workplace metadata.

These sources support the constructs or analytical methods. They do not validate SignalTrue's exact
weights, score transformations, bands, or predictions.
