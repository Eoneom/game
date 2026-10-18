import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { WorldGetCellsQuery } from '#query/world/get-cells'
import { FactionCode } from '#core/faction/constant/code'
import { collectSystemEmpireSnapshot } from '#app/query/player/system/empire-snapshot'
import { createSystemTickContext } from '#app/query/player/system/system-tick-context'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import { OutpostListQuery } from '#query/outpost/list'
import { BuildingListQuery } from '#query/building/list'
import { TechnologyListQuery } from '#query/technology/list'
import { TroopListQuery } from '#query/troop/list'
import { CellEntity } from '#core/world/cell/entity'
import { Coordinates } from '#core/world/value/coordinates'
import { CellType } from '#core/world/value/cell-type'
import * as combatPolicy from '#command/player/system/combat-policy'
import * as troops from '#command/player/system/troops'
import * as memory from '#command/player/system/memory'
import * as transport from '#command/player/system/transport'
import * as settleCandidates from '#command/player/system/settle-candidates'
import { AppService } from '#app/service'
import { Factory } from '#adapter/factory'

const player_id = 'system-player-viewport-cache'
const city_coords = { x: 20, y: 20 }

function mockCell(x: number, y: number): CellEntity {
  return CellEntity.create({
    id: `cell-${x}-${y}`,
    coordinates: { x, y },
    type: CellType.FOREST,
    resource_coefficient: {
      plastic: 1,
      mushroom: 1,
      plasma: 0,
    },
    solar_coefficient: 1,
  })
}

const mock_viewport = {
  cells: [ mockCell(21, 20) ],
  explored_cell_ids: [ 'cell-21-20' ],
  viewer_faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
  settlements: {
    cities: [],
    outposts: [],
  },
}

describe('collectSystemEmpireSnapshot viewport cache', () => {
  let worldGetCellsRun: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.spyOn(CityListQuery.prototype, 'run').mockResolvedValue({
      cities: [ { id: 'city-1', name: 'Alpha' } ],
      count_limit: 3,
    })
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({
      cell: {
        id: 'cell-20-20',
        coordinates: city_coords,
      },
      production_energy_ratio: 1,
      resource_stock: { plastic: 0, mushroom: 0, plasma: 0 },
      warehouses_capacity: { plastic: 100, mushroom: 100, plasma: 100 },
    } as never)
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [],
      cells: [],
      resource_stocks: [],
    })
    vi.spyOn(BuildingListQuery.prototype, 'run').mockResolvedValue({
      buildings: [],
      upgrade_queue: [],
    })
    vi.spyOn(TechnologyListQuery.prototype, 'run').mockResolvedValue({
      technologies: [],
      research_queue: [],
    })
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({ troops: [] })
    vi.spyOn(combatPolicy, 'loadEmpireCombatArmyCounts').mockResolvedValue({
      combat_stack_count: 0,
      non_combat_troop_count: 0,
    } as never)
    vi.spyOn(troops, 'loadOutpostRecruitHints').mockResolvedValue({
      needs_harvester_on_outpost: false,
      needs_reclaimer_on_outpost: false,
      needs_carrier_on_outpost: false,
    })
    vi.spyOn(AppService, 'getOutpostWarehousesCapacity').mockResolvedValue({
      plastic: 100,
      mushroom: 100,
      plasma: 100,
    })
    vi.spyOn(settleCandidates, 'countSettleReadyTemporaryOutposts').mockResolvedValue(0)
    vi.spyOn(settleCandidates, 'listSettleReadyTemporaryOutposts').mockResolvedValue([])
    vi.spyOn(memory, 'loadSystemPlayerMemory').mockResolvedValue({
      failed_base_cells: [],
      failed_attack_targets: [],
    })
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        get: vi.fn().mockResolvedValue({
          id: player_id,
          name: 'System Alpha',
          faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
        }),
      },
      troop: {
        listAllInCell: vi.fn().mockResolvedValue([]),
      },
      technology: {
        getLevel: vi.fn().mockResolvedValue(0),
      },
    } as never)
    worldGetCellsRun = vi.spyOn(WorldGetCellsQuery.prototype, 'run').mockResolvedValue(mock_viewport)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues at most one WorldGetCellsQuery per origin viewport per tick context', async () => {
    const tick_context = createSystemTickContext(player_id)
    await collectSystemEmpireSnapshot(player_id, tick_context)

    expect(worldGetCellsRun).toHaveBeenCalledTimes(1)
    expect(tick_context.getWorldGetCellsQueryCount()).toBe(1)
  })
})
