import assert from 'assert'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { resolveAttackTarget } from '#app/command/troop/movement/attack-target'
import { CityEntity } from '#core/city/entity'
import { CombatError } from '#core/combat/error'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { FactionCode } from '#core/faction/constant/code'
import { id } from '#shared/identification'
import { testCityCell } from '../../../test-support/resource-stock'

describe('resolveAttackTarget with la Symbiose (slice 036)', () => {
  const attacker_player_id = id()
  const defender_player_id = id()
  const cell = testCityCell({ cell_id: id() })
  const city = CityEntity.initCity({
    name: 'Mycelia',
    player_id: defender_player_id,
    cell_id: cell.id,
  })

  function setup(defender_faction_code: FactionCode): void {
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      cell: { getCell: vi.fn().mockResolvedValue(cell) },
      city: { searchByCell: vi.fn().mockResolvedValue(city) },
      player: { get: vi.fn().mockResolvedValue({ faction_code: defender_faction_code }) },
    } as unknown as Repository)
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  for (const attacker_faction_code of [
    FactionCode.THE_CONFEDERATION,
    FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
    FactionCode.THE_ASH_LITURGY,
  ]) {
    it(`lets ${attacker_faction_code} attack a Symbiose city`, async () => {
      setup(FactionCode.THE_SYMBIOSIS)

      const target = await resolveAttackTarget({
        attacker_player_id,
        attacker_faction_code,
        destination: cell.coordinates,
      })

      assert.strictEqual(target.target_kind, BattleTargetKind.CITY)
      assert.strictEqual(target.defender_faction_code, FactionCode.THE_SYMBIOSIS)
    })
  }

  it('lets a Symbiose player attack a Confederation city', async () => {
    setup(FactionCode.THE_CONFEDERATION)

    const target = await resolveAttackTarget({
      attacker_player_id,
      attacker_faction_code: FactionCode.THE_SYMBIOSIS,
      destination: cell.coordinates,
    })

    assert.strictEqual(target.defender_player_id, defender_player_id)
  })

  it('rejects an attack between two Symbiose players', async () => {
    setup(FactionCode.THE_SYMBIOSIS)

    await assert.rejects(resolveAttackTarget({
      attacker_player_id,
      attacker_faction_code: FactionCode.THE_SYMBIOSIS,
      destination: cell.coordinates,
    }), new RegExp(CombatError.SAME_FACTION_ATTACK))
  })
})
