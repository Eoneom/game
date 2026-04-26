import { AsyncLocalStorage } from 'node:async_hooks'
import type { Kysely } from 'kysely'
import type { DB } from '#adapter/database/types'
import { createDatabase } from '#adapter/database/client'

export type DatabaseExecutor = Kysely<DB>

const storage = new AsyncLocalStorage<DatabaseExecutor>()

let root_database: Kysely<DB> | null = null

export function getRootDatabase(): Kysely<DB> {
  if (!root_database) {
    root_database = createDatabase()
  }

  return root_database
}

export function setRootDatabase(db: Kysely<DB>): void {
  root_database = db
}

export function getDatabase(): DatabaseExecutor {
  return storage.getStore() ?? getRootDatabase()
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const existing = storage.getStore()
  if (existing) {
    return fn()
  }

  return getRootDatabase().transaction().execute(async (trx) => {
    return storage.run(trx, () => fn())
  })
}
