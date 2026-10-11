import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ignored build checkouts are release evidence, not a second test suite.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
