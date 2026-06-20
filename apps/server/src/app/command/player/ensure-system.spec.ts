import type { MockInstance } from 'vitest'
import { ensureSystemPlayer } from './ensure-system'
import { Factory } from '#adapter/factory'
import { AppService } from '#app/service'
import { Repository } from '#app/port/repository/generic'
import { BuildingCode } from '#core/building/constant/code'
import { FactionCode } from '#core/faction/constant/code'
import {
  SYSTEM_FIRST_CITY_NAME,
  SYSTEM_PLAYER_NAME
} from '#core/player/constant/system'
import { PlayerEntity } from '#core/player/entity'
import { TechnologyCode } from '#core/technology/constant/code'
import { TroopService } from '#core/troop/service'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { id } from '#shared/identification'
import assert from 'assert'
import { testResourceStock } from '../../test-support/resource-stock'

describe('ensureSystemPlayer', () => {
  const cell_id_1 = id()
  const default_cell_params = {
    type: CellType.FOREST,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1,
      plasma: 0
    },
    solar_coefficient: 1
  }
  const city_first_cell = CellEntity.create({
    ...default_cell_params,
    id: id(),
    coordinates: {
      x: 1,
      y: 1
    }
  })
  const cells_around_city = [
    CellEntity.create({
      ...default_cell_params,
      id: cell_id_1,
      coordinates: {
        x: 0,
        y: 1
      }
    })
  ]

  let listSystemControlled: MockInstance
  let playerExist: MockInstance
  let cityExist: MockInstance
  let playerCreate: MockInstance
  let cityCreate: MockInstance
  let buildingCreate: MockInstance
  let technologyCreate: MockInstance
  let troopCreate: MockInstance
  let explorationCreate: MockInstance
  let resourceStockGetByCellId: MockInstance
  let resourceStockUpdateOne: MockInstance

  beforeEach(() => {
    listSystemControlled = vi.fn().mockResolvedValue([])
    playerExist = vi.fn().mockResolvedValue(false)
    cityExist = vi.fn().mockResolvedValue(false)
    playerCreate = vi.fn().mockResolvedValue(undefined)
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

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        exist: playerExist,
        create: playerCreate,
        listSystemControlled
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
    vi.spyOn(AppService, 'selectCityFirstCell').mockResolvedValue(city_first_cell)
    vi.spyOn(AppService, 'getCellsAround').mockResolvedValue(cells_around_city)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not create a player when a system-controlled player already exists', async () => {
    const existing = PlayerEntity.create({
      id: id(),
      name: SYSTEM_PLAYER_NAME,
      faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
      system_controlled: true
    })
    listSystemControlled.mockResolvedValue([ existing ])

    const result = await ensureSystemPlayer()

    assert.deepStrictEqual(result, {
      player_id: existing.id,
      created: false
    })
    assert.strictEqual(playerCreate.mock.calls.length, 0)
  })

  it('bootstraps Alpha of the technological singularity when none exists', async () => {
    const result = await ensureSystemPlayer()

    const created_player = playerCreate.mock.calls[0][0]
    const created_city = cityCreate.mock.calls[0][0]
    assert.strictEqual(created_player.name, SYSTEM_PLAYER_NAME)
    assert.strictEqual(created_player.faction_code, FactionCode.THE_TECHNOLOGICAL_SINGULARITY)
    assert.strictEqual(created_player.system_controlled, true)
    assert.strictEqual(created_city.name, SYSTEM_FIRST_CITY_NAME)
    assert.strictEqual(created_city.player_id, created_player.id)
    assert.strictEqual(result.player_id, created_player.id)
    assert.strictEqual(result.created, true)
    assert.strictEqual(buildingCreate.mock.calls.length, Object.keys(BuildingCode).length)
    assert.strictEqual(technologyCreate.mock.calls.length, Object.keys(TechnologyCode).length)
    assert.strictEqual(
      troopCreate.mock.calls.length,
      TroopService.codesForFaction(FactionCode.THE_TECHNOLOGICAL_SINGULARITY).length
    )
  })
})
