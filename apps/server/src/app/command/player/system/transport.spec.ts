import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { TroopEntity } from '#core/troop/entity'
import { TroopCode } from '#core/troop/constant/code'
import { TroopService } from '#core/troop/service'
import { id } from '#shared/identification'
import { testCityCell, testResourceStock } from '../../../test-support/resource-stock'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import {
  carrierTroopsForTransportLoad,
  clampResourcesToTransportCapacity,
  deliverableResourceTotal,
  isPermanentOutpostStockWorthTransport,
  pickCityForSystemTransport,
  sortOutpostsForSystemTransport,
} from '#command/player/system/transport'

describe('system transport helpers', () => {
  const player_id = id()

  it('requires warehouse pressure before hauling plastic or mushroom', () => {
    assert.strictEqual(isPermanentOutpostStockWorthTransport({
      stock: {
        plastic: 10,
        mushroom: 0,
        plasma: 0,
      },
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000,
      },
    }), false)
    assert.strictEqual(isPermanentOutpostStockWorthTransport({
      stock: {
        plastic: 700,
        mushroom: 0,
        plasma: 0,
      },
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000,
      },
    }), true)
  })

  it('always hauls when plasma is present', () => {
    assert.strictEqual(isPermanentOutpostStockWorthTransport({
      stock: {
        plastic: 0,
        mushroom: 0,
        plasma: 1,
      },
      warehouses_capacity: {
        plastic: 1000,
        mushroom: 1000,
      },
    }), true)
  })

  it('clamps cargo to transporter capacity with partial loads', () => {
    const clamped = clampResourcesToTransportCapacity({
      resources: {
        plastic: 500,
        mushroom: 200,
        plasma: 0,
      },
      capacity: 250,
    })
    assert.ok(TroopService.getTransportLoad({ resources: clamped }) <= 250)
    assert.strictEqual(clamped.plastic, 50)
    assert.strictEqual(clamped.mushroom, 200)
  })

  it('uses the minimum hauler count for the load', () => {
    const hauler = TroopEntity.create({
      id: id(),
      player_id,
      cell_id: id(),
      code: TroopCode.HAULER,
      count: 5,
      movement_id: null,
    })
    const troops = carrierTroopsForTransportLoad({
      hauler,
      load: 15_000,
    })
    assert.deepStrictEqual(troops, [
      {
        code: TroopCode.HAULER,
        count: 2,
      },
    ])
  })

  it('picks the city that can accept the most cargo', () => {
    const stock = {
      plastic: 500,
      mushroom: 200,
      plasma: 0,
    }
    const picked = pickCityForSystemTransport({
      origin_stock: stock,
      cities: [
        {
          city_id: 'a',
          city_name: 'A',
          coordinates: {
            x: 1,
            y: 1,
          },
          warehouse_space_remaining: {
            plastic: 50,
            mushroom: 50,
          },
        },
        {
          city_id: 'b',
          city_name: 'B',
          coordinates: {
            x: 2,
            y: 2,
          },
          warehouse_space_remaining: {
            plastic: 400,
            mushroom: 100,
          },
        },
      ],
    })
    assert.strictEqual(picked?.city_id, 'b')
    assert.strictEqual(deliverableResourceTotal({
      origin_stock: stock,
      destination_space_remaining: {
        plastic: 400,
        mushroom: 100,
      },
    }), 500)
  })

  it('sorts outposts by total stock descending', () => {
    const low_cell = testCityCell({ cell_id: id() })
    const high_cell = testCityCell({ cell_id: id() })
    const sorted = sortOutpostsForSystemTransport([
      {
        outpost: OutpostEntity.create({
          id: id(),
          player_id,
          cell_id: low_cell.id,
          type: OutpostType.PERMANENT,
        }),
        cell: low_cell,
        stock: testResourceStock({
          cell_id: low_cell.id,
          plastic: 10,
          mushroom: 0,
          plasma: 0,
        }),
      },
      {
        outpost: OutpostEntity.create({
          id: id(),
          player_id,
          cell_id: high_cell.id,
          type: OutpostType.PERMANENT,
        }),
        cell: high_cell,
        stock: testResourceStock({
          cell_id: high_cell.id,
          plastic: 900,
          mushroom: 0,
          plasma: 0,
        }),
      },
    ])
    assert.strictEqual(sorted[0].cell.id, high_cell.id)
  })
})
