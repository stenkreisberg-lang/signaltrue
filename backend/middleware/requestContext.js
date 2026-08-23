import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS || 2000);

export function requestContext(req, res, next) {
  const suppliedId = req.get?.('x-request-id');
  req.requestId = REQUEST_ID_PATTERN.test(suppliedId || '') ? suppliedId : randomUUID();
  res.setHeader('X-Request-ID', req.requestId);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    if (res.statusCode < 500 && durationMs < SLOW_REQUEST_MS) return;

    const event = {
      event: 'http_request_completed',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?._id?.toString(),
    };
    const log = res.statusCode >= 500 ? console.error : console.warn;
    log('[HTTP]', event);
  });

  next();
}

export default requestContext;
