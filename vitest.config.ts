import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    tsconfigPaths({
      ignoreConfigErrors: true,
    }),
  ],
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', 'examples/next/e2e/**', '**/dist/**'],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
})
