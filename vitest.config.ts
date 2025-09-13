import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test configuration
    globals: true,
    environment: 'node',
    
    // Test patterns
    include: ['src/**/*.{test,spec}.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**'
    ],

    // Coverage for TypeScript library
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/lib/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },

    // Performance and reliability
    testTimeout: 30000,
    hookTimeout: 10000
  }
})