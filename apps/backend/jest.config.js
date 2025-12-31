/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts', '**/*.e2e.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  
  // E2E tests may take longer
  testTimeout: 120000, // 2 minutes
  
  // Setup file for environment variables
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Run tests sequentially for e2e
  maxWorkers: 1,
};

