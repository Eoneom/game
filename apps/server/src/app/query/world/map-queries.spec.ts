import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { SpyIntelEntry } from '#app/port/repository/report'
import { WorldCellCache } from '#app/query/world/world-cells'
import { WorldExplorationQuery } from '#app/query/world/exploration'
import { WorldIntelQuery } from '#app/query/world/intel'
import { WorldMarkersQuery } from '#app/query/world/markers'
import { WorldTargetsQuery } from '#app/query/world/targets'
import { WorldTerrainQuery } from '#app/query/world/terrain'
import { CityEntity } from '#core/city/entity'
import { BattleTargetKind } from '#core/combat/value/battle-target-kind'
import { FactionCode } from '#core/faction/constant/code'
import { ReportSpyMetadata } from '#core/intel/type'
import { OutpostType } from '#core/outpost/constant/type'
import { OutpostEntity } from '#core/outpost/entity'
import { PlayerEntity } from '#core/player/entity'
import { TroopCode } from '#core/troop/constant/code'
import { CellEntity } from '#core/world/cell/entity'
import { WORLD_SIZE } from '#core/world/constant/size'
import { WorldError } from '#core/world/error'
import { CellType } from '#core/world/value/cell-type'
import { Coordinates } from '#core/world/value/coordinates'

const TYPES = [
  CellType.FOREST,
  CellType.RUINS,
  CellType.LAKE
]

const cellId = ({
  x, y
}: Coordinates): string => `cell-${x}-${y}`

/** The whole 100 × 100 grid; the type cycles with x + y so the index mapping is checkable. */
const buildWorld = (): CellEntity[] => {
  const cells: CellEntity[] = []
  for (let y = 1; y <= WORLD_SIZE; y++) {
    for (let x = 1; x <= WORLD_SIZE; x++) {
      cells.push(CellEntity.create({
        id: cellId({
          x,
          y
        }),
        coordinates: {
          x,
          y
        },
        type: TYPES[(x + y) % 3],
        resource_coefficient: {
          plastic: 1 + x / 100,
          mushroom: 1.23456,
          plasma: 0
        },
        solar_coefficient: 0.876543
      }))
    }
  }
  return cells
}

const VIEWER = 'viewer'

interface Settlement {
  kind: 'city' | 'outpost'
  id: string
  player_id: string
  coordinates: Coordinates
  name?: string
  type?: OutpostType
}

describe('world map queries (slice 044)', () => {
  let world: CellEntity[]
  let players: PlayerEntity[]
  let settlements: Settlement[]
  let tags: { player_id: string, alliance_id: string, tag: string }[]
  let levels: { city_id: string, total: number }[]
  let explored: string[]
  let intel: SpyIntelEntry[]
  let repository: Repository

  const inBounds = (coordinates: Coordinates, bounds: { min_x: number, max_x: number, min_y: number, max_y: number }) => coordinates.x >= bounds.min_x && coordinates.x <= bounds.max_x && coordinates.y >= bounds.min_y && coordinates.y <= bounds.max_y

  const player = (id: string, faction_code: FactionCode, system_controlled = false) => PlayerEntity.create({
    id,
    name: `name-${id}`,
    faction_code,
    system_controlled
  })

  beforeEach(() => {
    (WorldCellCache as unknown as { pending: unknown }).pending = null
    world = buildWorld()
    players = [
      player(VIEWER, FactionCode.THE_CONFEDERATION),
      player('ally', FactionCode.THE_CONFEDERATION),
      player('same', FactionCode.THE_CONFEDERATION),
      player('enemy', FactionCode.THE_TECHNOLOGICAL_SINGULARITY),
      player('system', FactionCode.THE_ASH_LITURGY, true)
    ]
    settlements = []
    tags = [
      {
        player_id: VIEWER,
        alliance_id: 'alliance-1',
        tag: 'ABC'
      },
      {
        player_id: 'ally',
        alliance_id: 'alliance-1',
        tag: 'ABC'
      },
      {
        player_id: 'same',
        alliance_id: 'alliance-2',
        tag: 'XYZ'
      }
    ]
    levels = []
    explored = []
    intel = []

    repository = {
      cell: { getByBounds: vi.fn(async () => world) },
      exploration: { get: vi.fn(async () => ({ cell_ids: explored })) },
      player: {
        listByIds: vi.fn(async (ids: string[]) => players.filter(entry => ids.includes(entry.id))),
        get: vi.fn(async (id: string) => players.find(entry => entry.id === id))
      },
      alliance: { listTagsByPlayerIds: vi.fn(async (ids: string[]) => tags.filter(entry => ids.includes(entry.player_id))) },
      building: { sumLevelsByCityIds: vi.fn(async (ids: string[]) => levels.filter(entry => ids.includes(entry.city_id))) },
      city: {
        listInBounds: vi.fn(async (bounds: { min_x: number, max_x: number, min_y: number, max_y: number }) => settlements
          .filter(entry => entry.kind === 'city' && inBounds(entry.coordinates, bounds))
          .map(entry => ({
            city: CityEntity.create({
              id: entry.id,
              player_id: entry.player_id,
              name: entry.name ?? entry.id,
              cell_id: cellId(entry.coordinates)
            }),
            coordinates: entry.coordinates
          }))),
        list: vi.fn(async ({ player_id }: { player_id: string }) => settlements
          .filter(entry => entry.kind === 'city' && entry.player_id === player_id)
          .map(entry => CityEntity.create({
            id: entry.id,
            player_id: entry.player_id,
            name: entry.name ?? entry.id,
            cell_id: cellId(entry.coordinates)
          })))
      },
      outpost: {
        listInBounds: vi.fn(async (bounds: { min_x: number, max_x: number, min_y: number, max_y: number }) => settlements
          .filter(entry => entry.kind === 'outpost' && inBounds(entry.coordinates, bounds))
          .map(entry => ({
            outpost: OutpostEntity.create({
              id: entry.id,
              player_id: entry.player_id,
              cell_id: cellId(entry.coordinates),
              type: entry.type ?? OutpostType.PERMANENT
            }),
            coordinates: entry.coordinates
          }))),
        list: vi.fn(async ({ player_id }: { player_id: string }) => settlements
          .filter(entry => entry.kind === 'outpost' && entry.player_id === player_id)
          .map(entry => OutpostEntity.create({
            id: entry.id,
            player_id: entry.player_id,
            cell_id: cellId(entry.coordinates),
            type: entry.type ?? OutpostType.PERMANENT
          })))
      },
      report: {
        listLatestSpyIntel: vi.fn(async ({
          player_id, coordinates
        }: { player_id: string, coordinates: Coordinates[] }) => (player_id === VIEWER
          ? intel.filter(entry => coordinates.some(({
            x, y
          }) => entry.coordinates.x === x && entry.coordinates.y === y))
          : []))
      }
    } as unknown as Repository
    vi.spyOn(Factory, 'getRepository').mockReturnValue(repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const addCity = (id: string, player_id: string, x: number, y: number) => settlements.push({
    kind: 'city',
    id,
    player_id,
    name: `Ville ${id}`,
    coordinates: {
      x,
      y
    }
  })

  const addOutpost = (id: string, player_id: string, x: number, y: number, type = OutpostType.PERMANENT) => settlements.push({
    kind: 'outpost',
    id,
    player_id,
    type,
    coordinates: {
      x,
      y
    }
  })

  const spyEntry = ({
    x, y, report_id, recorded_at, tier, kind = BattleTargetKind.CITY
  }: { x: number, y: number, report_id: string, recorded_at: number, tier: number, kind?: BattleTargetKind }): SpyIntelEntry => ({
    report_id,
    recorded_at,
    coordinates: {
      x,
      y
    },
    metadata: {
      success: true,
      aborted: false,
      roll: 0.1,
      p_success: 0.5,
      tier,
      scouts_lost: 0,
      target: {
        kind,
        id: 'target',
        name: null,
        owner_name: 'owner',
        faction_code: FactionCode.THE_ASH_LITURGY,
        coordinates: {
          x,
          y
        }
      },
      troops: [
        {
          code: TroopCode.PENITENT_HORDE,
          count: 10
        }
      ],
      ...(tier >= 2 ? { defenses: [] } : {})
    } as ReportSpyMetadata
  })

  describe('WorldTerrainQuery', () => {
    it('returns one char per cell, row-major from (1, 1), and reads the grid once', async () => {
      const {
        size, terrain
      } = await new WorldTerrainQuery().run()

      expect(size).toBe(100)
      expect(terrain).toHaveLength(10_000)
      expect(terrain).toMatch(/^[frl]+$/)
      const charAt = (x: number, y: number) => terrain[(y - 1) * size + (x - 1)]
      // (x + y) % 3: 0 forest, 1 ruins, 2 lake.
      expect(charAt(1, 1)).toBe('l')
      expect(charAt(2, 1)).toBe('f')
      expect(charAt(1, 3)).toBe('r')
      expect(charAt(100, 100)).toBe('l')
      expect(charAt(99, 100)).toBe('r')

      await new WorldTerrainQuery().run()
      expect(repository.cell.getByBounds).toHaveBeenCalledTimes(1)
      expect(repository.cell.getByBounds).toHaveBeenCalledWith({
        min_x: 1,
        max_x: 100,
        min_y: 1,
        max_y: 100
      })
    })
  })

  describe('WorldExplorationQuery', () => {
    it('is empty for a player who explored nothing', async () => {
      expect(await new WorldExplorationQuery().run({ player_id: VIEWER })).toEqual({ cells: [] })
    })

    it('returns only explored cells with coefficients rounded to 2 decimals', async () => {
      explored = [
        cellId({
          x: 5,
          y: 2
        }),
        cellId({
          x: 3,
          y: 1
        }),
        'unknown-cell'
      ]

      const { cells } = await new WorldExplorationQuery().run({ player_id: VIEWER })

      expect(cells).toEqual([
        [
          3,
          1,
          1.03,
          1.23,
          0.88
        ],
        [
          5,
          2,
          1.05,
          1.23,
          0.88
        ]
      ])
      expect(repository.exploration.get).toHaveBeenCalledWith({ player_id: VIEWER })
    })
  })

  describe('WorldMarkersQuery', () => {
    const bounds = {
      min_x: 1,
      max_x: 100,
      min_y: 1,
      max_y: 100
    }

    it('computes the relation of each settlement from the viewer\'s side', async () => {
      addCity('mine', VIEWER, 10, 10)
      addCity('ally-city', 'ally', 11, 10)
      addCity('same-city', 'same', 12, 10)
      addCity('enemy-city', 'enemy', 13, 10)
      addCity('system-city', 'system', 14, 10)
      addOutpost('enemy-outpost', 'enemy', 15, 10, OutpostType.TEMPORARY)

      const result = await new WorldMarkersQuery().run({
        player_id: VIEWER,
        ...bounds
      })

      expect(result.viewer).toEqual({
        player_id: VIEWER,
        faction_code: FactionCode.THE_CONFEDERATION,
        alliance_id: 'alliance-1'
      })
      expect(Object.fromEntries(result.cities.map(city => [
        city.id,
        city.relation
      ]))).toEqual({
        'mine': 'mine',
        'ally-city': 'ally',
        'same-city': 'faction',
        'enemy-city': 'enemy',
        'system-city': 'system'
      })
      expect(result.outposts).toEqual([
        {
          id: 'enemy-outpost',
          player_id: 'enemy',
          owner_name: 'name-enemy',
          faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
          alliance_tag: null,
          relation: 'enemy',
          type: OutpostType.TEMPORARY,
          coordinates: {
            x: 15,
            y: 10
          }
        }
      ])
      expect(result.cities.find(city => city.id === 'ally-city')).toMatchObject({
        name: 'Ville ally-city',
        owner_name: 'name-ally',
        alliance_tag: 'ABC'
      })
    })

    it('buckets the size from the summed building levels in one grouped query', async () => {
      addCity('a', 'enemy', 1, 1)
      addCity('b', 'enemy', 2, 1)
      addCity('c', 'enemy', 3, 1)
      addCity('d', 'enemy', 4, 1)
      levels = [
        {
          city_id: 'a',
          total: 19
        },
        {
          city_id: 'b',
          total: 20
        },
        {
          city_id: 'c',
          total: 79
        },
        {
          city_id: 'd',
          total: 80
        }
      ]

      const result = await new WorldMarkersQuery().run({
        player_id: VIEWER,
        ...bounds
      })

      expect(result.cities.map(city => city.size)).toEqual([
        1,
        2,
        3,
        4
      ])
      expect(repository.building.sumLevelsByCityIds).toHaveBeenCalledTimes(1)
      expect(repository.building.sumLevelsByCityIds).toHaveBeenCalledWith([
        'a',
        'b',
        'c',
        'd'
      ])
      expect(repository.player.listByIds).toHaveBeenCalledTimes(1)
      expect(repository.alliance.listTagsByPlayerIds).toHaveBeenCalledTimes(1)
    })

    it('accepts bounds up to 100 cells per side and rejects 101 or out-of-world values', async () => {
      await expect(new WorldMarkersQuery().run({
        player_id: VIEWER,
        ...bounds
      })).resolves.toBeDefined()
      await expect(new WorldMarkersQuery().run({
        player_id: VIEWER,
        ...bounds,
        min_x: 0
      })).rejects.toThrow(WorldError.INVALID_BOUNDS)
      await expect(new WorldMarkersQuery().run({
        player_id: VIEWER,
        ...bounds,
        max_y: 101
      })).rejects.toThrow(WorldError.INVALID_BOUNDS)
      await expect(new WorldMarkersQuery().run({
        player_id: VIEWER,
        ...bounds,
        min_x: 50,
        max_x: 40
      })).rejects.toThrow(WorldError.INVALID_BOUNDS)
    })
  })

  describe('WorldTargetsQuery', () => {
    it('is empty without any own location', async () => {
      expect(await new WorldTargetsQuery().run({ player_id: VIEWER })).toEqual({
        radius: 15,
        targets: []
      })
    })

    it('lists system settlements and enemy outposts as targets, enemy cities as threats, within 15 cells of the nearest own location', async () => {
      addCity('home', VIEWER, 10, 10)
      addOutpost('camp', VIEWER, 40, 40)
      addCity('system-city', 'system', 12, 10)
      addOutpost('system-outpost', 'system', 10, 13)
      addOutpost('enemy-outpost', 'enemy', 38, 40)
      addCity('enemy-city', 'enemy', 20, 15)
      addCity('far-enemy', 'enemy', 26, 10)
      addCity('ally-city', 'ally', 11, 11)
      addCity('same-city', 'same', 9, 9)

      const { targets } = await new WorldTargetsQuery().run({ player_id: VIEWER })

      expect(targets.map(target => [
        target.id,
        target.category,
        target.relation,
        target.nearest.id,
        target.nearest.distance
      ])).toEqual([
        [
          'system-city',
          'target',
          'system',
          'home',
          2
        ],
        [
          'enemy-outpost',
          'target',
          'enemy',
          'camp',
          2
        ],
        [
          'system-outpost',
          'target',
          'system',
          'home',
          3
        ],
        [
          'enemy-city',
          'threat',
          'enemy',
          'home',
          15
        ]
      ])
      expect(targets[0]).toMatchObject({
        kind: 'city',
        name: 'Ville system-city',
        outpost_type: null,
        size: 1,
        nearest: {
          kind: 'city',
          coordinates: {
            x: 10,
            y: 10
          }
        },
        intel: null
      })
      expect(targets[1]).toMatchObject({
        kind: 'outpost',
        name: null,
        outpost_type: OutpostType.PERMANENT,
        size: null
      })
    })

    it('attaches the latest successful spy report with its strength estimate', async () => {
      addCity('home', VIEWER, 10, 10)
      addCity('system-city', 'system', 12, 10)
      addCity('enemy-city', 'enemy', 14, 10)
      intel = [
        spyEntry({
          x: 12,
          y: 10,
          report_id: 'r-1',
          recorded_at: 500,
          tier: 1
        })
      ]

      const { targets } = await new WorldTargetsQuery().run({ player_id: VIEWER })

      expect(repository.report.listLatestSpyIntel).toHaveBeenCalledWith({
        player_id: VIEWER,
        coordinates: [
          {
            x: 12,
            y: 10
          },
          {
            x: 14,
            y: 10
          }
        ]
      })
      expect(targets[0].intel).toEqual({
        report_id: 'r-1',
        recorded_at: 500,
        tier: 1,
        troop_count: 10,
        defenses_known: false,
        estimated: {
          attack: 140,
          life: 100
        }
      })
      expect(targets[1].intel).toBeNull()
    })

    it('keeps at most 60 targets, nearest first', async () => {
      addCity('home', VIEWER, 50, 50)
      for (let index = 0; index < 70; index++) {
        addOutpost(`o-${index}`, 'system', 40 + (index % 10), 45 + Math.floor(index / 10))
      }

      const { targets } = await new WorldTargetsQuery().run({ player_id: VIEWER })

      expect(targets).toHaveLength(60)
      const distances = targets.map(target => target.nearest.distance)
      expect(distances).toEqual([ ...distances ].sort((left, right) => left - right))
    })
  })

  describe('WorldIntelQuery', () => {
    it('returns the viewer\'s latest successful report on the cell', async () => {
      intel = [
        spyEntry({
          x: 4,
          y: 5,
          report_id: 'r-2',
          recorded_at: 900,
          tier: 3
        })
      ]

      expect(await new WorldIntelQuery().run({
        player_id: VIEWER,
        x: 4,
        y: 5
      })).toEqual({
        intel: {
          report_id: 'r-2',
          recorded_at: 900,
          tier: 3,
          troop_count: 10,
          defenses_known: true,
          estimated: {
            attack: 140,
            life: 100
          }
        }
      })
    })

    it('returns null without a report, and never another player\'s reports', async () => {
      expect(await new WorldIntelQuery().run({
        player_id: VIEWER,
        x: 1,
        y: 1
      })).toEqual({ intel: null })

      intel = [
        spyEntry({
          x: 4,
          y: 5,
          report_id: 'r-2',
          recorded_at: 900,
          tier: 3
        })
      ]
      expect(await new WorldIntelQuery().run({
        player_id: 'someone-else',
        x: 4,
        y: 5
      })).toEqual({ intel: null })
      expect(repository.report.listLatestSpyIntel).toHaveBeenLastCalledWith({
        player_id: 'someone-else',
        coordinates: [
          {
            x: 4,
            y: 5
          }
        ]
      })
    })

    it('rejects coordinates outside the world', async () => {
      await expect(new WorldIntelQuery().run({
        player_id: VIEWER,
        x: 0,
        y: 5
      })).rejects.toThrow(WorldError.INVALID_BOUNDS)
    })
  })
})
