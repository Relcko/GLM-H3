import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@relcko/error': path.resolve(__dirname, 'packages/error/src/index.ts'),
      '@relcko/utils': path.resolve(__dirname, 'packages/utils/src/index.ts'),
      '@relcko/logging': path.resolve(__dirname, 'packages/logging/src/index.ts'),
      '@relcko/performance': path.resolve(__dirname, 'packages/performance/src/index.ts'),
      '@relcko/types': path.resolve(__dirname, 'packages/treasury/__test_utils__/types-shim.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
