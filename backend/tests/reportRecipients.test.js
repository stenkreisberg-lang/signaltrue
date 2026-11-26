import { afterEach, expect, jest, test } from '@jest/globals';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import WeeklyBriefDispatch from '../models/weeklyBriefDispatch.js';
import { currentReportRecipients, verifyClaimRecipients } from '../services/reportRecipients.js';

const query = (value) => ({ select: () => ({ lean: async () => value }) });
afterEach(() => jest.restoreAllMocks());
test('an explicitly approved empty recipient list pauses delivery', async () => {
  jest
    .spyOn(Organization, 'findById')
    .mockReturnValue(
      query({
        settings: { weeklyBriefRecipientsApprovedAt: new Date(), weeklyBriefRecipients: [] },
      })
    );
  const users = jest.spyOn(User, 'find').mockReturnValue(query([{ email: 'hr@example.org' }]));
  expect(await currentReportRecipients('tenant')).toEqual([]);
  expect(users).toHaveBeenCalledWith(
    expect.objectContaining({ orgId: 'tenant', accountStatus: 'active' })
  );
});
test('a retired organisation cannot send an already prepared report', async () => {
  jest.spyOn(Organization, 'findById').mockReturnValue(query({ lifecycleStatus: 'retired' }));
  const users = jest.spyOn(User, 'find');
  const release = jest
    .spyOn(WeeklyBriefDispatch, 'deleteOne')
    .mockResolvedValue({ deletedCount: 1 });
  await expect(verifyClaimRecipients('tenant', 'dispatch', ['hr@example.org'])).rejects.toThrow(
    'recipients changed'
  );
  expect(users).not.toHaveBeenCalled();
  expect(release).toHaveBeenCalledWith({
    _id: 'dispatch',
    orgId: 'tenant',
    status: 'sending',
    providerMessageId: null,
  });
});
