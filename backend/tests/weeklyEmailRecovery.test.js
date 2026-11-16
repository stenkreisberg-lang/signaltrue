import { describe, expect, test } from '@jest/globals';
import {
  selectPendingWeeklyOrganizations,
  weeklyDeliveryIsComplete,
} from '../services/weeklyEmailScheduler.js';

describe('weekly organisation email recovery', () => {
  const orgs = [
    { _id: 'org-1', name: 'Already delivered' },
    { _id: 'org-2', name: 'Failed once' },
    { _id: 'org-3', name: 'New organisation' },
  ];

  test('partial weekly delivery must stay incomplete', () => {
    expect(weeklyDeliveryIsComplete('partial')).toBe(false);
    expect(weeklyDeliveryIsComplete('failed')).toBe(false);
    expect(weeklyDeliveryIsComplete(undefined)).toBe(false);
    expect(weeklyDeliveryIsComplete('success')).toBe(true);
  });

  test('retries failed and newly active organisations but not delivered organisations', () => {
    const pending = selectPendingWeeklyOrganizations(orgs, [
      { orgId: 'org-1', status: 'sent' },
      { orgId: 'org-2', status: 'failed', error: 'temporary' },
    ]);
    expect(pending.map(org => org._id)).toEqual(['org-2', 'org-3']);
  });

  test('does not retry an organisation already confirmed by a previous attempt', () => {
    const pending = selectPendingWeeklyOrganizations(orgs, [
      { orgId: 'org-1', status: 'sent' },
      { orgId: 'org-2', status: 'sent' },
      { orgId: 'org-3', status: 'sent' },
    ]);
    expect(pending).toEqual([]);
  });
});
