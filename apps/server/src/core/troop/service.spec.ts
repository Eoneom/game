import { TroopCode } from '#core/troop/constant/code'
import { MovementAction } from '#core/troop/constant/movement-action'
import { TroopRole } from '#core/troop/constant/role'
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
      }), 3)
    })

    it('scales recycler earnings by count and plastic coefficient', () => {
      assert.strictEqual(TroopService.getEarningsBySecond({
        code: TroopCode.RECYCLER,
        count: 10,
        coefficients: { plastic: 1.5, mushroom: 2 , plasma: 0}
      }), 3.6)
    })

    it('scales harvester earnings like farmer', () => {
      assert.strictEqual(
        TroopService.getEarningsBySecond({
          code: TroopCode.HARVESTER,
          count: 10,
          coefficients: { plastic: 2, mushroom: 1.5, plasma: 0 }
        }),
        TroopService.getEarningsBySecond({
          code: TroopCode.FARMER,
          count: 10,
          coefficients: { plastic: 2, mushroom: 1.5, plasma: 0 }
        })
      )
    })

    it('applies the technology multiplier after the game time scale, before rounding', () => {
      assert.strictEqual(TroopService.getEarningsBySecond({
        code: TroopCode.RECYCLER,
        count: 10,
        coefficients: {
          plastic: 1.5,
          mushroom: 2,
          plasma: 0
        },
        technology_multiplier: 1.15
      }), Math.round(3.6 * 1.15 * 100) / 100)
    })

    it('scales reclaimer earnings like recycler', () => {
      assert.strictEqual(
        TroopService.getEarningsBySecond({
          code: TroopCode.RECLAIMER,
          count: 10,
          coefficients: { plastic: 1.5, mushroom: 2, plasma: 0 }
        }),
        TroopService.getEarningsBySecond({
          code: TroopCode.RECYCLER,
          count: 10,
          coefficients: { plastic: 1.5, mushroom: 2, plasma: 0 }
        })
      )
    })
  })

  describe('getMovementDuration with tactical_propulsion', () => {
    const distance = 10_000

    it('shortens combat-only movements by 4 % speed per level', () => {
      const base = TroopService.getMovementDuration({
        distance,
        troop_codes: [ TroopCode.LEGIONNAIRE ]
      })
      const boosted = TroopService.getMovementDuration({
        distance,
        troop_codes: [ TroopCode.LEGIONNAIRE ],
        propulsion_level: 5
      })
      assert.ok(boosted < base)
      assert.strictEqual(TroopService.getSlowestSpeed({
        troop_codes: [ TroopCode.LEGIONNAIRE ],
        propulsion_level: 5
      }), TroopService.getSpeed(TroopCode.LEGIONNAIRE) * 1.2)
    })

    it('keeps the slower carrier speed when a carrier joins the movement', () => {
      const troop_codes = [
        TroopCode.WAR_MACHINE,
        TroopCode.LIGHT_TRANSPORTER
      ]
      // war_machine 0.9 → 0.9 × 1.4 = 1.26 at level 10; light_transporter stays at 1.
      assert.strictEqual(TroopService.getSlowestSpeed({
        troop_codes,
        propulsion_level: 10
      }), TroopService.getSpeed(TroopCode.LIGHT_TRANSPORTER))
      assert.strictEqual(TroopService.getMovementDuration({
        distance,
        troop_codes,
        propulsion_level: 10
      }), TroopService.getMovementDuration({
        distance,
        troop_codes: [ TroopCode.LIGHT_TRANSPORTER ]
      }))
    })

    it('does not change non-combat unit speed', () => {
      assert.strictEqual(TroopService.getEffectiveSpeed({
        code: TroopCode.FARMER,
        propulsion_level: 8
      }), TroopService.getSpeed(TroopCode.FARMER))
    })

    it('createMovement uses the propulsion level for arrival time', () => {
      const params = {
        troops: [
          {
            code: TroopCode.LEGIONNAIRE,
            count: 5
          }
        ],
        start_at: 0,
        distance,
        origin: {
          x: 1,
          y: 1
        },
        destination: {
          x: 5,
          y: 5
        },
        player_id,
        action: MovementAction.ATTACK
      }
      const { arrive_at: base_arrive_at } = TroopService.createMovement(params)
      const { arrive_at: boosted_arrive_at } = TroopService.createMovement({
        ...params,
        propulsion_level: 3
      })
      assert.ok(boosted_arrive_at < base_arrive_at)
    })
  })

  describe('roleFor', () => {
    it('maps faction unit types onto shared roles', () => {
      assert.strictEqual(TroopService.roleFor(TroopCode.EXPLORER), TroopRole.SCOUT)
      assert.strictEqual(TroopService.roleFor(TroopCode.SEEKER), TroopRole.SCOUT)
      assert.strictEqual(TroopService.roleFor(TroopCode.SETTLER), TroopRole.FOUNDER)
      assert.strictEqual(TroopService.roleFor(TroopCode.ASSEMBLER), TroopRole.FOUNDER)
    })
  })

  describe('findByRole', () => {
    it('returns the stack whose unit type has the given role', () => {
      const troops = [
        {
          code: TroopCode.SEEKER,
          count: 2
        },
        {
          code: TroopCode.ASSEMBLER,
          count: 1
        }
      ]
      const founder = TroopService.findByRole({
        troops,
        role: TroopRole.FOUNDER
      })
      assert.deepStrictEqual(founder, {
        code: TroopCode.ASSEMBLER,
        count: 1
      })
    })
  })

  describe('getTransportLoad', () => {
    it('counts plasma as 100 times heavier than plastic or mushroom', () => {
      assert.strictEqual(TroopService.getTransportLoad({
        resources: {
          plastic: 10,
          mushroom: 5,
          plasma: 2,
          water: 0,
        }
      }), 215)
    })

    it('counts water as 2 times heavier than plastic or mushroom (slice 035)', () => {
      assert.strictEqual(TroopService.getTransportLoad({
        resources: {
          plastic: 10,
          mushroom: 0,
          plasma: 0,
          water: 30,
        }
      }), 70)
    })
  })

  describe('assertTransportResources', () => {
    it('rejects when weighted plasma load exceeds capacity', () => {
      assert.throws(
        () => TroopService.assertTransportResources({
          action: MovementAction.TRANSPORT,
          resources: {
            plastic: 0,
            mushroom: 0,
            plasma: 3,
            water: 0,
          },
          move_troops: [{ code: TroopCode.EXPLORER, count: 1 }],
        }),
        new RegExp(TroopError.TRANSPORT_CAPACITY_EXCEEDED)
      )
    })

    it('allows plasma that fits within weighted capacity', () => {
      assert.doesNotThrow(() => TroopService.assertTransportResources({
        action: MovementAction.TRANSPORT,
        resources: {
          plastic: 0,
          mushroom: 0,
          plasma: 2,
          water: 0,
        },
        move_troops: [{ code: TroopCode.EXPLORER, count: 1 }],
      }))
    })

    it('accepts a water-only cargo and weighs it at 2 per unit (slice 035)', () => {
      const move_troops = [
        {
          code: TroopCode.EXPLORER,
          count: 1,
        },
      ]
      const capacity = TroopService.getTotalTransportCapacity({ troops: move_troops })
      const water_only = (water: number) => ({
        plastic: 0,
        mushroom: 0,
        plasma: 0,
        water,
      })
      assert.doesNotThrow(() => TroopService.assertTransportResources({
        action: MovementAction.TRANSPORT,
        resources: water_only(Math.floor(capacity / 2)),
        move_troops,
      }))
      assert.throws(
        () => TroopService.assertTransportResources({
          action: MovementAction.TRANSPORT,
          resources: water_only(Math.floor(capacity / 2) + 1),
          move_troops,
        }),
        new RegExp(TroopError.TRANSPORT_CAPACITY_EXCEEDED)
      )
    })
  })

  describe('faction logistics bonus (slice 039)', () => {
    const distance = 10_000

    it('raises the transport capacity of carrier-role units only', () => {
      assert.strictEqual(TroopService.getTransportCapacity(TroopCode.LIGHT_TRANSPORTER, 1.1), 11_000)
      assert.strictEqual(TroopService.getTransportCapacity(TroopCode.LIGHT_TRANSPORTER), 10_000)
      // Settlers and explorers carry a little, but are not carriers.
      assert.strictEqual(TroopService.getTransportCapacity(TroopCode.SETTLER, 1.1), 1000)
      assert.strictEqual(TroopService.getTransportCapacity(TroopCode.EXPLORER, 1.1), 200)
      assert.strictEqual(TroopService.getTotalTransportCapacity({
        troops: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 3
          },
          {
            code: TroopCode.SETTLER,
            count: 1
          },
        ],
        carrier_capacity_multiplier: 1.1,
      }), 3 * 11_000 + 1000)
    })

    it('accepts a transport load that only fits with the bonus', () => {
      const params = {
        action: MovementAction.TRANSPORT,
        resources: {
          plastic: 10_500,
          mushroom: 0,
          plasma: 0,
          water: 0
        },
        move_troops: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 1
          }
        ],
      }
      assert.throws(() => TroopService.assertTransportResources(params), new RegExp(TroopError.TRANSPORT_CAPACITY_EXCEEDED))
      assert.doesNotThrow(() => TroopService.assertTransportResources({
        ...params,
        carrier_capacity_multiplier: 1.1,
      }))
    })

    it('speeds up movements without combat units by the multiplier', () => {
      for (const troop_codes of [
        [ TroopCode.LIGHT_TRANSPORTER ],
        [ TroopCode.EXPLORER ],
        [
          TroopCode.SETTLER,
          TroopCode.FARMER
        ],
      ]) {
        const base = TroopService.getSlowestSpeed({ troop_codes })
        assert.strictEqual(TroopService.getSlowestSpeed({
          troop_codes,
          non_combat_speed_multiplier: 1.05,
        }), base * 1.05)
        assert.ok(TroopService.getMovementDuration({
          distance,
          troop_codes,
          non_combat_speed_multiplier: 1.05,
        }) < TroopService.getMovementDuration({
          distance,
          troop_codes
        }))
      }
    })

    it('leaves movements with a combat unit to the normal rule and Propulsion tactique', () => {
      const troop_codes = [
        TroopCode.LEGIONNAIRE,
        TroopCode.LIGHT_TRANSPORTER
      ]
      assert.strictEqual(TroopService.getSlowestSpeed({
        troop_codes,
        non_combat_speed_multiplier: 1.05,
      }), TroopService.getSlowestSpeed({ troop_codes }))
      assert.strictEqual(TroopService.getSlowestSpeed({
        troop_codes: [ TroopCode.LEGIONNAIRE ],
        propulsion_level: 5,
        non_combat_speed_multiplier: 1.05,
      }), TroopService.getSpeed(TroopCode.LEGIONNAIRE) * 1.2)
    })

    it('never stacks with Propulsion tactique on non-combat movements', () => {
      assert.strictEqual(TroopService.getSlowestSpeed({
        troop_codes: [ TroopCode.LIGHT_TRANSPORTER ],
        propulsion_level: 10,
        non_combat_speed_multiplier: 1.05,
      }), TroopService.getSpeed(TroopCode.LIGHT_TRANSPORTER) * 1.05)
    })

    it('createMovement snapshots the bonus into the arrival time', () => {
      const params = {
        troops: [
          {
            code: TroopCode.LIGHT_TRANSPORTER,
            count: 1
          }
        ],
        start_at: 0,
        distance,
        origin: {
          x: 1,
          y: 1
        },
        destination: {
          x: 5,
          y: 5
        },
        player_id,
        action: MovementAction.TRANSPORT
      }
      const { arrive_at: base_arrive_at } = TroopService.createMovement(params)
      const { arrive_at: boosted_arrive_at } = TroopService.createMovement({
        ...params,
        non_combat_speed_multiplier: 1.05,
      })
      assert.strictEqual(boosted_arrive_at, TroopService.getMovementDuration({
        distance,
        troop_codes: [ TroopCode.LIGHT_TRANSPORTER ],
        non_combat_speed_multiplier: 1.05,
      }))
      assert.ok(boosted_arrive_at < base_arrive_at)
    })
  })

  describe('movement cap', () => {
    it('allows 5 movements without a command center', () => {
      assert.strictEqual(TroopService.getMovementLimit({ command_center_levels: 0 }), 5)
    })

    it('adds every command center level', () => {
      assert.strictEqual(TroopService.getMovementLimit({ command_center_levels: 2 + 3 }), 10)
    })

    it('rejects a new movement at or over the limit', () => {
      assert.doesNotThrow(() => TroopService.assertMovementCapacity({
        used: 4,
        limit: 5,
      }))
      assert.throws(() => TroopService.assertMovementCapacity({
        used: 5,
        limit: 5,
      }), new RegExp(TroopError.MOVEMENT_LIMIT_REACHED))
      assert.throws(() => TroopService.assertMovementCapacity({
        used: 6,
        limit: 5,
      }), new RegExp(TroopError.MOVEMENT_LIMIT_REACHED))
    })
  })
})
