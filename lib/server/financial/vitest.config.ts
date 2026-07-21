import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@relcko/error': path.resolve(__dirname, '../../../packages/error/src/index.ts'),
      '@relcko/utils': path.resolve(__dirname, '../../../packages/utils/src/index.ts'),
      '@relcko/treasury': path.resolve(__dirname, '../../../packages/treasury/src/index.ts'),
      '@relcko/logging': path.resolve(__dirname, '../../../packages/logging/src/index.ts'),
      '@relcko/performance': path.resolve(__dirname, '../../../packages/performance/src/index.ts'),
      '@relcko/types': path.resolve(__dirname, '../../../packages/treasury/__test_utils__/types-shim.ts'),
      '@': path.resolve(__dirname, '../../..'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
});
