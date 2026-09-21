import { describe, expect, jest, test } from '@jest/globals';
import { syncCalendlyCommercialBookings } from '../services/calendlyCommercialSyncService.js';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

describe('Calendly commercial polling sync', () => {
  test('stays disabled without a server-side Calendly access token', async () => {
    const result = await syncCalendlyCommercialBookings({ token: '' });
    expect(result).toMatchObject({
      configured: false,
      mode: 'polling',
      eventsSeen: 0,
      inviteesSeen: 0,
    });
  });

  test('reads scheduled events and translates active/canceled invitees into conversion events', async () => {
    const calls = [];
    const fetchImpl = jest.fn(async (url, options = {}) => {
      const href = String(url);
      calls.push({ href, authorization: options.headers?.authorization });

      if (href === 'https://api.calendly.com/users/me') {
        return jsonResponse({
          resource: { uri: 'https://api.calendly.com/users/user-1' },
        });
      }
      if (href.startsWith('https://api.calendly.com/scheduled_events?')) {
        return jsonResponse({
          collection: [
            {
              uri: 'https://api.calendly.com/scheduled_events/event-1',
              start_time: '2026-09-25T10:00:00.000Z',
            },
          ],
          pagination: { next_page: null },
        });
      }
      if (
        href.startsWith(
          'https://api.calendly.com/scheduled_events/event-1/invitees?'
        )
      ) {
        return jsonResponse({
          collection: [
            {
              uri: 'https://api.calendly.com/scheduled_events/event-1/invitees/invitee-1',
              email: 'buyer@example.com',
              status: 'active',
              created_at: '2026-09-21T12:00:00.000Z',
              tracking: {
                utm_source: 'signaltrue',
                utm_medium: 'website',
                utm_campaign: 'lead_confirmation',
                utm_content: 'stlead_66aabbccddeeff0011223344',
              },
            },
            {
              uri: 'https://api.calendly.com/scheduled_events/event-1/invitees/invitee-2',
              email: 'canceled@example.com',
              status: 'canceled',
              created_at: '2026-09-20T12:00:00.000Z',
              updated_at: '2026-09-21T11:00:00.000Z',
              cancellation: { created_at: '2026-09-21T11:00:00.000Z' },
              tracking: {
                utm_source: 'signaltrue',
                utm_medium: 'email',
                utm_campaign: 'lead_confirmation_email',
              },
            },
          ],
          pagination: { next_page: null },
        });
      }

      throw new Error(`Unexpected URL: ${href}`);
    });

    const processed = [];
    const processEvent = jest.fn(async (event) => {
      processed.push(event);
      return { accepted: true };
    });

    const result = await syncCalendlyCommercialBookings({
      token: 'secret-token',
      now: new Date('2026-09-21T12:00:00.000Z'),
      fetchImpl,
      processEvent,
    });

    expect(result).toMatchObject({
      configured: true,
      mode: 'polling',
      eventsSeen: 1,
      inviteesSeen: 2,
      accepted: 3,
      duplicates: 0,
      ignored: 0,
    });
    expect(processed.map((item) => item.event)).toEqual([
      'invitee.created',
      'invitee.created',
      'invitee.canceled',
    ]);
    expect(processed[0].payload.event).toBe(
      'https://api.calendly.com/scheduled_events/event-1'
    );
    expect(calls.every((call) => call.authorization === 'Bearer secret-token')).toBe(true);
  });

  test('rejects pagination to a non-Calendly origin', async () => {
    const fetchImpl = jest.fn(async (url) => {
      const href = String(url);
      if (href === 'https://api.calendly.com/users/me') {
        return jsonResponse({
          resource: { uri: 'https://api.calendly.com/users/user-1' },
        });
      }
      if (href.startsWith('https://api.calendly.com/scheduled_events?')) {
        return jsonResponse({
          collection: [],
          pagination: { next_page: 'https://evil.example/steal-token' },
        });
      }
      throw new Error(`Unexpected URL: ${href}`);
    });

    await expect(
      syncCalendlyCommercialBookings({
        token: 'secret-token',
        now: new Date('2026-09-21T12:00:00.000Z'),
        fetchImpl,
        processEvent: async () => ({ accepted: true }),
      })
    ).rejects.toThrow(/unexpected origin/i);
  });
});
