import { describe, expect, jest, test } from '@jest/globals';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-brief-response-signing';

const actionFind = jest.fn();
jest.unstable_mockModule('../models/action.js', () => ({
  default: { find: actionFind },
}));
jest.unstable_mockModule('../models/organizationModel.js', () => ({
  default: {},
  ACTIVE_ORG_FILTER: { lifecycleStatus: { $ne: 'retired' } },
}));
jest.unstable_mockModule('../models/monthlyReport.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/signal.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/ceoSummary.js', () => ({ default: {} }));

const { buildBriefResponseUrl, signBriefResponse } = await import('../routes/briefResponse.js');
const { buildDecisionLog } = await import('../services/ceoSummaryService.js');

const orgId = '507f1f77bcf86cd799439011';

function mockActions(actions) {
  actionFind.mockReturnValue({
    sort: () => ({ limit: () => ({ lean: () => Promise.resolve(actions) }) }),
  });
}

describe('active organization filter', () => {
  test('matches organizations that were never given a lifecycle status', async () => {
    const { ACTIVE_ORG_FILTER } = await import('../models/organizationModel.js');
    // $ne matches missing fields, so existing organizations stay active
    // without a migration and only an explicit retirement excludes them.
    expect(ACTIVE_ORG_FILTER).toEqual({ lifecycleStatus: { $ne: 'retired' } });
  });
});

describe('brief response links', () => {
  test('signature is stable for the same response and differs per response', () => {
    const useful = signBriefResponse(orgId, '2026-W34', 'useful');
    expect(signBriefResponse(orgId, '2026-W34', 'useful')).toBe(useful);
    expect(signBriefResponse(orgId, '2026-W34', 'not_useful')).not.toBe(useful);
  });

  test('signature is bound to the organization and the week', () => {
    const base = signBriefResponse(orgId, '2026-W34', 'useful');
    expect(signBriefResponse('507f1f77bcf86cd799439012', '2026-W34', 'useful')).not.toBe(base);
    expect(signBriefResponse(orgId, '2026-W35', 'useful')).not.toBe(base);
  });

  test('link carries every field the endpoint verifies', () => {
    const url = new URL(buildBriefResponseUrl(orgId, '2026-W34', 'nothing_to_act_on'));
    expect(url.searchParams.get('org')).toBe(orgId);
    expect(url.searchParams.get('week')).toBe('2026-W34');
    expect(url.searchParams.get('response')).toBe('nothing_to_act_on');
    expect(url.searchParams.get('sig')).toBe(
      signBriefResponse(orgId, '2026-W34', 'nothing_to_act_on')
    );
  });
});

describe('decision log', () => {
  test('says nothing has been recorded rather than implying success', async () => {
    mockActions([]);
    const log = await buildDecisionLog(orgId, new Date());
    expect(log.actionsTaken).toBe(0);
    expect(log.outcomesMeasured).toBe(0);
    expect(log.summary).toMatch(/No changes have been recorded/);
  });

  test('separates recorded changes from measured outcomes', async () => {
    mockActions([
      { action: 'Cut recurring meetings', status: 'In Progress', createdDate: new Date() },
      { action: 'Protect focus blocks', status: 'In Progress', createdDate: new Date() },
    ]);
    const log = await buildDecisionLog(orgId, new Date());
    expect(log.actionsTaken).toBe(2);
    expect(log.outcomesMeasured).toBe(0);
    expect(log.summary).toMatch(/awaiting measurement/);
  });

  test('reports measured outcomes without counting the undecided ones', async () => {
    mockActions([
      {
        action: 'Cut recurring meetings',
        status: 'Completed',
        outcome: { rating: 'Worked' },
        createdDate: new Date(),
      },
      {
        action: 'Protect focus blocks',
        status: 'Completed',
        outcome: { rating: 'Partially Worked' },
        createdDate: new Date(),
      },
      {
        action: 'Rebalance on-call',
        status: 'Completed',
        outcome: { rating: 'Did Not Work' },
        createdDate: new Date(),
      },
      {
        action: 'Stagger deadlines',
        status: 'In Progress',
        outcome: { rating: 'Too Early To Tell' },
        createdDate: new Date(),
      },
    ]);
    const log = await buildDecisionLog(orgId, new Date());
    expect(log.actionsTaken).toBe(4);
    // "Too early to tell" is not an outcome, so it must not inflate the count.
    expect(log.outcomesMeasured).toBe(3);
    expect(log.worked).toBe(1);
    expect(log.didNotWork).toBe(1);
    expect(log.tooEarly).toBe(1);
    expect(log.summary).toMatch(/2 moved the metric in the intended direction, 1 did not/);
  });

  test('keeps the entry list short enough for an executive summary', async () => {
    mockActions(
      Array.from({ length: 25 }, (_, i) => ({
        action: `Change ${i}`,
        status: 'In Progress',
        createdDate: new Date(),
      }))
    );
    const log = await buildDecisionLog(orgId, new Date());
    expect(log.actionsTaken).toBe(25);
    expect(log.entries).toHaveLength(10);
  });
});
