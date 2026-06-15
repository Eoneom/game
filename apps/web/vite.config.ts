import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '../..')
const clientSrc = path.join(repoRoot, 'packages', 'api-client', 'src')
const serverCore = path.join(repoRoot, 'apps', 'server', 'src', 'core')
const webSrc = path.join(__dirname, 'src')

export default defineConfig({
  plugins: [ react(), tailwindcss() ],
  resolve: {
    alias: {
      '#helpers': path.resolve(webSrc, 'helpers'),
      '#hook': path.resolve(webSrc, 'hook'),
      '#location': path.resolve(webSrc, 'modules/location'),
      '#auth': path.resolve(webSrc, 'modules/auth'),
      '#faction': path.resolve(webSrc, 'modules/faction'),
      '#building': path.resolve(webSrc, 'modules/building'),
      '#city': path.resolve(webSrc, 'modules/city'),
      '#cost': path.resolve(webSrc, 'modules/cost'),
      '#communication': path.resolve(webSrc, 'modules/communication'),
      '#map': path.resolve(webSrc, 'modules/map'),
      '#movement': path.resolve(webSrc, 'modules/movement'),
      '#outpost': path.resolve(webSrc, 'modules/outpost'),
      '#requirement': path.resolve(webSrc, 'modules/requirement'),
      '#technology': path.resolve(webSrc, 'modules/technology'),
      '#troop': path.resolve(webSrc, 'modules/troop'),
      '#types': path.resolve(webSrc, 'types'),
      '#ui': path.resolve(webSrc, 'ui'),
      '@eoneom/api-client': path.join(clientSrc, 'index.ts'),
      '@server-core': serverCore,
    },
  },
  server: {
    port: 3001,
    open: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    fileParallelism: true,
    setupFiles: [ 'src/setupTests.ts' ],
    include: [ 'src/**/*.{test,spec}.{ts,tsx}' ],
    coverage: {
      provider: 'v8',
      reporter: [ 'text', 'lcov' ],
    },
  },
})
