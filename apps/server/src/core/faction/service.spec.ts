import assert from 'assert'
import { FactionCode } from '#core/faction/constant/code'
import { FactionError } from '#core/faction/error'
import { FactionService } from '#core/faction/service'

describe('FactionService', () => {
  it('accepts a known faction code', () => {
    assert.doesNotThrow(() => FactionService.assertKnown(FactionCode.THE_CONFEDERATION))
  })

  it('accepts a non-playable faction code as known', () => {
    assert.doesNotThrow(() => FactionService.assertKnown(FactionCode.THE_TECHNOLOGICAL_SINGULARITY))
  })

  it('rejects an unknown faction code', () => {
    assert.throws(
      () => FactionService.assertKnown('unknown_faction'),
      new RegExp(FactionError.NOT_FOUND)
    )
  })

  it('accepts a playable faction code', () => {
    assert.doesNotThrow(() => FactionService.assertPlayable(FactionCode.THE_CONFEDERATION))
  })

  it('rejects an unknown faction code as not playable', () => {
    assert.throws(
      () => FactionService.assertPlayable('unknown_faction'),
      new RegExp(FactionError.NOT_FOUND)
    )
  })

  it('rejects a non-playable faction code', () => {
    assert.throws(
      () => FactionService.assertPlayable(FactionCode.THE_TECHNOLOGICAL_SINGULARITY),
      new RegExp(FactionError.NOT_PLAYABLE)
    )
  })
})
