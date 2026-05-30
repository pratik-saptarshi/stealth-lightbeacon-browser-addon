import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 88,
        branches: 78,
        functions: 92,
        lines: 88
      }
    }
  }
});
