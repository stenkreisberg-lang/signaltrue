import { afterEach, describe, expect, jest, test } from '@jest/globals';
import DSARRequest from '../models/dsarRequest.js';
import { recoverStaleDSARRequests } from '../routes/privacyDSARRoutes.js';

afterEach(() => jest.restoreAllMocks());

describe('durable privacy-request processing', () => {
  test('reclaims only expired approved processing work', async () => {
    const now = new Date('2026-11-10T16:00:00Z');
    jest.spyOn(DSARRequest, 'find').mockReturnValue({
      select: () => ({ limit: () => ({ lean: async () => [{ _id: 'dsar-1' }] }) }),
    });
    const claim = jest.spyOn(DSARRequest, 'findOneAndUpdate').mockResolvedValue({
      _id: 'dsar-1', status: 'processing', requestType: 'rectify',
    });
    const saved = jest.spyOn(DSARRequest, 'updateOne').mockResolvedValue({ acknowledged: true });
    await expect(recoverStaleDSARRequests(now)).resolves.toEqual({ recovered: 1 });
    expect(claim).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'processing',
        $or: expect.arrayContaining([{ processingLeaseUntil: { $lte: now } }]) }),
      expect.objectContaining({ $inc: { processingAttempts: 1 } }),
      expect.any(Object)
    );
    expect(saved).toHaveBeenCalledWith(
      { _id: 'dsar-1', status: 'processing' },
      { $set: expect.objectContaining({ status: 'awaiting_manual',
        completedAt: null, processingLeaseUntil: null }) }
    );
  });

  test('does not claim pending or unexpired requests', async () => {
    jest.spyOn(DSARRequest, 'find').mockReturnValue({
      select: () => ({ limit: () => ({ lean: async () => [] }) }),
    });
    const claim = jest.spyOn(DSARRequest, 'findOneAndUpdate');
    await expect(recoverStaleDSARRequests()).resolves.toEqual({ recovered: 0 });
    expect(claim).not.toHaveBeenCalled();
  });
});
