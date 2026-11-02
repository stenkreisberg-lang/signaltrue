import { describe, expect, test } from '@jest/globals';
import { buildWeeklyBriefEnvelope } from '../services/weeklyBriefDeliveryEnvelope.js';

describe('weekly superadmin customer-identical report copies', () => {
  const html = '<html><body><h1>Company report</h1><svg>Graph</svg><a href="https://www.signaltrue.ai/app/latest-brief">Details</a></body></html>';
  const subject = 'Weekly Intelligence Brief — Example Company — Nov 2, 2026';

  test('sends one exact report to approved HR with the platform admin as BCC', () => {
    const envelope = buildWeeklyBriefEnvelope({
      recipients: ['HR@EXAMPLE.COM', 'hr@example.com'],
      subject,
      html,
      superadminEmail: 'sten.kreisberg@gmail.com',
    });
    expect(envelope.to).toEqual(['hr@example.com']);
    expect(envelope.bcc).toEqual(['sten.kreisberg@gmail.com']);
    expect(envelope.subject).toBe(subject);
    expect(envelope.html).toBe(html);
  });

  test('never adds the superadmin twice if already an approved recipient', () => {
    const envelope = buildWeeklyBriefEnvelope({
      recipients: ['sten.kreisberg@gmail.com', 'hr@example.com'],
      subject,
      html,
      superadminEmail: 'sten.kreisberg@gmail.com',
    });
    expect(envelope.bcc).toEqual([]);
    expect(envelope.to).toEqual(['sten.kreisberg@gmail.com', 'hr@example.com']);
  });

  test('does not expand the customer To list or alter report content', () => {
    const envelope = buildWeeklyBriefEnvelope({
      recipients: ['triin@tehnopol.ee'],
      subject,
      html,
      superadminEmail: 'sten.kreisberg@gmail.com',
    });
    expect(envelope.to).toEqual(['triin@tehnopol.ee']);
    expect(envelope.bcc).toEqual(['sten.kreisberg@gmail.com']);
    expect(envelope.html).toBe(html);
  });

  test('fails closed rather than silently losing the audit copy if the email is invalidly blank', () => {
    expect(() => buildWeeklyBriefEnvelope({
      recipients: ['hr@example.com'],
      subject,
      html,
      superadminEmail: '',
    })).toThrow(/SUPERADMIN_EMAIL/);
  });
});
