import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 15000,
    teardownTimeout: 15000,
    setupFiles: ['./test/e2e/setup.ts'],
    include: ['test/e2e/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    // Run E2E tests sequentially to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Test isolation
    isolate: true,
    // Coverage configuration (disabled for E2E)
    coverage: {
      enabled: false,
    },

    // Retry failed tests once in E2E
    retry: 1,
    // Bail on first failure in E2E to save time
    bail: 1,
  },
});
