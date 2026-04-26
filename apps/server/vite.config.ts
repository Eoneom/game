import { defineConfig, type Plugin } from 'vitest/config'
import { promises as fs } from 'fs'
import path from 'path'
import { build as esbuildBuild } from 'esbuild'

const migrationsSrcDir = path.resolve(__dirname, 'src/adapter/database/migrations')
const migrationsOutDir = path.resolve(__dirname, 'dist/migrations')

function compileMigrationsPlugin(): Plugin {
  return {
    name: 'compile-migrations',
    async closeBundle() {
      const files = (await fs.readdir(migrationsSrcDir))
        .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))

      await fs.mkdir(migrationsOutDir, { recursive: true })

      await Promise.all(files.map((file) => esbuildBuild({
        entryPoints: [ path.join(migrationsSrcDir, file) ],
        outfile: path.join(migrationsOutDir, file.replace(/\.ts$/, '.js')),
        platform: 'node',
        format: 'cjs',
        target: 'node24',
        bundle: true,
        external: [ 'kysely' ],
      })))
    },
  }
}

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
  plugins: [ compileMigrationsPlugin() ],
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
        'pg-boss',
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
    setupFiles: [ './src/test-support/vitest-setup.ts' ],
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
