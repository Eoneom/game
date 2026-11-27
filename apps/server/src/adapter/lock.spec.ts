import { LockInMemory } from '#adapter/lock'
import { AppLogger } from '#app/port/logger'

const logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(),
} as unknown as AppLogger

const tick = () => new Promise(resolve => setTimeout(resolve, 1))

describe('LockInMemory.runExclusive', () => {
  it('runs holders of one key one at a time, in arrival order', async () => {
    const lock = new LockInMemory({ logger })
    const events: string[] = []
    const holder = (name: string) => lock.runExclusive('exchange:f:plastic', async () => {
      events.push(`${name}:start`)
      await tick()
      events.push(`${name}:end`)
      return name
    })

    const results = await Promise.all([
      holder('a'),
      holder('b'),
      holder('c')
    ])

    expect(results).toEqual([
      'a',
      'b',
      'c'
    ])
    expect(events).toEqual([
      'a:start',
      'a:end',
      'b:start',
      'b:end',
      'c:start',
      'c:end',
    ])
  })

  it('lets other keys run meanwhile and releases the key when the holder fails', async () => {
    const lock = new LockInMemory({ logger })
    const events: string[] = []
    const failing = lock.runExclusive('k1', async () => {
      events.push('k1:start')
      await tick()
      throw new Error('boom')
    })
    const other = lock.runExclusive('k2', async () => {
      events.push('k2:start')
    })
    const next = lock.runExclusive('k1', async () => {
      events.push('k1:next')
    })

    await expect(failing).rejects.toThrow('boom')
    await Promise.all([
      other,
      next
    ])
    expect(events).toEqual([
      'k1:start',
      'k2:start',
      'k1:next'
    ])
  })
})
