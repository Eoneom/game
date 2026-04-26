import assert from 'assert'
import {
  getDatabase,
  getRootDatabase,
  setRootDatabase,
  withTransaction
} from '#adapter/database/context'
import type { DB } from '#adapter/database/types'
import type { Kysely } from 'kysely'

describe('database context', () => {
  const fake_trx = { kind: 'trx' } as unknown as Kysely<DB>

  let execute: ReturnType<typeof vi.fn>
  let transaction: ReturnType<typeof vi.fn>

  beforeEach(() => {
    execute = vi.fn(async (fn: (trx: Kysely<DB>) => Promise<unknown>) => fn(fake_trx))
    transaction = vi.fn(() => ({ execute }))
    setRootDatabase({ transaction } as unknown as Kysely<DB>)
  })

  it('returns the root database when no transaction is active', () => {
    assert.strictEqual(getDatabase(), getRootDatabase())
  })

  it('starts a transaction and exposes it via getDatabase', async () => {
    await withTransaction(async () => {
      assert.strictEqual(getDatabase(), fake_trx)
    })

    assert.strictEqual(transaction.mock.calls.length, 1)
    assert.strictEqual(execute.mock.calls.length, 1)
  })

  it('joins an existing transaction without starting another', async () => {
    await withTransaction(async () => {
      await withTransaction(async () => {
        assert.strictEqual(getDatabase(), fake_trx)
      })
    })

    assert.strictEqual(transaction.mock.calls.length, 1)
    assert.strictEqual(execute.mock.calls.length, 1)
  })

  it('propagates errors from the callback so the transaction can roll back', async () => {
    await assert.rejects(
      () => withTransaction(async () => {
        throw new Error('boom')
      }),
      /boom/
    )

    assert.strictEqual(execute.mock.calls.length, 1)
  })
})
