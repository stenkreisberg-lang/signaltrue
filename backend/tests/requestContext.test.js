import { EventEmitter } from 'node:events';
import { describe, test, expect, jest, afterEach } from '@jest/globals';
import requestContext from '../middleware/requestContext.js';

const createResponse = () => {
  const response = new EventEmitter();
  response.statusCode = 200;
  response.setHeader = jest.fn();
  return response;
};

describe('request context middleware', () => {
  afterEach(() => jest.restoreAllMocks());

  test('generates and returns a request ID', () => {
    const req = { get: jest.fn(), method: 'GET', path: '/api/test' };
    const res = createResponse();
    const next = jest.fn();

    requestContext(req, res, next);

    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('preserves a safe caller-supplied request ID', () => {
    const req = {
      get: jest.fn().mockReturnValue('upstream:request-123'),
      method: 'GET',
      path: '/api/test',
    };
    const res = createResponse();

    requestContext(req, res, jest.fn());

    expect(req.requestId).toBe('upstream:request-123');
  });

  test('logs failed requests without logging request contents', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const req = { get: jest.fn(), method: 'POST', path: '/api/test', body: { secret: 'hidden' } };
    const res = createResponse();

    requestContext(req, res, jest.fn());
    res.statusCode = 500;
    res.emit('finish');

    expect(errorSpy).toHaveBeenCalledWith(
      '[HTTP]',
      expect.objectContaining({
        event: 'http_request_completed',
        requestId: req.requestId,
        path: '/api/test',
        statusCode: 500,
      })
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('hidden');
  });
});
