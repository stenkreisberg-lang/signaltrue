# Weekly brief evidence guardrails

These are product communication guardrails. They are not statistical-significance thresholds,
clinical rules, or claims that a metric is scientifically validated.

Readiness is calculated separately for calendar metrics and collaboration-message metrics. Team
size and privacy suppression continue to apply independently.

## Coverage and volume

| Condition | Readiness | Product behavior |
| --- | --- | --- |
| Coverage below 30% | `blocked` | Show availability/count context only; exclude from status, alerts, forecasts, and actions. |
| Coverage 30% to below 60% | `directional_only` | May prompt a diagnostic question; exclude from organization status. |
| Coverage 60% to below 80% | `usable_with_warning` | May inform status with a visible coverage warning. |
| Coverage at least 80% | `usable` | Normal evidence processing. |
| Fewer than 10 observations | `blocked_low_volume` | Do not infer an organization pattern. |
| 10 to 29 observations | `directional_low_volume` | Diagnostic questions only; exclude from organization status. |
| At least 30 observations | normal volume | Apply the applicable coverage rule. |

Percentages backed by small samples are always accompanied by their numerator, denominator, and
represented-user coverage. A zero denominator produces no percentage.

## Evidence to action

- Low evidence, blocked readiness, or a one-period signal can produce at most a diagnostic question.
- Medium evidence persisting for two periods may support a reversible experiment.
- High evidence with adequate coverage and persistent deviation may support an intervention.
- A stable week with no meaningful negative movement defaults to no action.

Every proposed action carries an owner, effort, review window, target metric, baseline, expected
direction, and success criterion. Before/after movement is reported without a causal claim.

## Forecast visibility

- Fewer than 6 graded predictions: hidden.
- 6 to 11: experimental appendix.
- At least 12 with at least 70% matched: main report.
- At least 12 below 70% matched: experimental appendix.

Forecasts remain labelled as experimental directional rules until independently validated.
