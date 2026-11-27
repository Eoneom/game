import assert from 'node:assert/strict'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { buildDefense } from '#app/command/defense/build'
import {
  planSystemDefenseBuild,
  tryBuildSystemDefenses,
} from '#command/player/system/defenses'
import { BuildingListQuery } from '#query/building/list'
import { CityGetQuery } from '#query/city/get'
import { DefenseListQuery } from '#query/defense/list'
import { BuildingCode } from '#core/building/constant/code'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseEntity } from '#core/defense/entity'
import {
  getSystemAiProfile,
  SystemAiProfileId,
} from '#core/player/system/ai-profile'
import { PricingService } from '#core/pricing/service'
import {
  RequirementService,
  type Levels
} from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import type { Resource } from '#shared/resource'

vi.mock('#app/command/defense/build', () => ({ buildDefense: vi.fn().mockResolvedValue(undefined) }))

const unit_costs = Object.fromEntries(Object.values(DefenseCode).map(code => [
  code,
  PricingService.getDefenseCost({
    code,
    count: 1,
    city_wall_level: 0 
  }).resource,
])) as Record<DefenseCode, Resource>

const rich: Resource = {
  plastic: 1_000_000,
  mushroom: 1_000_000,
  plasma: 1_000_000 
}

const turret_levels: Levels = {
  building: { [BuildingCode.CITY_WALL]: 2 },
  technology: { [TechnologyCode.FORTIFICATION]: 1 },
}

describe('planSystemDefenseBuild', () => {
  it('fills half of the target with ramparts, then turrets, up to 50 % of the capacity', () => {
    const first = planSystemDefenseBuild({
      capacity: 40,
      queued_points: 0,
      defenses: [],
      fill_ratio: 0.5,
      attacked_recently: false,
      levels: turret_levels,
      stock: rich,
      unit_costs,
    })
    assert.deepStrictEqual(first, {
      code: DefenseCode.RAMPART,
      count: 10 
    })

    const second = planSystemDefenseBuild({
      capacity: 40,
      queued_points: 0,
      defenses: [
        {
          code: DefenseCode.RAMPART,
          count: 10 
        } 
      ],
      fill_ratio: 0.5,
      attacked_recently: false,
      levels: turret_levels,
      stock: rich,
      unit_costs,
    })
    assert.deepStrictEqual(second, {
      code: DefenseCode.TURRET,
      count: 5 
    })

    const done = planSystemDefenseBuild({
      capacity: 40,
      queued_points: 0,
      defenses: [
        {
          code: DefenseCode.RAMPART,
          count: 10 
        },
        {
          code: DefenseCode.TURRET,
          count: 5 
        } 
      ],
      fill_ratio: 0.5,
      attacked_recently: false,
      levels: turret_levels,
      stock: rich,
      unit_costs,
    })
    assert.equal(done, null)
  })

  it('stops at 25 % of the capacity for the Ash Liturgy profile', () => {
    const ratio = getSystemAiProfile(SystemAiProfileId.ASH_LITURGY_AGGRESSIVE).defense_fill_ratio
    assert.equal(ratio, 0.25)
    assert.equal(getSystemAiProfile(SystemAiProfileId.SINGULARITY_DEFAULT).defense_fill_ratio, 0.5)

    const plan = planSystemDefenseBuild({
      capacity: 40,
      queued_points: 0,
      defenses: [],
      fill_ratio: ratio,
      attacked_recently: false,
      levels: turret_levels,
      stock: rich,
      unit_costs,
    })
    assert.deepStrictEqual(plan, {
      code: DefenseCode.RAMPART,
      count: 5 
    })
  })

  it('keeps the 1 : 1 ratio while turrets are locked', () => {
    const plan = planSystemDefenseBuild({
      capacity: 40,
      queued_points: 0,
      defenses: [
        {
          code: DefenseCode.RAMPART,
          count: 10 
        } 
      ],
      fill_ratio: 0.5,
      attacked_recently: false,
      levels: {
        building: { [BuildingCode.CITY_WALL]: 2 },
        technology: {} 
      },
      stock: rich,
      unit_costs,
    })
    assert.equal(plan, null)
  })

  it('adds minefields once the mix is in place and the city was attacked recently', () => {
    const plan = planSystemDefenseBuild({
      capacity: 40,
      queued_points: 0,
      defenses: [
        {
          code: DefenseCode.RAMPART,
          count: 10 
        },
        {
          code: DefenseCode.TURRET,
          count: 5 
        } 
      ],
      fill_ratio: 0.5,
      attacked_recently: true,
      levels: turret_levels,
      stock: rich,
      unit_costs,
    })
    assert.deepStrictEqual(plan, {
      code: DefenseCode.MINEFIELD,
      count: 10 
    })
  })

  it('never builds plasma batteries or shield generators', () => {
    const levels: Levels = {
      building: {
        [BuildingCode.CITY_WALL]: 10,
        [BuildingCode.CENTRAL_INDUCTOR]: 5 
      },
      technology: { [TechnologyCode.FORTIFICATION]: 5 },
    }
    for (let rampart = 0; rampart <= 50; rampart += 10) {
      const plan = planSystemDefenseBuild({
        capacity: 200,
        queued_points: 0,
        defenses: [
          {
            code: DefenseCode.RAMPART,
            count: rampart 
          } 
        ],
        fill_ratio: 0.5,
        attacked_recently: true,
        levels,
        stock: rich,
        unit_costs,
      })
      assert.ok(plan === null || ![
        DefenseCode.PLASMA_BATTERY,
        DefenseCode.SHIELD_GENERATOR 
      ].includes(plan.code))
    }
    assert.ok(RequirementService.getDefenseRequirement({ defense_code: DefenseCode.PLASMA_BATTERY }))
  })

  it('spends at most half of the stock on one batch', () => {
    const plan = planSystemDefenseBuild({
      capacity: 40,
      queued_points: 0,
      defenses: [],
      fill_ratio: 0.5,
      attacked_recently: false,
      levels: turret_levels,
      stock: {
        plastic: 3_200,
        mushroom: 100_000,
        plasma: 0 
      },
      unit_costs,
    })
    assert.deepStrictEqual(plan, {
      code: DefenseCode.RAMPART,
      count: 2 
    })
  })
})

describe('tryBuildSystemDefenses', () => {
  const player_id = 'system-player'
  const walled = {
    id: 'walled-city',
    name: 'Walled' 
  }
  const open = {
    id: 'open-city',
    name: 'Open' 
  }

  beforeEach(() => {
    vi.mocked(buildDefense).mockClear()
    vi.spyOn(BuildingListQuery.prototype, 'run').mockImplementation(async ({ city_id }) => ({
      buildings: [
        {
          id: 'b1',
          code: BuildingCode.CITY_WALL,
          level: city_id === walled.id ? 2 : 0 
        } 
      ],
      upgrade_queue: [],
    }) as never)
    vi.spyOn(DefenseListQuery.prototype, 'run').mockResolvedValue({
      defenses: [
        DefenseEntity.create({
          id: 'd1',
          player_id,
          city_id: walled.id,
          code: DefenseCode.RAMPART,
          count: 0 
        }) 
      ],
      costs: Object.fromEntries(Object.values(DefenseCode).map(code => [
        code,
        PricingService.getDefenseCost({
          code,
          count: 1,
          city_wall_level: 2 
        }),
      ])),
      requirements: {},
      city_wall_level: 2,
      capacity: {
        total: 40,
        used: 0,
        queued: 0 
      },
      pending_build: null,
      build_queue: [],
      build_queue_limit: 3,
    } as never)
    vi.spyOn(CityGetQuery.prototype, 'run').mockResolvedValue({ resource_stock: rich } as never)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({ battle: { countByTargetSince: vi.fn().mockResolvedValue(0) } } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds in cities with an Enceinte only, following the profile fill ratio', async () => {
    const builds = await tryBuildSystemDefenses({
      player_id,
      cities: [
        open,
        walled 
      ],
      technologies: [],
      ai_profile: getSystemAiProfile(SystemAiProfileId.ASH_LITURGY_AGGRESSIVE),
    })

    assert.deepStrictEqual(builds, [
      {
        code: DefenseCode.RAMPART,
        count: 5,
        city_id: walled.id,
        city_name: walled.name 
      } 
    ])
    assert.deepStrictEqual(vi.mocked(buildDefense).mock.calls[0][0], {
      player_id,
      city_id: walled.id,
      defense_code: DefenseCode.RAMPART,
      count: 5,
    })
  })
})
