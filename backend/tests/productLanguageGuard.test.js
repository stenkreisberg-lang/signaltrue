import {
  generateFollowUpReminderEmail,
  generateITAdminReminderEmail,
  generateITAdminWeek2ReminderEmail,
  generateITAdminWeek3ReminderEmail,
  generateNewUserReminderEmail,
  generateUserWeek2ReminderEmail,
  generateUserWeek3ReminderEmail,
} from '../services/reminderEmailService.js';
import { generateWeeklySummary } from '../services/notificationService.js';

const forbiddenCustomerClaims = [
  /detect(?:s|ed|ing)?\s+burnout/i,
  /burnout\s+risk/i,
  /early[- ]warning\s+system/i,
  /team\s+health\s+scores?/i,
  /behavioral\s+risk\s+monitoring/i,
  /behavioral\s+monitoring/i,
  /critical\s+burnout/i,
];

describe('P0.1 customer-language guard', () => {
  test('setup and reminder emails avoid legacy predictive or diagnostic positioning', () => {
    const samples = [
      generateNewUserReminderEmail('Alex', 'https://example.test/connect'),
      generateITAdminReminderEmail('Taylor', 'Jordan', 'https://example.test/setup'),
      generateFollowUpReminderEmail('Alex', 'https://example.test/connect', 24),
      generateUserWeek2ReminderEmail('Alex', 'https://example.test/connect'),
      generateUserWeek3ReminderEmail('Alex', 'https://example.test/connect'),
      generateITAdminWeek2ReminderEmail('Taylor', 'Jordan', 'https://example.test/setup'),
      generateITAdminWeek3ReminderEmail('Taylor', 'Jordan', 'https://example.test/setup'),
    ].join('\n');

    for (const claim of forbiddenCustomerClaims) {
      expect(samples).not.toMatch(claim);
    }

    expect(samples).toMatch(/work-condition/i);
    expect(samples).toMatch(/No content access\. Metadata only\./i);
  });

  test('weekly fallback summary describes team-level work patterns, not employee health', async () => {
    const openai = process.env.OPENAI_API_KEY;
    const anthropic = process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const summary = await generateWeeklySummary({
        name: 'Operations',
        zone: 'Surge',
        bdi: 72,
        trend: 8,
        slackSignals: { messageCount: 120, avgResponseDelayHours: 3 },
        calendarSignals: { meetingHoursWeek: 18, afterHoursMeetings: 4, recoveryScore: 42 },
      });

      expect(summary).toMatch(/work-pattern/i);
      expect(summary).toMatch(/does not diagnose health/i);
      for (const claim of forbiddenCustomerClaims) {
        expect(summary).not.toMatch(claim);
      }
    } finally {
      if (openai === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = openai;
      if (anthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = anthropic;
    }
  });
});
