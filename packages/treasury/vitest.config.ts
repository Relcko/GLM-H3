import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@relcko/error': path.resolve(__dirname, '../error/src/index.ts'),
      '@relcko/utils': path.resolve(__dirname, '../utils/src/index.ts'),
      '@relcko/treasury': path.resolve(__dirname, 'src/index.ts'),
      '@relcko/logging': path.resolve(__dirname, '../logging/src/index.ts'),
      '@relcko/performance': path.resolve(__dirname, '../performance/src/index.ts'),
      '@relcko/types': path.resolve(__dirname, '__test_utils__/types-shim.ts'),
      '@relcko/events': path.resolve(__dirname, '../events/src/index.ts'),
      '@relcko/event-store': path.resolve(__dirname, '../event-store/src/index.ts'),
      '@relcko/projections': path.resolve(__dirname, '../projections/src/index.ts'),
      '@relcko/test-utils': path.resolve(__dirname, '../test-utils/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
