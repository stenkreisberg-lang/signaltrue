const DAY = 86400000;
// Resolve local calendar boundaries in UTC using the configured IANA timezone.
const localParts = (instant, timeZone) => {
  const fields = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant).map(part => [part.type, part.value])
  );
  return { year: Number(fields.year), month: Number(fields.month), day: Number(fields.day),
    hour: Number(fields.hour), minute: Number(fields.minute), second: Number(fields.second) };
};

const localMidnightUtc = (calendarDayUtc, timeZone) => {
  const day = new Date(calendarDayUtc);
  const target = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  let candidate = target;
  for (let i = 0; i < 5; i++) {
    const p = localParts(new Date(candidate), timeZone);
    const observed = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const drift = target - observed;
    candidate += drift;
    if (drift === 0) break;
  }
  return new Date(candidate);
};

export function completedReportingWeek(reference = new Date(), timeZone = 'UTC') {
  // Invalid timezone fails closed instead of silently moving measurements.
  new Intl.DateTimeFormat('en-GB', { timeZone });
  const p = localParts(reference, timeZone);
  const calendarDay = Date.UTC(p.year, p.month - 1, p.day);
  const monday = calendarDay - ((new Date(calendarDay).getUTCDay() + 6) % 7) * DAY;
  const at = days => localMidnightUtc(monday + days * DAY, timeZone);
  return { periodStart: at(-7), periodEnd: at(0), previousStart: at(-14),
    baselineStart: at(-49), timeZone };
}
