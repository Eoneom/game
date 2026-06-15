import assert from 'assert'
import { FactionCode } from '#core/faction/constant/code'
import { FactionError } from '#core/faction/error'
import { FactionService } from '#core/faction/service'

describe('FactionService', () => {
  it('accepts a known faction code', () => {
    assert.doesNotThrow(() => FactionService.assertKnown(FactionCode.THE_CONFEDERATION))
  })

  it('rejects an unknown faction code', () => {
    assert.throws(
      () => FactionService.assertKnown('unknown_faction'),
      new RegExp(FactionError.NOT_FOUND)
    )
  })
})
