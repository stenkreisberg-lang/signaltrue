import crypto from 'node:crypto';
import { getManagerCoachingReadiness } from './managerCoachingReadinessService.js';

const RULES_VERSION = '1.0.0';

const COPY = {
  coordination_load: {
    title: 'Your coordination load is unusually high',
    question:
      'Which decisions, approvals or dependencies still require you that someone else could own?',
    experiment: 'Delegate one recurring approval or coordination responsibility for two weeks.',
    targets: [
      ['coordinationLoadHours', 'down'],
      ['decisionConcentration', 'down'],
      ['oneOnOneMinutesPerReport', 'up'],
    ],
  },
  span_increase: {
    title: 'Your active span has increased',
    question: 'Which responsibilities need to change now that more people depend on your role?',
    experiment:
      'Move one recurring coordination responsibility to a clearly named owner for two weeks.',
    targets: [
      ['span', 'stable'],
      ['coordinationLoadHours', 'down'],
    ],
  },
  one_on_one_time: {
    title: 'Direct-report time has fallen',
    question: 'What has displaced your direct-report time during the last few weeks?',
    experiment: 'Protect recurring 1:1 slots for two weeks and keep status updates asynchronous.',
    targets: [
      ['oneOnOneMinutesPerReport', 'up'],
      ['oneOnOneCancelledCount', 'down'],
    ],
  },
  after_hours_activity: {
    title: 'More of your activity is happening outside working hours',
    question: 'What work is repeatedly moving outside normal hours, and what is pushing it there?',
    experiment:
      'Move one recurring evening workflow, approval or communication window into core hours.',
    targets: [['afterHoursActivityRatio', 'down']],
  },
  decision_concentration: {
    title: 'Coordination has become more concentrated around your role',
    question:
      'Which decision currently waits for you that the team could make with a clear boundary?',
    experiment: 'Define one decision right the team can exercise without escalation for two weeks.',
    targets: [
      ['decisionConcentration', 'down'],
      ['responseLatencyP90Min', 'down'],
    ],
  },
  team_focus_erosion: {
    title: 'Meeting growth is reducing team focus availability',
    question: 'Which recurring meeting creates less value than the uninterrupted time it consumes?',
    experiment: 'Remove, shorten or make one recurring meeting asynchronous for two weeks.',
    targets: [
      ['meetingHoursPerPerson', 'down'],
      ['focusHoursAvailablePerPerson', 'up'],
    ],
  },
};

export async function generateManagerCoaching({ orgId, userId }) {
  const readiness = await getManagerCoachingReadiness({ orgId, userId });
  if (!readiness.ready) {
    return {
      status: readiness.status,
      reason: readiness.reason,
      dataMode: 'live',
      requirements: readiness.requirements,
      data: null,
    };
  }

  const current = readiness.latestWeek;
  const history = readiness.managerWeeks;
  const team = buildTeamContext(readiness.teamDays, current.weekStart);
  const metrics = buildMetricMap(current, history, team, readiness);
  const candidates = buildCandidates(metrics, current, history);
  candidates.sort((a, b) => b.priority - a.priority);
  const selected = candidates[0] || null;
  const weekEnd = addDays(current.weekStart, 6);

  const primaryInsight = selected
    ? buildInsight(selected, metrics, {
        orgId,
        managerHash: current.managerHash,
        weekStart: current.weekStart,
        scoringVersion: current.scoringVersion,
      })
    : null;

  return {
    status: selected ? 'ready' : 'ready_no_change',
    dataMode: 'live',
    data: {
      manager: {
        managerHash: current.managerHash,
        teamId: current.teamId,
        role: current.role,
      },
      period: { weekStart: current.weekStart, weekEnd },
      readiness: {
        confidence: readiness.confidence,
        coverage: current.dataCoverageRatio ?? null,
        requirements: readiness.requirements,
      },
      primaryInsight,
      supportingObservations: candidates.slice(1, 4).map((candidate) => ({
        signal: candidate.signal,
        statement: candidate.statement,
        confidence: candidate.confidence,
      })),
      managerConditions: selectMetrics(metrics, [
        'span',
        'coordinationLoadHours',
        'afterHoursActivityRatio',
        'decisionConcentration',
        'brokerageScore',
      ]),
      managerTeamInteraction: selectMetrics(metrics, [
        'oneOnOneMinutesPerReport',
        'oneOnOneCancelledCount',
        'oneOnOneRescheduledCount',
        'responseLatencyP50Min',
        'responseLatencyP90Min',
      ]),
      teamContext: selectMetrics(metrics, [
        'meetingHoursPerPerson',
        'focusHoursAvailablePerPerson',
        'fragmentedDayRatio',
        'afterHoursMessageRatio',
      ]),
      metricSnapshot: metrics,
      limitation: 'SignalTrue can measure this change but cannot determine why it happened.',
      provenance: {
        coachingVersion: readiness.coachingVersion,
        rulesVersion: RULES_VERSION,
        scoringVersion: current.scoringVersion,
        dataQualityVersion: current.dataQualityVersion,
        generatedAt: new Date().toISOString(),
      },
    },
  };
}

function buildMetricMap(current, history, team, readiness) {
  const managerFields = [
    ['span', 'Active direct reports', 'reports', 'calendar'],
    ['coordinationLoadHours', 'Coordination load', 'hours/week', 'calendar'],
    ['oneOnOneMinutesPerReport', '1:1 time per report', 'minutes/report', 'oneOnOneAttribution'],
    ['oneOnOneCancelledCount', 'Cancelled 1:1s', 'meetings', 'oneOnOneAttribution'],
    ['oneOnOneRescheduledCount', 'Rescheduled 1:1s', 'meetings', 'oneOnOneAttribution'],
    ['responseLatencyP50Min', 'Response latency P50', 'minutes', 'responseLatency'],
    ['responseLatencyP90Min', 'Response latency P90', 'minutes', 'responseLatency'],
    ['afterHoursActivityRatio', 'After-hours activity', 'ratio', 'afterHoursClassification'],
    ['decisionConcentration', 'Decision concentration', 'ratio', 'graph'],
    ['brokerageScore', 'Brokerage', 'ratio', 'graph'],
  ];
  const metrics = {};
  for (const [key, label, unit, coverageKey] of managerFields) {
    const values = history.map((week) => week[key]).filter(Number.isFinite);
    metrics[key] = metric({
      key,
      label,
      unit,
      value: current[key],
      baseline: median(values),
      coverage: current.metricCoverage?.[coverageKey] ?? current.dataCoverageRatio,
      sources: readiness.sources,
      period: current.weekStart,
      scoringVersion: current.scoringVersion,
      dataQualityVersion: current.dataQualityVersion,
    });
  }
  for (const [key, value] of Object.entries(team.current)) {
    metrics[key] = metric({
      key,
      label: team.labels[key],
      unit: team.units[key],
      value,
      baseline: team.baseline[key],
      coverage: readiness.requirements.calendar.coverage,
      sources: readiness.sources,
      period: current.weekStart,
      scoringVersion: current.scoringVersion,
      dataQualityVersion: current.dataQualityVersion,
    });
  }
  return metrics;
}

function buildCandidates(metrics, current, history) {
  const candidates = [];
  addHigher(candidates, metrics.coordinationLoadHours, 'coordination_load', 0.2, 2, 1.0, history);
  addHigher(candidates, metrics.span, 'span_increase', 0.15, 2, 0.85, history);
  addLower(candidates, metrics.oneOnOneMinutesPerReport, 'one_on_one_time', 0.2, 5, 1.0, history);
  addHigher(
    candidates,
    metrics.afterHoursActivityRatio,
    'after_hours_activity',
    0.5,
    0.05,
    0.9,
    history
  );
  addHigher(
    candidates,
    metrics.decisionConcentration,
    'decision_concentration',
    0.15,
    0.08,
    1.0,
    history
  );

  const focus = metrics.focusHoursAvailablePerPerson;
  const meeting = metrics.meetingHoursPerPerson;
  if (
    focus?.status === 'available' &&
    meeting?.status === 'available' &&
    focus.deltaPercent <= -15 &&
    meeting.deltaPercent >= 15
  ) {
    candidates.push(candidate('team_focus_erosion', focus, 1.0));
  }
  return candidates.map((item) => ({ ...item, currentWeek: current.weekStart }));
}

function addHigher(target, item, signal, relative, absolute, actionability, history) {
  if (item?.status !== 'available' || !Number.isFinite(item.baseline)) return;
  if (item.value - item.baseline < absolute || item.deltaPercent < relative * 100) return;
  target.push(
    candidate(signal, item, actionability, persistence(history, item.key, item.baseline, 'higher'))
  );
}

function addLower(target, item, signal, relative, absolute, actionability, history) {
  if (item?.status !== 'available' || !Number.isFinite(item.baseline) || item.baseline <= 0) return;
  if (item.baseline - item.value < absolute || item.deltaPercent > -relative * 100) return;
  target.push(
    candidate(signal, item, actionability, persistence(history, item.key, item.baseline, 'lower'))
  );
}

function candidate(signal, item, actionability = 1, persistenceWeeks = 1) {
  const severity = Math.min(3, Math.max(1, Math.ceil(Math.abs(item.deltaPercent || 0) / 20)));
  const confidenceWeight =
    item.confidence === 'high' ? 1 : item.confidence === 'medium' ? 0.8 : 0.5;
  return {
    signal,
    metricKey: item.key,
    statement: `${item.label} changed from ${formatValue(item.baseline, item.unit)} to ${formatValue(item.value, item.unit)}.`,
    severity,
    persistenceWeeks,
    confidence: item.confidence,
    priority:
      severity *
      Math.min(1.5, 1 + (persistenceWeeks - 1) * 0.25) *
      confidenceWeight *
      actionability,
  };
}

function buildInsight(candidateItem, metrics, identity) {
  const copy = COPY[candidateItem.signal];
  const trigger = metrics[candidateItem.metricKey];
  const id = crypto
    .createHash('sha256')
    .update(
      [
        identity.orgId,
        identity.managerHash,
        identity.weekStart,
        candidateItem.signal,
        candidateItem.severity,
        identity.scoringVersion,
      ].join(':')
    )
    .digest('hex');
  const targetMetrics = copy.targets.map(([key, direction]) => ({
    metric: key,
    direction,
    current: metrics[key]?.value ?? null,
    baseline: metrics[key]?.baseline ?? null,
    unit: metrics[key]?.unit ?? null,
  }));
  return {
    insightId: id,
    signal: candidateItem.signal,
    severity: candidateItem.severity,
    confidence: candidateItem.confidence,
    title: copy.title,
    statement: candidateItem.statement,
    persistenceWeeks: candidateItem.persistenceWeeks,
    trigger,
    question: copy.question,
    experiment: {
      experimentKey: candidateItem.signal,
      title: copy.experiment,
      durationDays: 14,
      targetMetrics,
    },
  };
}

function metric({
  key,
  label,
  unit,
  value,
  baseline,
  coverage,
  sources,
  period,
  scoringVersion,
  dataQualityVersion,
}) {
  const available = Number.isFinite(value);
  const deltaPercent =
    available && Number.isFinite(baseline) && baseline !== 0
      ? Math.round(((value - baseline) / Math.abs(baseline)) * 100)
      : null;
  const confidence =
    available && coverage >= 0.7 ? 'high' : available && coverage >= 0.4 ? 'medium' : 'low';
  return {
    key,
    label,
    unit,
    value: available ? value : null,
    status: available ? 'available' : 'unavailable',
    reason: available ? null : 'metric_not_supported_or_coverage_low',
    baseline: Number.isFinite(baseline) ? baseline : null,
    deltaPercent,
    period,
    coverage: Number.isFinite(coverage) ? coverage : null,
    confidence,
    sources,
    scoringVersion,
    dataQualityVersion,
  };
}

function buildTeamContext(days, weekStart) {
  const currentStart = weekStart;
  const currentEnd = addDays(weekStart, 6);
  const currentDays = days.filter((day) => day.date >= currentStart && day.date <= currentEnd);
  const baselineDays = days.filter((day) => day.date < currentStart);
  const fields = {
    meetingHoursPerPerson: 'calendar.meetingHoursPerPerson',
    focusHoursAvailablePerPerson: 'calendar.focusHoursAvailablePerPerson',
    fragmentedDayRatio: 'calendar.fragmentedDayRatio',
    afterHoursMessageRatio: 'messaging.afterHoursMessageRatio',
  };
  const current = {};
  const baseline = {};
  for (const [key, path] of Object.entries(fields)) {
    current[key] = average(currentDays.map((day) => get(day, path)).filter(Number.isFinite));
    baseline[key] = median(baselineDays.map((day) => get(day, path)).filter(Number.isFinite));
  }
  return {
    current,
    baseline,
    labels: {
      meetingHoursPerPerson: 'Team meeting hours per person',
      focusHoursAvailablePerPerson: 'Team focus availability',
      fragmentedDayRatio: 'Fragmented-day ratio',
      afterHoursMessageRatio: 'Team after-hours messaging',
    },
    units: {
      meetingHoursPerPerson: 'hours/person',
      focusHoursAvailablePerPerson: 'hours/person',
      fragmentedDayRatio: 'ratio',
      afterHoursMessageRatio: 'ratio',
    },
  };
}

function persistence(history, key, baseline, direction) {
  let weeks = 1;
  for (const week of history) {
    const value = week[key];
    if (!Number.isFinite(value)) break;
    const persists = direction === 'higher' ? value > baseline : value < baseline;
    if (!persists) break;
    weeks++;
  }
  return weeks;
}

function selectMetrics(metrics, keys) {
  return keys.map((key) => metrics[key]).filter(Boolean);
}

function median(values) {
  if (!values?.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function average(values) {
  if (!values?.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function get(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatValue(value, unit) {
  if (!Number.isFinite(value)) return 'unavailable';
  if (unit === 'ratio') return `${Math.round(value * 100)}%`;
  return `${Math.round(value * 10) / 10} ${unit}`;
}

export const __pure = { metric, buildCandidates, buildTeamContext, candidate };

export default { generateManagerCoaching };
