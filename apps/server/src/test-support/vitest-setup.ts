import { beforeEach } from 'vitest'
import { setRootDatabase } from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import type { Kysely } from 'kysely'

function createFakeDatabase(): Kysely<DB> {
  const db = {
    transaction() {
      return {
        execute: async <T>(fn: (trx: typeof db) => Promise<T>): Promise<T> => fn(db),
      }
    },
  }

  return db as unknown as Kysely<DB>
}

setRootDatabase(createFakeDatabase())

beforeEach(() => {
  setRootDatabase(createFakeDatabase())
})
