import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopEntity } from '#core/troop/entity'
import { TroopError } from '#core/troop/error'
import { TroopService } from '#core/troop/service'
import assert from 'assert'

describe('TroopService', () => {
  const player_id = 'player_id'
  const cell_id = 'cell_id'

  describe('haveEnoughTroops', () => {
    it('should return false when there is a missing troop in origin', () => {
      const origin_troops = [
        {
          code: TroopCode.SETTLER,
          count: 1
        },
      ]

      const move_troops = [
        {
          code: TroopCode.SETTLER,
          count: 1
        },
        {
          code: TroopCode.EXPLORER,
          count: 1
        }
      ]

      const result = TroopService.haveEnoughTroops({
        origin_troops,
        move_troops
      })

      assert.strictEqual(result, false)
    })

    it('should return false when the origin troop is not above the move troops', () => {
      const origin_troops = [
        {
          code: TroopCode.SETTLER,
          count: 1
        },
        {
          code: TroopCode.EXPLORER,
          count: 1
        },
      ]

      const move_troops = [
        {
          code: TroopCode.SETTLER,
          count: 1
        },
        {
          code: TroopCode.EXPLORER,
          count: 2
        }
      ]

      const result = TroopService.haveEnoughTroops({
        origin_troops,
        move_troops
      })

      assert.strictEqual(result, false)
    })

    it('should return true when there is enough origin troops for the move troops', () => {
      const origin_troops = [
        {
          code: TroopCode.SETTLER,
          count: 1
        },
        {
          code: TroopCode.EXPLORER,
          count: 1
        },
      ]

      const move_troops = [
        {
          code: TroopCode.SETTLER,
          count: 1
        },
        {
          code: TroopCode.EXPLORER,
          count: 1
        }
      ]

      const result = TroopService.haveEnoughTroops({
        origin_troops,
        move_troops
      })

      assert.strictEqual(result, true)
    })
  })

  describe('splitTroops', () => {
    const initial_troops = [
      TroopEntity.create({
        id: 'initial-settler-id',
        count: 10,
        code: TroopCode.SETTLER,
        player_id,
        cell_id,
        movement_id: null,
      }),
      TroopEntity.create({
        id: 'initial-explored-id',
        count: 20,
        code: TroopCode.EXPLORER,
        player_id,
        cell_id,
        movement_id: null,
      })
    ]

    const troops_to_split = [
      {
        code: TroopCode.SETTLER,
        count: 4
      },
      {
        code: TroopCode.EXPLORER,
        count: 3
      }
    ]

    it('should remove split troops from initial troops', () => {
      const { updated_origin_troops } = TroopService.splitTroops({
        origin_troops: initial_troops,
        troops_to_split
      })

      assert.strictEqual(updated_origin_troops.length, 2)
      const settler = updated_origin_troops[0]
      const explorer = updated_origin_troops[1]

      assert.strictEqual(settler.code, TroopCode.SETTLER)
      assert.strictEqual(settler.id, initial_troops[0].id)
      assert.strictEqual(settler.count, 6)

      assert.strictEqual(explorer.code, TroopCode.EXPLORER)
      assert.strictEqual(explorer.id, initial_troops[1].id)
      assert.strictEqual(explorer.count, 17)
    })

    it('should create new split troops', () => {
      const { split_troops } = TroopService.splitTroops({
        origin_troops: initial_troops,
        troops_to_split
      })

      assert.strictEqual(split_troops.length, 2)
      const settler = split_troops[0]
      const explorer = split_troops[1]

      assert.strictEqual(settler.code, TroopCode.SETTLER)
      assert.ok(settler.id !== initial_troops[0].id)
      assert.strictEqual(settler.count, 4)

      assert.strictEqual(explorer.code, TroopCode.EXPLORER)
      assert.ok(explorer.id !== initial_troops[1].id)
      assert.strictEqual(explorer.count, 3)
    })
  })

  describe('mergeTroops', () => {
    const destination_cell_id = 'destination_cell_id'
    const movement_troop_id = 'movement_troop_id'
    const destination_troop_id = 'destination_troop_id'
    const movement_id = 'movement_id'

    it('should add the movement troops to the destination troops', () => {
      const movement_troop = TroopEntity.create({
        id: movement_troop_id,
        code: TroopCode.EXPLORER,
        player_id,
        cell_id: null,
        movement_id,
        count: 1
      })

      const destination_troop = TroopEntity.create({
        id: destination_troop_id,
        code: TroopCode.EXPLORER,
        player_id,
        cell_id: destination_cell_id,
        movement_id: null,
        count: 1
      })

      const merged_troops = TroopService.mergeTroops({
        movement_troops: [ movement_troop ],
        destination_troops: [ destination_troop ],
      })

      assert.strictEqual(merged_troops.length, 1)
      const merged_troop = merged_troops[0]
      assert.strictEqual(merged_troop.id, destination_troop.id)
      assert.strictEqual(merged_troop.code, destination_troop.code)
      assert.strictEqual(merged_troop.count, movement_troop.count + destination_troop.count)
    })

    it('should set the cell id to movement troops if there is no destination troops', () => {
      const movement_troop = TroopEntity.create({
        id: movement_troop_id,
        code: TroopCode.EXPLORER,
        player_id,
        cell_id: null,
        movement_id,
        count: 1
      })

      const merged_troops = TroopService.mergeTroops({
        movement_troops: [ movement_troop ],
        destination_troops: [],
      })

      assert.strictEqual(merged_troops.length, 1)
      const merged_troop = merged_troops[0]
      assert.strictEqual(merged_troop.code, movement_troop.code)
      assert.strictEqual(merged_troop.count, movement_troop.count)
    })
  })

  describe('getEarningsBySecond', () => {
    it('returns 0 when count is 0', () => {
      assert.strictEqual(TroopService.getEarningsBySecond({
        code: TroopCode.FARMER,
        count: 0,
        coefficients: { plastic: 1, mushroom: 1.5 , plasma: 0}
      }), 0)
    })

    it('scales farmer earnings by count and mushroom coefficient', () => {
      assert.strictEqual(TroopService.getEarningsBySecond({
        code: TroopCode.FARMER,
        count: 10,
        coefficients: { plastic: 2, mushroom: 1.5 , plasma: 0}
      }), 1.5)
    })

    it('scales recycler earnings by count and plastic coefficient', () => {
      assert.strictEqual(TroopService.getEarningsBySecond({
        code: TroopCode.RECYCLER,
        count: 10,
        coefficients: { plastic: 1.5, mushroom: 2 , plasma: 0}
      }), 1.8)
    })
  })

  describe('getTransportLoad', () => {
    it('counts plasma as 100 times heavier than plastic or mushroom', () => {
      assert.strictEqual(TroopService.getTransportLoad({
        resources: { plastic: 10, mushroom: 5, plasma: 2 }
      }), 215)
    })
  })

  describe('assertTransportResources', () => {
    it('rejects when weighted plasma load exceeds capacity', () => {
      assert.throws(
        () => TroopService.assertTransportResources({
          action: MovementAction.TRANSPORT,
          resources: { plastic: 0, mushroom: 0, plasma: 3 },
          move_troops: [{ code: TroopCode.EXPLORER, count: 1 }],
        }),
        new RegExp(TroopError.TRANSPORT_CAPACITY_EXCEEDED)
      )
    })

    it('allows plasma that fits within weighted capacity', () => {
      assert.doesNotThrow(() => TroopService.assertTransportResources({
        action: MovementAction.TRANSPORT,
        resources: { plastic: 0, mushroom: 0, plasma: 2 },
        move_troops: [{ code: TroopCode.EXPLORER, count: 1 }],
      }))
    })
  })
})
