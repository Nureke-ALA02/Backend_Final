module.exports = {
  testEnvironment: 'node',

  // We split by folder. Use --selectProjects to run a subset.
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
    },
  ],

  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',     // entry point — exercised by integration tests through buildApp()
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov'],
};
