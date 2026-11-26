const copy = {
  meetings: [
    'Koosolekuid kalendrikasutaja kohta',
    'Which recurring meetings still need everyone who attends?',
    'Millistel korduvatel koosolekutel on kõigi osalemine endiselt vajalik?',
  ],
  meeting_hours: [
    'Koosolekutunde kalendrikasutaja kohta',
    'Which meetings account for the change in scheduled hours?',
    'Millised koosolekud selgitavad muutust kalendris?',
  ],
  messages: [
    'Sõnumeid sõnumisaatja kohta',
    'Did the team move a conversation into or out of a measured channel?',
    'Kas mõni arutelu liikus mõõdetavasse kanalisse või sealt välja?',
  ],
  after_hours: [
    'Tööväliste sõnumite osakaal',
    'Do handovers or response expectations extend beyond the agreed workday?',
    'Kas üleandmised või vastamise ootused ulatuvad kokkulepitud tööajast välja?',
  ],
  focus_time: [
    'Vaba kalendriaega kalendrikasutaja kohta',
    'Could moving one meeting restore an uninterrupted calendar block?',
    'Kas ühe koosoleku nihutamine jätaks kalendrisse pikema vaba aja?',
  ],
  recurring_load: [
    'Korduvate koosolekute osakaal koosolekuajast',
    'Which recurring meetings could the team shorten or hold less often?',
    'Milliseid korduvaid koosolekuid saaks lühendada või harvem pidada?',
  ],
  fragmentation: [
    'Kalendri killustatus',
    'Did short gaps between meetings split up a workday?',
    'Kas lühikesed vahed koosolekute vahel tükeldasid tööpäeva?',
  ],
};

export function describeManagerMetric(key, label, unit, locale) {
  const et = locale === 'et';
  const units = {
    'meetings/person': 'koosolekut/in',
    'h/person': 'h/in',
    'messages/person': 'sõnumit/in',
  };
  return {
    label: et ? copy[key][0] : label,
    unit: et ? units[unit] || unit : unit,
    question: copy[key][et ? 2 : 1],
  };
}

export function summarizeManagerSeries(points, key) {
  const last = points.at(-1);
  if (!last?.comparisonKey || !Number.isFinite(last.value)) return null;
  const past = points
    .slice(-7, -1)
    .filter((p) => Number.isFinite(p.value) && p.comparisonKey === last.comparisonKey);
  if (past.length < 4) return null;
  const values = past.map((p) => p.value).sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const baseline = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  const delta = +(last.value - baseline).toFixed(2);
  const pct = baseline > 0 ? (delta / baseline) * 100 : null;
  // Use percentage points for shares; small count/hour baselines get absolute differences only.
  const canShowPct =
    !['after_hours', 'recurring_load', 'fragmentation'].includes(key) &&
    baseline >= (key === 'messages' ? 30 : 1) &&
    pct !== null &&
    Math.abs(pct) <= 500;
  return {
    key,
    current: last.value,
    sampledOn: last.sampledOn,
    baseline: +baseline.toFixed(2),
    delta,
    changePct: canShowPct ? +pct.toFixed(1) : null,
    periods: past.length,
  };
}
