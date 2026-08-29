import { isHealthCheckRequest } from '../middleware/security.js';

describe('health-check rate-limit exemption', () => {
  test.each([
    '/api/health',
    '/api/health/live',
    '/api/health/ready',
    '/api/health/ready?probe=render',
  ])('exempts %s', (originalUrl) => {
    expect(isHealthCheckRequest({ originalUrl })).toBe(true);
  });

  test.each(['/api/healthcheck', '/api/reminders/check-followups', '/api/users'])(
    'does not exempt %s',
    (originalUrl) => {
      expect(isHealthCheckRequest({ originalUrl })).toBe(false);
    }
  );

  test('uses the original URL when the limiter is mounted below /api', () => {
    expect(
      isHealthCheckRequest({
        originalUrl: '/api/health/ready',
        path: '/health/ready',
      })
    ).toBe(true);
  });
});
