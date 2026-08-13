function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function percentChange(before, after) {
  if (!finite(before) || !finite(after) || before === 0) return null;
  return Math.round(((after - before) / Math.abs(before)) * 1000) / 10;
}

function teamIdOf(record) {
  return String(record.teamId?._id || record.teamId || '');
}

function buildDeliveryComparisons(outcomes) {
  const byTeam = new Map();
  outcomes
    .filter((row) => row.family === 'delivery')
    .forEach((row) => {
      const teamId = teamIdOf(row);
      if (!teamId) return;
      if (!byTeam.has(teamId)) byTeam.set(teamId, []);
      byTeam.get(teamId).push(row);
    });

  return [...byTeam.entries()].flatMap(([teamId, rows]) => {
    const ordered = rows.sort((a, b) => String(a.weekStart).localeCompare(String(b.weekStart)));
    if (ordered.length < 2) return [];
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    return [
      {
        teamId,
        teamName: latest.teamId?.name || first.teamId?.name || 'Team',
        fromWeek: first.weekStart,
        toWeek: latest.weekStart,
        cycleTimeChangePct: percentChange(first.cycleTimeMedianHours, latest.cycleTimeMedianHours),
        throughputChangePct: percentChange(first.throughput, latest.throughput),
        reopenRateChangePct: percentChange(first.reopenRate, latest.reopenRate),
      },
    ];
  });
}

export function summarizeOutcomeEvidence(outcomes = [], interventions = []) {
  const measured = interventions.filter(
    (item) => finite(item.outcomeDelta?.metricBefore) && finite(item.outcomeDelta?.metricAfter)
  );
  const reviewCounts = measured.reduce(
    (summary, item) => {
      const review = item.reviews?.[item.reviews.length - 1];
      const key = review?.interpretation || (item.outcomeDelta?.improved ? 'improved' : 'worsened');
      if (Object.hasOwn(summary, key)) summary[key] += 1;
      return summary;
    },
    { improved: 0, no_material_change: 0, worsened: 0, insufficient_data: 0 }
  );

  const peopleRows = outcomes.filter((row) => row.family === 'people');
  const recordedPeopleOutcomes = peopleRows.reduce(
    (totals, row) => ({
      voluntaryExits: totals.voluntaryExits + (row.voluntaryExits || 0),
      absenceDays: totals.absenceDays + (row.absenceDays || 0),
    }),
    { voluntaryExits: 0, absenceDays: 0 }
  );
  const deliveryComparisons = buildDeliveryComparisons(outcomes);

  return {
    evidenceStatus:
      outcomes.length === 0 && measured.length === 0
        ? 'not_available'
        : deliveryComparisons.length === 0 && measured.length === 0
          ? 'descriptive_only'
          : 'measured',
    counts: {
      outcomeRecords: outcomes.length,
      teamsWithDeliveryComparisons: deliveryComparisons.length,
      measuredActions: measured.length,
      ...reviewCounts,
    },
    recordedPeopleOutcomes,
    deliveryComparisons,
    measuredActions: measured.slice(0, 20).map((item) => ({
      id: item._id,
      teamId: teamIdOf(item),
      teamName: item.teamId?.name || 'Team',
      action: item.title || item.actionTaken,
      targetMetric: item.targetMetricLabel || item.targetMetric,
      before: item.outcomeDelta.metricBefore,
      after: item.outcomeDelta.metricAfter,
      percentChange: item.outcomeDelta.percentChange,
      interpretation:
        item.reviews?.[item.reviews.length - 1]?.interpretation ||
        (item.outcomeDelta.improved ? 'improved' : 'worsened'),
    })),
    interpretation:
      'These are observed before-and-after changes and recorded operational outcomes. They do not establish that an action caused the change.',
  };
}

export default { summarizeOutcomeEvidence };
