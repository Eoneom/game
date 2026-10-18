import assert from 'assert'
import { FactionCode } from '#core/faction/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { troop_faction } from '#core/troop/constant/faction'
import { TroopService } from '#core/troop/service'

describe('troop_faction ash liturgy roster', () => {
  const ash_codes = TroopService.codesForFaction(FactionCode.THE_ASH_LITURGY)

  it('maps nine exclusive troop codes', () => {
    assert.strictEqual(ash_codes.length, 9)
    for (const code of ash_codes) {
      assert.strictEqual(troop_faction[code], FactionCode.THE_ASH_LITURGY)
    }
  })

  it('includes four combat codes', () => {
    const combat = [
      TroopCode.PENITENT_HORDE,
      TroopCode.WRAITH_LANCER,
      TroopCode.HEMORRHAGE_CULTIST,
      TroopCode.CINDER_TITAN,
    ]
    for (const code of combat) {
      assert.ok(ash_codes.includes(code))
    }
  })
})
