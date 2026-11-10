import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { buildWeeklyBriefEnvelope } from '../services/weeklyBriefDeliveryEnvelope.js';

describe('weekly client reports and explicitly authorised QA copies', () => {
  const html = '<html><body><h1>Company report</h1><svg>Graph</svg></body></html>';
  const subject = 'Weekly intelligence brief';
  let previous;
  beforeEach(() => {
    previous = process.env.CLIENT_REPORT_QA_COPIES_ENABLED;
    delete process.env.CLIENT_REPORT_QA_COPIES_ENABLED;
  });
  afterEach(() => {
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
    expect(envelope.html).toBe(html);
  });

  test('does not duplicate the QA recipient in the BCC field', () => {
    process.env.CLIENT_REPORT_QA_COPIES_ENABLED = 'true';
    const envelope = buildWeeklyBriefEnvelope({
      recipients: ['quality@signaltrue.ai'], subject, html,
      superadminEmail: 'quality@signaltrue.ai',
    });
    expect(envelope.bcc).toEqual([]);
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
