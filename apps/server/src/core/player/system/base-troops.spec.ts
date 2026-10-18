import assert from 'assert'
import { FactionCode } from '#core/faction/constant/code'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { id } from '#shared/identification'
import { selectTroopsForSystemBase } from './base-troops'

describe('selectTroopsForSystemBase', () => {
  const player_id = id()
  const cell_id = id()

  it('prefers one founder when idle', () => {
    const troops = [
      TroopEntity.create({
        id: id(),
        player_id,
        cell_id,
        code: TroopCode.WAR_MACHINE,
        count: 10,
        movement_id: null,
      }),
      TroopEntity.create({
        id: id(),
        player_id,
        cell_id,
        code: TroopCode.ASSEMBLER,
        count: 1,
        movement_id: null,
      }),
    ]

    assert.deepStrictEqual(
      selectTroopsForSystemBase({
        troops,
        faction: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      }),
      [
        {
          code: TroopCode.ASSEMBLER,
          count: 1,
        },
      ],
    )
  })

  it('groups all idle combat stacks when no founder', () => {
    const troops = [
      TroopEntity.create({
        id: id(),
        player_id,
        cell_id,
        code: TroopCode.WAR_MACHINE,
        count: 20,
        movement_id: null,
      }),
      TroopEntity.create({
        id: id(),
        player_id,
        cell_id,
        code: TroopCode.DISRUPTOR,
        count: 2,
        movement_id: null,
      }),
    ]

    assert.deepStrictEqual(
      selectTroopsForSystemBase({
        troops,
        faction: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      }),
      [
        {
          code: TroopCode.WAR_MACHINE,
          count: 20,
        },
        {
          code: TroopCode.DISRUPTOR,
          count: 2,
        },
      ],
    )
  })

  it('falls back to any idle stack when no founder or combat', () => {
    const troops = [
      TroopEntity.create({
        id: id(),
        player_id,
        cell_id,
        code: TroopCode.HAULER,
        count: 3,
        movement_id: null,
      }),
    ]

    assert.deepStrictEqual(
      selectTroopsForSystemBase({
        troops,
        faction: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      }),
      [
        {
          code: TroopCode.HAULER,
          count: 3,
        },
      ],
    )
  })

  it('ignores troops already on a movement', () => {
    const troops = [
      TroopEntity.create({
        id: id(),
        player_id,
        cell_id: null,
        code: TroopCode.ASSEMBLER,
        count: 1,
        movement_id: id(),
      }),
    ]

    assert.strictEqual(
      selectTroopsForSystemBase({
        troops,
        faction: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      }),
      null,
    )
  })
})
