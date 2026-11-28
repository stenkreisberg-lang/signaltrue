import { describe, test, expect } from '@jest/globals';
import { summarizeMonthlyWorkPatterns } from '../services/monthlyWorkPatternEvidence.js';
import { generateMonthlyEmailHTML } from '../services/monthlyReportService.js';

const weeks = [8, 15, 22].map((day, i) => ({
  date: new Date(Date.UTC(2026, 10, day)), meetingInstanceCount7d: 5, meetingParticipantHours7d: 7,
  backToBackMeetingBlocks: 0, messageCount7d: [5, 5, 90][i], afterHoursMessageCount: [1, 0, 9][i],
}));
const coverage = weeks.flatMap(({date}) => ['calendar','messaging'].map(source => ({
  _id: { week: new Date(+date - 6*86400000), source }, count: 2,
})));

describe('monthly reports use independent and source-qualified weeks', () => {
  test('preserves measured zero, weights messaging by volume and requires three represented weeks separately', () => {
    const result = summarizeMonthlyWorkPatterns(weeks,coverage,2);
    expect(result).toMatchObject({avgAfterHoursPct:10, avgBackToBackBlocks:0, calendarWeeks:3, messagingWeeks:3});
    const partial = summarizeMonthlyWorkPatterns(weeks,coverage.slice(1),2);
    expect(partial).toMatchObject({avgAfterHoursPct:10, avgBackToBackBlocks:null,calendarWeeks:2});
    expect(summarizeMonthlyWorkPatterns(weeks,[],2)).toMatchObject({avgMeetingCount:null,avgAfterHoursPct:null});
  });
  test('renders Estonian missing data differently from a measured zero', () => {
    const html = generateMonthlyEmailHTML({org:{name:'Koostöö',settings:{reportLanguage:'et'}},
      report:{reportMode:'decision',periodStart:weeks[0].date,periodEnd:weeks[2].date,
        dataReadiness:{calendarWeeks:3,messagingWeeks:0},orgHealth:{avgBackToBackBlocks:0,avgAfterHoursPct:null}}});
    expect(html).toContain('Juhtkonna kuuaruanne');
    expect(html).toContain('<strong>0</strong>');
    expect(html).toContain('Andmeid ei piisa');
    expect(html).not.toContain('<strong>0%</strong>');
  });
});
