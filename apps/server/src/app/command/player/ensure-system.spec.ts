import type { MockInstance } from 'vitest'
import { ensureSystemPlayers } from './ensure-system'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import {
  HARROW_FIRST_CITY_NAME,
  HARROW_SYSTEM_PLAYER_NAME,
  SYSTEM_FIRST_CITY_NAME,
  SYSTEM_PLAYER_NAME,
} from '#core/player/constant/system'
import { PlayerEntity } from '#core/player/entity'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopService } from '#core/troop/service'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'
import { testResourceStock } from '../../test-support/resource-stock'
import assert from 'assert'

vi.mock('#query/city/list', () => ({
  CityListQuery: class {
    async run() {
      return {
        cities: [
          {
            id: 'alpha-city-id',
            name: SYSTEM_FIRST_CITY_NAME,
          },
        ],
        count_limit: 5,
      }
    }
  },
}))

vi.mock('#query/city/get', () => ({
  CityGetQuery: class {
    async run() {
      return {
        cell: {
          id: 'alpha-cell-id',
          coordinates: {
            x: 1,
            y: 1,
          },
        },
      }
    }
  },
}))

describe('ensureSystemPlayers', () => {
  const default_cell_params = {
    type: CellType.FOREST,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1,
      plasma: 0
    },
    solar_coefficient: 1
  }
  const alpha_cell = CellEntity.create({
    ...default_cell_params,
    id: id(),
    coordinates: {
      x: 1,
      y: 1
    }
  })
  const harrow_cell = CellEntity.create({
    ...default_cell_params,
    id: id(),
    coordinates: {
      x: 80,
      y: 80
    }
  })
  const cells_around_city = [
    CellEntity.create({
      ...default_cell_params,
      id: id(),
      coordinates: {
        x: 0,
        y: 1
      }
    })
  ]

  let exist: MockInstance
  let getByName: MockInstance
  let cityExist: MockInstance
  let playerCreate: MockInstance
  let cityCreate: MockInstance
  let buildingCreate: MockInstance
  let technologyCreate: MockInstance
  let troopCreate: MockInstance
  let explorationCreate: MockInstance
  let resourceStockGetByCellId: MockInstance
  let resourceStockUpdateOne: MockInstance
  let selectCityFirstCell: MockInstance

  beforeEach(() => {
    const created_names = new Set<string>()
    exist = vi.fn().mockImplementation(async (name: string) => created_names.has(name))
    getByName = vi.fn().mockImplementation(async (name: string) => {
      if (name === SYSTEM_PLAYER_NAME) {
        return PlayerEntity.create({
          id: id(),
          name: SYSTEM_PLAYER_NAME,
          faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
          system_controlled: true,
        })
      }
      if (name === HARROW_SYSTEM_PLAYER_NAME) {
        return PlayerEntity.create({
          id: id(),
          name: HARROW_SYSTEM_PLAYER_NAME,
          faction_code: FactionCode.THE_ASH_LITURGY,
          system_controlled: true,
        })
      }
      throw new Error('player:not-found')
    })
    playerCreate = vi.fn().mockImplementation(async (player: PlayerEntity) => {
      created_names.add(player.name)
    })
    cityExist = vi.fn().mockResolvedValue(false)
    cityCreate = vi.fn().mockResolvedValue(undefined)
    buildingCreate = vi.fn().mockResolvedValue(undefined)
    technologyCreate = vi.fn().mockResolvedValue(undefined)
    troopCreate = vi.fn().mockResolvedValue(undefined)
    explorationCreate = vi.fn().mockResolvedValue(undefined)
    resourceStockGetByCellId = vi.fn().mockImplementation(({ cell_id }: { cell_id: string }) => Promise.resolve(testResourceStock({
      cell_id,
      plastic: 0,
      mushroom: 0,
      plasma: 0
    })))
    resourceStockUpdateOne = vi.fn().mockResolvedValue(undefined)
    selectCityFirstCell = vi.fn()
      .mockResolvedValueOnce(alpha_cell)
      .mockResolvedValueOnce(harrow_cell)

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        exist,
        getByName,
        create: playerCreate,
      },
      city: {
        exist: cityExist,
        create: cityCreate
      },
      building: { create: buildingCreate },
      technology: { create: technologyCreate },
      resource_stock: {
        getByCellId: resourceStockGetByCellId,
        updateOne: resourceStockUpdateOne
      },
      troop: { create: troopCreate },
      exploration: { create: explorationCreate }
    } as unknown as Repository)
    vi.spyOn(AppService, 'selectCityFirstCell').mockImplementation(selectCityFirstCell)
    vi.spyOn(AppService, 'getCellsAround').mockResolvedValue(cells_around_city)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bootstraps Alpha then Harrow when none exist', async () => {
    const result = await ensureSystemPlayers()

    assert.strictEqual(result.empires.length, 2)
    assert.strictEqual(result.empires[0].created, true)
    assert.strictEqual(result.empires[1].created, true)

    const alpha_player = playerCreate.mock.calls[0][0]
    const alpha_city = cityCreate.mock.calls[0][0]
    assert.strictEqual(alpha_player.name, SYSTEM_PLAYER_NAME)
    assert.strictEqual(alpha_player.faction_code, FactionCode.THE_TECHNOLOGICAL_SINGULARITY)
    assert.strictEqual(alpha_city.name, SYSTEM_FIRST_CITY_NAME)

    const harrow_player = playerCreate.mock.calls[1][0]
    const harrow_city = cityCreate.mock.calls[1][0]
    assert.strictEqual(harrow_player.name, HARROW_SYSTEM_PLAYER_NAME)
    assert.strictEqual(harrow_player.faction_code, FactionCode.THE_ASH_LITURGY)
    assert.strictEqual(harrow_city.name, HARROW_FIRST_CITY_NAME)

    assert.strictEqual(selectCityFirstCell.mock.calls.length, 2)
    assert.strictEqual(buildingCreate.mock.calls.length, Object.keys(BuildingCode).length * 2)
    assert.strictEqual(technologyCreate.mock.calls.length, Object.keys(TechnologyCode).length * 2)
    assert.strictEqual(
      troopCreate.mock.calls.length,
      TroopService.codesForFaction(FactionCode.THE_TECHNOLOGICAL_SINGULARITY).length
        + TroopService.codesForFaction(FactionCode.THE_ASH_LITURGY).length,
    )
  })

  it('skips empires that already exist', async () => {
    const existing_alpha = PlayerEntity.create({
      id: id(),
      name: SYSTEM_PLAYER_NAME,
      faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      system_controlled: true,
    })
    const existing_harrow = PlayerEntity.create({
      id: id(),
      name: HARROW_SYSTEM_PLAYER_NAME,
      faction_code: FactionCode.THE_ASH_LITURGY,
      system_controlled: true,
    })
    exist.mockImplementation(async (name: string) => name === SYSTEM_PLAYER_NAME || name === HARROW_SYSTEM_PLAYER_NAME)
    getByName.mockImplementation(async (name: string) => {
      if (name === SYSTEM_PLAYER_NAME) {
        return existing_alpha
      }
      if (name === HARROW_SYSTEM_PLAYER_NAME) {
        return existing_harrow
      }
      throw new Error('player:not-found')
    })

    const result = await ensureSystemPlayers()

    assert.deepStrictEqual(result.empires, [
      {
        player_id: existing_alpha.id,
        created: false,
      },
      {
        player_id: existing_harrow.id,
        created: false,
      },
    ])
    assert.strictEqual(playerCreate.mock.calls.length, 0)
  })
})
