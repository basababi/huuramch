import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The end-to-end suite boots the compiled server; give it room on slow CI machines.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
