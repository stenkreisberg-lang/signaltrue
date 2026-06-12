process.env.JWT_SECRET ||= 'test-jwt-secret-at-least-thirty-two-characters';
process.env.TOKEN_ENCRYPTION_KEY ||= 'a'.repeat(64);
process.env.INTERNAL_SERVICE_TOKEN ||= 'test-internal-service-token';
