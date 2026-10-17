import express from 'express'
import type { AddressInfo } from 'node:net'
import { router } from './router'

const withServer = async (run: (baseUrl: string) => Promise<void>) => {
  const app = express()
  app.use(router())
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const address = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${address.port}`
  try {
    await run(baseUrl)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }
}

describe('router health routes', () => {
  it('GET /api/v1/health is public and returns status ok', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/v1/health`)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ status: 'ok' })
    })
  })

  it('GET /health redirects to canonical URL', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/health`, { redirect: 'manual' })
      expect(res.status).toBe(308)
      expect(res.headers.get('location')).toBe('/api/v1/health')
    })
  })

  it('GET / redirects to canonical URL', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/`, { redirect: 'manual' })
      expect(res.status).toBe(308)
      expect(res.headers.get('location')).toBe('/api/v1/health')
    })
  })
})
