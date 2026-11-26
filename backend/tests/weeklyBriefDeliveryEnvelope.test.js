import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { buildWeeklyBriefEnvelope } from '../services/weeklyBriefDeliveryEnvelope.js';

describe('weekly client reports and explicitly authorised QA copies', () => {
  const html = '<html><body><h1>Company report</h1><svg>Graph</svg></body></html>';
  const subject = 'Weekly intelligence brief';
  let previous, previousWeekly;
  beforeEach(() => {
    previousWeekly = process.env.WEEKLY_HR_QA_COPY_EMAIL;
    delete process.env.WEEKLY_HR_QA_COPY_EMAIL;
    previous = process.env.CLIENT_REPORT_QA_COPIES_ENABLED;
    delete process.env.CLIENT_REPORT_QA_COPIES_ENABLED;
  });
  afterEach(() => {
    if (previousWeekly === undefined) delete process.env.WEEKLY_HR_QA_COPY_EMAIL;
    else process.env.WEEKLY_HR_QA_COPY_EMAIL = previousWeekly;
    if (previous === undefined) delete process.env.CLIENT_REPORT_QA_COPIES_ENABLED;
    else process.env.CLIENT_REPORT_QA_COPIES_ENABLED = previous;
  });

  test('defaults to no BCC and removes duplicate HR recipients', () => {
    const envelope = buildWeeklyBriefEnvelope({
      recipients: ['HR@EXAMPLE.COM', 'hr@example.com'],
      subject, html,
    });
    expect(envelope.to).toEqual(['hr@example.com']);
    expect(envelope.bcc).toEqual([]);
    expect(envelope.qaCopyStatus).toBe('disabled');
    expect(envelope.html).toBe(html);
  });

  test('copies the identical report only to the explicitly approved SignalTrue address', () => {
    process.env.CLIENT_REPORT_QA_COPIES_ENABLED = 'true';
    const envelope = buildWeeklyBriefEnvelope({
      recipients: ['hr@example.com'], subject, html,
      superadminEmail: 'quality@signaltrue.ai',
    });
    expect(envelope.to).toEqual(['hr@example.com']);
    expect(envelope.bcc).toEqual(['quality@signaltrue.ai']);
    expect(envelope.qaCopyStatus).toBe('included');
    expect(envelope.html).toBe(html);
  });

  test('can authorise a weekly-only copy without enabling other report types', () => {
    process.env.WEEKLY_HR_QA_COPY_EMAIL = ' Weekly.Reports@SignalTrue.ai ';
    const envelope = buildWeeklyBriefEnvelope({ recipients: ['hr@example.com'], subject, html });
    expect(envelope.bcc).toEqual(['weekly.reports@signaltrue.ai']);
    expect(envelope.qaCopyStatus).toBe('included');
    expect(process.env.CLIENT_REPORT_QA_COPIES_ENABLED).toBeUndefined();
  });

  test('rejects a recipient list or an external address in the weekly-only setting', () => {
    for (const value of ['external@example.com,weekly@signaltrue.ai', 'external@example.com']) {
      process.env.WEEKLY_HR_QA_COPY_EMAIL = value;
      expect(() => buildWeeklyBriefEnvelope({ recipients: ['hr@example.com'], subject, html })).toThrow();
    }
  });

  test('does not duplicate the QA recipient in the BCC field', () => {
    process.env.CLIENT_REPORT_QA_COPIES_ENABLED = 'true';
    const envelope = buildWeeklyBriefEnvelope({
      recipients: ['quality@signaltrue.ai'], subject, html,
      superadminEmail: 'quality@signaltrue.ai',
    });
    expect(envelope.bcc).toEqual([]);
    expect(envelope.qaCopyStatus).toBe('already_recipient');
  });

  test('fails closed when QA copies are enabled without an approved business recipient', () => {
    process.env.CLIENT_REPORT_QA_COPIES_ENABLED = 'true';
    expect(() => buildWeeklyBriefEnvelope({
      recipients: ['hr@example.com'], subject, html,
      superadminEmail: 'personal@gmail.com',
    })).toThrow(/QA mailbox/);
    expect(() => buildWeeklyBriefEnvelope({
      recipients: ['hr@example.com'], subject, html,
      superadminEmail: '',
    })).toThrow(/QA mailbox/);
  });
});
