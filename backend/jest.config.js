export default {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/uploads/**',
  ],
  coverageThreshold: {
    global: {
      branches: 17,
      functions: 22,
      lines: 20,
      statements: 20,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.js'],
  // Cloud-sync conflict copies ("foo 2.test.js") would otherwise run twice
  // against stale code and report confusing failures.
  testPathIgnorePatterns: ['/node_modules/', '\\s\\d+\\.test\\.js$'],
  verbose: true,
};
