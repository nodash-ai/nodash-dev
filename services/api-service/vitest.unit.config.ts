import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 5000,
    teardownTimeout: 5000,
    setupFiles: ['./test/setup.ts'],
    include: ['test/adapters/**/*.test.ts', 'test/config/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
    // Performance optimizations for unit tests
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
      reporter: ['text', 'json'],
      exclude: ['node_modules/**', 'dist/**', 'test/**', 'scripts/**', '*.config.*'],
    },
  },
});
