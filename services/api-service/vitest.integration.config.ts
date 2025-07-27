import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 15000,
    teardownTimeout: 10000,
    setupFiles: ['./test/setup.ts', './test/integration/setup.ts'],
    include: ['test/integration/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    // Performance optimizations - use forks for integration tests to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run integration tests sequentially to avoid server port conflicts
      },
    },
    // Test isolation
    isolate: true,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'test/**', 'scripts/**', '*.config.*'],
    },
  },
});
