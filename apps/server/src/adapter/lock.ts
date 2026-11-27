import { Lock } from '#app/port/lock'
import { AppLogger } from '#app/port/logger'

export class LockInMemory implements Lock {
  private cache: Set<string>
  private tails: Map<string, Promise<void>>
  private logger: AppLogger

  constructor({ logger }: { logger: AppLogger }) {
    this.logger = logger
    this.cache = new Set<string>()
    this.tails = new Map<string, Promise<void>>()
  }

  has(key: string): boolean {
    const has_key = this.cache.has(key)
    this.logger.debug(`has ${key}: ${has_key}`)
    return has_key
  }

  set(key: string): void {
    this.logger.debug(`set ${key}`)
    this.cache.add(key)
  }

  delete(key: string): void {
    this.logger.debug(`delete ${key}`)
    this.cache.delete(key)
  }

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve()
    let release: () => void = () => undefined
    const current = new Promise<void>(resolve => {
      release = resolve
    })
    const tail = previous.then(() => current)
    this.tails.set(key, tail)

    await previous
    this.logger.debug(`acquired ${key}`)
    try {
      return await fn()
    } finally {
      release()
      if (this.tails.get(key) === tail) {
        this.tails.delete(key)
      }
      this.logger.debug(`released ${key}`)
    }
  }
}
