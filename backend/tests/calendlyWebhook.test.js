import crypto from 'node:crypto';
import { describe, expect, jest, test } from '@jest/globals';
import {
  processCalendlyWebhookEvent,
  trackedLeadIdFromCalendlyPayload,
  verifyCalendlyWebhookSignature,
} from '../routes/calendlyWebhook.js';

function signedHeader(rawBody, secret, timestamp) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('Calendly commercial conversion tracking', () => {
  test('verifies a current Calendly webhook signature and rejects stale signatures', () => {
    const secret = 'test-signing-key';
    const timestamp = 1_800_000_000;
    const body = Buffer.from(JSON.stringify({ event: 'invitee.created' }));
    const header = signedHeader(body, secret, timestamp);

    expect(verifyCalendlyWebhookSignature(body, header, secret, timestamp + 30)).toBe(true);
    expect(verifyCalendlyWebhookSignature(body, header, secret, timestamp + 181)).toBe(false);
    expect(verifyCalendlyWebhookSignature(body, header, 'wrong-secret', timestamp + 30)).toBe(
      false
    );
  });

  test('extracts only an opaque SignalTrue lead id from Calendly UTM content', () => {
    const leadId = '66aabbccddeeff0011223344';
    expect(
      trackedLeadIdFromCalendlyPayload({
        tracking: { utm_content: `stlead_${leadId}` },
      })
    ).toBe(leadId);
    expect(
      trackedLeadIdFromCalendlyPayload({
        tracking: { utm_content: 'someone@example.com' },
      })
    ).toBeNull();
  });

  test('records a confirmed booking without copying invitee PII into analytics', async () => {
    const analyticsDocs = [];
    class FakeAnalytics {
      constructor(doc) {
        Object.assign(this, doc);
      }

      static async findOne(query) {
        return analyticsDocs.find((doc) => doc.dedupeKey === query.dedupeKey) || null;
      }

      async save() {
        analyticsDocs.push(this);
      }
    }

    const lead = {
      _id: '66aabbccddeeff0011223344',
      calendly: null,
      save: jest.fn(async () => {}),
    };
    const LeadModel = {
      findById: jest.fn(async (id) => (id === String(lead._id) ? lead : null)),
      findOne: jest.fn(() => ({ sort: async () => null })),
    };

    const event = {
      event: 'invitee.created',
      created_at: '2026-09-21T12:00:00.000Z',
      payload: {
        uri: 'https://api.calendly.com/scheduled_events/event-1/invitees/invitee-1',
        event: 'https://api.calendly.com/scheduled_events/event-1',
        email: 'buyer@example.com',
        name: 'Buyer Name',
        tracking: {
          utm_source: 'signaltrue',
          utm_medium: 'website',
          utm_campaign: 'lead_confirmation',
          utm_content: 'stlead_66aabbccddeeff0011223344',
        },
      },
    };

    const result = await processCalendlyWebhookEvent(event, {
      AnalyticsModel: FakeAnalytics,
      LeadModel,
      now: new Date('2026-09-21T12:00:01.000Z'),
    });

    expect(result).toMatchObject({
      accepted: true,
      analyticsEvent: 'calendly_booking_created',
      matchedLead: true,
      leadId: '66aabbccddeeff0011223344',
    });
    expect(lead.calendly.status).toBe('scheduled');
    expect(lead.calendly.matchedBy).toBe('tracking_id');
    expect(analyticsDocs).toHaveLength(1);
    expect(analyticsDocs[0]).toMatchObject({
      occurredAt: new Date('2026-09-21T12:00:00.000Z'),
      dedupeKey:
        'calendly:calendly_booking_created:https://api.calendly.com/scheduled_events/event-1/invitees/invitee-1',
    });
    expect(analyticsDocs[0].payload).toMatchObject({
      matchedLead: true,
      matchedBy: 'tracking_id',
      utmCampaign: 'lead_confirmation',
    });
    expect(JSON.stringify(analyticsDocs[0].payload)).not.toContain('buyer@example.com');
    expect(JSON.stringify(analyticsDocs[0].payload)).not.toContain('Buyer Name');

    const duplicate = await processCalendlyWebhookEvent(event, {
      AnalyticsModel: FakeAnalytics,
      LeadModel,
      now: new Date('2026-09-21T12:00:02.000Z'),
    });
    expect(duplicate).toMatchObject({ duplicate: true });
    expect(analyticsDocs).toHaveLength(1);
  });

  test('treats an atomic duplicate-key conflict as a duplicate delivery', async () => {
    class RacingAnalytics {
      constructor(doc) {
        Object.assign(this, doc);
      }
      static async findOne() {
        return null;
      }
      async save() {
        const error = new Error('duplicate key');
        error.code = 11000;
        throw error;
      }
    }
    const lead = {
      _id: '66aabbccddeeff0011223344',
      calendly: null,
      save: jest.fn(async () => {}),
    };
    const LeadModel = {
      findById: jest.fn(async () => lead),
      findOne: jest.fn(() => ({ sort: async () => null })),
    };

    const result = await processCalendlyWebhookEvent(
      {
        event: 'invitee.created',
        created_at: '2026-09-21T12:00:00.000Z',
        payload: {
          uri: 'https://api.calendly.com/scheduled_events/race/invitees/race',
          event: 'https://api.calendly.com/scheduled_events/race',
          tracking: {
            utm_source: 'signaltrue',
            utm_content: 'stlead_66aabbccddeeff0011223344',
          },
        },
      },
      { AnalyticsModel: RacingAnalytics, LeadModel }
    );

    expect(result).toMatchObject({
      duplicate: true,
      analyticsEvent: 'calendly_booking_created',
    });
  });

  test('does not count an unrelated Calendly booking as a SignalTrue conversion', async () => {
    const AnalyticsModel = {
      findOne: jest.fn(async () => null),
    };
    const LeadModel = {
      findById: jest.fn(async () => null),
      findOne: jest.fn(() => ({ sort: async () => null })),
    };

    const result = await processCalendlyWebhookEvent(
      {
        event: 'invitee.created',
        payload: {
          uri: 'https://api.calendly.com/scheduled_events/other/invitees/other',
          event: 'https://api.calendly.com/scheduled_events/other',
          email: 'unrelated@example.com',
          tracking: {},
        },
      },
      { AnalyticsModel, LeadModel }
    );

    expect(result).toEqual({ ignored: true, reason: 'unattributed_booking' });
  });

  test('records a reschedule separately without turning the lead into a cancellation', async () => {
    const analyticsDocs = [];
    class FakeAnalytics {
      constructor(doc) {
        Object.assign(this, doc);
      }
      static async findOne(query) {
        return analyticsDocs.find((doc) => doc.dedupeKey === query.dedupeKey) || null;
      }
      async save() {
        analyticsDocs.push(this);
      }
    }

    const lead = {
      _id: '66aabbccddeeff0011223344',
      calendly: { status: 'scheduled', rescheduled: false },
      save: jest.fn(async () => {}),
    };
    const LeadModel = {
      findById: jest.fn(async () => lead),
      findOne: jest.fn(() => ({ sort: async () => null })),
    };

    const result = await processCalendlyWebhookEvent(
      {
        event: 'invitee.canceled',
        created_at: '2026-09-21T13:00:00.000Z',
        payload: {
          uri: 'https://api.calendly.com/scheduled_events/old/invitees/old',
          event: 'https://api.calendly.com/scheduled_events/old',
          rescheduled: true,
          tracking: {
            utm_source: 'signaltrue',
            utm_content: 'stlead_66aabbccddeeff0011223344',
          },
        },
      },
      { AnalyticsModel: FakeAnalytics, LeadModel }
    );

    expect(result.analyticsEvent).toBe('calendly_booking_rescheduled');
    expect(lead.calendly.status).toBe('scheduled');
    expect(lead.calendly.rescheduled).toBe(true);
    expect(analyticsDocs[0].eventName).toBe('calendly_booking_rescheduled');
  });
});
