import assert from 'assert'
import { FactionCode } from '#core/faction/constant/code'
import { playableFactionCodes } from '#core/faction/constant/playable'
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

  it('accepts la Symbiose as playable (slice 036)', () => {
    assert.doesNotThrow(() => FactionService.assertPlayable(FactionCode.THE_SYMBIOSIS))
    assert.deepStrictEqual(playableFactionCodes(), [
      FactionCode.THE_CONFEDERATION,
      FactionCode.THE_SYMBIOSIS,
    ])
  })

  it('gives la Symbiose +10 % mushroom and -10 % plastic, every other faction neutral (slice 036)', () => {
    assert.deepStrictEqual(FactionService.getProductionMultipliers(FactionCode.THE_SYMBIOSIS), {
      plastic: 0.9,
      mushroom: 1.1,
      plasma: 1,
      water: 1,
    })
    for (const code of Object.values(FactionCode).filter(faction => faction !== FactionCode.THE_SYMBIOSIS)) {
      assert.deepStrictEqual(FactionService.getProductionMultipliers(code), {
        plastic: 1,
        mushroom: 1,
        plasma: 1,
        water: 1,
      })
    }
  })

  it('rejects the ash liturgy as non-playable', () => {
    assert.throws(
      () => FactionService.assertPlayable(FactionCode.THE_ASH_LITURGY),
      new RegExp(FactionError.NOT_PLAYABLE)
    )
  })
})
