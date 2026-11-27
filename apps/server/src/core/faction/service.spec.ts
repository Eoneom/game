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

  it('accepts la Symbiose and l\'Ordre du Bastion as playable (slices 036 / 037)', () => {
    assert.doesNotThrow(() => FactionService.assertPlayable(FactionCode.THE_SYMBIOSIS))
    assert.doesNotThrow(() => FactionService.assertPlayable(FactionCode.THE_BASTION_ORDER))
    assert.deepStrictEqual(playableFactionCodes(), [
      FactionCode.THE_CONFEDERATION,
      FactionCode.THE_SYMBIOSIS,
      FactionCode.THE_BASTION_ORDER,
    ])
  })

  it('gives l\'Ordre du Bastion a 1.15 garrison life multiplier, every other faction neutral (slice 037)', () => {
    assert.strictEqual(FactionService.getGarrisonLifeMultiplier(FactionCode.THE_BASTION_ORDER), 1.15)
    for (const code of Object.values(FactionCode).filter(faction => faction !== FactionCode.THE_BASTION_ORDER)) {
      assert.strictEqual(FactionService.getGarrisonLifeMultiplier(code), 1)
    }
  })

  it('gives la Confédération +10 % carrier capacity and +5 % non-combat speed, every other faction neutral (slice 039)', () => {
    assert.deepStrictEqual(FactionService.getLogisticsModifier(FactionCode.THE_CONFEDERATION), {
      transport_capacity: 1.1,
      non_combat_speed: 1.05,
    })
    for (const code of Object.values(FactionCode).filter(faction => faction !== FactionCode.THE_CONFEDERATION)) {
      assert.deepStrictEqual(FactionService.getLogisticsModifier(code), {
        transport_capacity: 1,
        non_combat_speed: 1,
      })
    }
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
