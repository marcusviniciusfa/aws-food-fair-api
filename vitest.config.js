import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    includeSource: ['test'],
    coverage: {
      all: true,
    },
    reporters: 'verbose',
  },
})
