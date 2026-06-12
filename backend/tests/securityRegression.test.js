import { afterEach, describe, expect, jest, test } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';
import TeamSizeGate from '../models/teamSizeGate.js';
import { requireOrganizationAccess, requireTeamAccess } from '../middleware/auth.js';
import { checkPrivacyGate, privacyGate } from '../middleware/privacyGate.js';
import { decryptString, encryptString } from '../utils/crypto.js';
import { resolveMinimumTeamSize } from '../utils/privacyGate.js';
import analyticsRoutes from '../routes/analytics.js';
import internalScoringRoutes from '../routes/internalScoringRoutes.js';

function responseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function mockTeamLookup(team) {
  return jest.spyOn(Team, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue(team),
  });
}

function mockPrivacyTeamLookup(team) {
  return jest.spyOn(Team, 'findById').mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(team),
    }),
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-service-token';
});

describe('tenant authorization', () => {
  test('rejects access to a different organization', () => {
    const req = { params: { orgId: 'org-b' }, body: {}, query: {}, user: { orgId: 'org-a' } };
    const res = responseMock();
    const next = jest.fn();

    requireOrganizationAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a team owned by another organization', async () => {
    mockTeamLookup({ _id: 'team-b', orgId: 'org-b' });
    const req = { params: { teamId: 'team-b' }, body: {}, query: {}, user: { orgId: 'org-a' } };
    const res = responseMock();
    const next = jest.fn();

    await requireTeamAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('limits managers to their assigned team', async () => {
    mockTeamLookup({ _id: 'team-b', orgId: 'org-a' });
    const req = {
      params: { teamId: 'team-b' },
      body: {},
      query: {},
      user: { orgId: 'org-a', teamId: 'team-a', role: 'manager' },
    };
    const res = responseMock();
    const next = jest.fn();

    await requireTeamAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('privacy enforcement', () => {
  test('never permits an organization override below five', async () => {
    jest.spyOn(Organization, 'findById').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ settings: { minTeamSize: 1 } }),
      }),
    });

    await expect(resolveMinimumTeamSize('org-a')).resolves.toBe(5);
  });

  test('returns a suppression body with HTTP 200', async () => {
    mockPrivacyTeamLookup({ _id: 'team-a', orgId: 'org-a', metadata: { actualSize: 4 } });
    jest.spyOn(Organization, 'findById').mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    });
    jest.spyOn(TeamSizeGate, 'create').mockResolvedValue({});
    jest.spyOn(Team, 'findByIdAndUpdate').mockResolvedValue({});
    const req = {
      params: { teamId: 'team-a' },
      query: {},
      body: {},
      method: 'GET',
      originalUrl: '/api/example/team/team-a',
    };
    const res = responseMock();

    await privacyGate(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ suppressed: true, minRequired: 5 })
    );
  });

  test('fails closed when the privacy lookup fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Team, 'findById').mockReturnValue({
      select: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('db down')) }),
    });

    await expect(checkPrivacyGate('team-a')).resolves.toEqual(
      expect.objectContaining({ passed: false, reason: 'privacy_gate_unavailable' })
    );
  });
});

describe('token encryption', () => {
  test('encrypts once and decrypts back to the original value', () => {
    const encrypted = encryptString('refresh-token');
    expect(encrypted).toMatch(/^enc:gcm:/);
    expect(encryptString(encrypted)).toBe(encrypted);
    expect(decryptString(encrypted)).toBe('refresh-token');
  });

  test('fails closed in production when the encryption key is missing', () => {
    const previousEnv = process.env.NODE_ENV;
    const previousKey = process.env.TOKEN_ENCRYPTION_KEY;
    const previousLegacyKey = process.env.SECRET_KEY;
    process.env.NODE_ENV = 'production';
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.SECRET_KEY;

    try {
      expect(() => encryptString('refresh-token')).toThrow('TOKEN_ENCRYPTION_KEY is required');
    } finally {
      process.env.NODE_ENV = previousEnv;
      process.env.TOKEN_ENCRYPTION_KEY = previousKey;
      if (previousLegacyKey === undefined) delete process.env.SECRET_KEY;
      else process.env.SECRET_KEY = previousLegacyKey;
    }
  });
});

describe('protected service surfaces', () => {
  test('requires authentication for analytics reads', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRoutes);

    await request(app).get('/api/analytics/summary').expect(401);
  });

  test('rejects malformed public analytics events', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRoutes);

    await request(app)
      .post('/api/analytics/track')
      .send({ event: '<script>alert(1)</script>', data: {} })
      .expect(400);
  });

  test('requires the internal service token in every environment', async () => {
    const app = express();
    app.use(express.json());
    app.use('/internal/scoring', internalScoringRoutes);

    await request(app).post('/internal/scoring/run/team-a').send({}).expect(401);
  });
});
