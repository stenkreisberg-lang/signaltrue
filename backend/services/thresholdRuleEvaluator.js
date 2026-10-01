/**
 * Evaluate the small declarative rule language used by signal templates.
 * Supported operators: >=, <=, >, <, =, ==. Comparisons may be joined with
 * AND/OR and optional pp/% suffixes are accepted for readability.
 */
export function rulesMatch(rules, metrics, sustainedWeeks) {
  return (rules || []).some((rule) => {
    if (sustainedWeeks < (Number(rule.sustained) || 1)) return false;

    return String(rule.condition || '')
      .split(/\s+OR\s+/i)
      .some((alternative) =>
        alternative
          .split(/\s+AND\s+/i)
          .every((comparison) => evaluateComparison(comparison, rule, metrics))
      );
  });
}

function evaluateComparison(expression, rule, metrics) {
  const match = String(expression).trim().match(
    /^(.+?)\s*(>=|<=|==|=|>|<)\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*(?:pp|%)?$/i
  );
  if (!match) return false;

  const [, rawMetric, operator, rawExpected] = match;
  const metricValue = resolveMetric(rawMetric, rule, metrics);
  const expected = Number(rawExpected);
  if (!Number.isFinite(metricValue) || !Number.isFinite(expected)) return false;

  switch (operator) {
    case '>=':
      return metricValue >= expected;
    case '<=':
      return metricValue <= expected;
    case '>':
      return metricValue > expected;
    case '<':
      return metricValue < expected;
    case '=':
    case '==':
      return metricValue === expected;
    default:
      return false;
  }
}

function resolveMetric(rawMetric, rule, metrics) {
  const normalized = String(rawMetric)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const ruleMetric = String(rule.metric || '');

  // Template shorthand such as "FFS value" and plain "value" refer to the
  // metric named by the rule.
  if (normalized === 'value' || normalized.endsWith('value')) {
    return numericValue(metrics?.[ruleMetric]);
  }

  const directKey = Object.keys(metrics || {}).find(
    (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
  );
  return directKey ? numericValue(metrics[directKey]) : NaN;
}

function numericValue(value) {
  if (value && typeof value === 'object') value = value.value;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}
