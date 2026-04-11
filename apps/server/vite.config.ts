import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '#adapter': path.resolve(__dirname, 'src/adapter'),
      '#app': path.resolve(__dirname, 'src/app'),
      '#command': path.resolve(__dirname, 'src/app/command'),
      '#core': path.resolve(__dirname, 'src/core'),
      '#cron': path.resolve(__dirname, 'src/cron'),
      '#query': path.resolve(__dirname, 'src/app/query'),
      '#shared': path.resolve(__dirname, 'src/shared'),
      '#type': path.resolve(__dirname, 'src/core/type'),
      '#web': path.resolve(__dirname, 'src/web'),
      '@server-core': path.resolve(__dirname, 'src/core'),
      '@eoneom/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
    },
    tsconfigPaths: true,
  },
  build: {
    target: 'node24',
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
    ssr: 'src/index.ts',
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: 'index.js',
      },
      external: [
        'express',
        'kysely',
        'pg',
        'ws',
        'uuid',
        'dotenv',
        'pino',
        'node-cron',
        'cors',
        'body-parser',
        '@eoneom/api-client',
      ],
    },
  },
  test: {
    environment: 'node',
    include: [ 'src/**/*.spec.ts' ],
    globals: true,
    fileParallelism: true,
    coverage: {
      provider: 'v8',
      reporter: [ 'text', 'lcov' ],
      reportsDirectory: 'coverage',
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        'src/**/*.d.ts',
        'src/adapter/**',
      ],
    },
  },
})
