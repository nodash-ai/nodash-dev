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
    // Performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2,
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
