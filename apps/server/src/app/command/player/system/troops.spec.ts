import {
  loadOutpostRecruitHints,
  maxRoleRecruitHeadroom,
  recruitSortHintsForCity,
  sortTroopsForSystemRecruit,
  systemRecruitBatchCount,
  SYSTEM_MAX_FOUNDER_TROOPS,
  SYSTEM_MAX_SCOUT_TROOPS,
  SYSTEM_TARGET_WAR_MACHINE,
} from './troops'
import { TroopRole } from '#core/troop/constant/role'
import { OutpostListQuery } from '#query/outpost/list'
import { TroopListQuery } from '#query/troop/list'
import { OutpostEntity } from '#core/outpost/entity'
import { OutpostType } from '#core/outpost/constant/type'
import { CellEntity } from '#core/world/cell/entity'
import { CellType } from '#core/world/value/cell-type'
import { TroopCode } from '#core/troop/constant/code'
import { TroopEntity } from '#core/troop/entity'
import { id } from '#shared/identification'
import { testResourceStock } from '../../../test-support/resource-stock'
import assert from 'assert'

function troop(code: TroopCode, count: number): TroopEntity {
  return TroopEntity.create({
    id: id(),
    player_id: id(),
    cell_id: id(),
    code,
    count,
    movement_id: null,
  })
}

const no_outpost_hints = {
  needs_harvester_on_outpost: false,
  needs_reclaimer_on_outpost: false,
  has_harvester_outpost: false,
  has_reclaimer_outpost: false,
}

const army_ready_combat = {
  army_counts: {
    war_machine: SYSTEM_TARGET_WAR_MACHINE,
    disruptor: 10,
    legionnaire: 0,
    interceptor: 0,
    total_combat: SYSTEM_TARGET_WAR_MACHINE + 10,
  },
  boost_combat_recruit: false,
}

const boost_war_machine_combat = {
  army_counts: {
    war_machine: 2,
    disruptor: 0,
    legionnaire: 0,
    interceptor: 0,
    total_combat: 2,
  },
  boost_combat_recruit: true,
}

function recruit_hints(overrides: Partial<{
  scout_count: number
  founder_count: number
}> & Partial<typeof no_outpost_hints> = {}) {
  return {
    scout_count: 0,
    founder_count: 0,
    ...no_outpost_hints,
    combat: army_ready_combat,
    ...overrides,
  }
}

describe('sortTroopsForSystemRecruit', () => {
  it('prioritizes carriers over scouts when scout cap is not reached', () => {
    const sorted = sortTroopsForSystemRecruit({
      troops: [
        troop(TroopCode.SEEKER, 0),
        troop(TroopCode.HARVESTER, 0),
        troop(TroopCode.HAULER, 0),
      ],
      hints: recruit_hints(),
    })

    assert.strictEqual(sorted[0].code, TroopCode.HAULER)
    assert.strictEqual(sorted[sorted.length - 1].code, TroopCode.HARVESTER)
  })

  it('deprioritizes harvesters without a permanent gathering outpost', () => {
    const sorted = sortTroopsForSystemRecruit({
      troops: [
        troop(TroopCode.HARVESTER, 0),
        troop(TroopCode.SEEKER, 0),
      ],
      hints: recruit_hints(),
    })

    assert.strictEqual(sorted[0].code, TroopCode.SEEKER)
    assert.strictEqual(sorted[sorted.length - 1].code, TroopCode.HARVESTER)
  })

  it('deprioritizes scouts when that city scout cap is reached', () => {
    const sorted = sortTroopsForSystemRecruit({
      troops: [
        troop(TroopCode.SEEKER, 0),
        troop(TroopCode.HARVESTER, 0),
        troop(TroopCode.HAULER, 0),
      ],
      hints: recruit_hints({ scout_count: SYSTEM_MAX_SCOUT_TROOPS }),
    })

    assert.strictEqual(sorted[0].code, TroopCode.HAULER)
    assert.ok(
      sorted.findIndex(t => t.code === TroopCode.SEEKER)
      > sorted.findIndex(t => t.code === TroopCode.HAULER)
    )
  })

  it('boosts harvester when a stocked permanent outpost lacks one', () => {
    const sorted = sortTroopsForSystemRecruit({
      troops: [
        troop(TroopCode.RECLAIMER, 0),
        troop(TroopCode.HARVESTER, 0),
      ],
      hints: recruit_hints({
        needs_harvester_on_outpost: true,
        has_harvester_outpost: true,
      }),
    })

    assert.strictEqual(sorted[0].code, TroopCode.HARVESTER)
  })

  it('prioritizes war_machine when combat army is below target', () => {
    const sorted = sortTroopsForSystemRecruit({
      troops: [
        troop(TroopCode.HAULER, 0),
        troop(TroopCode.WAR_MACHINE, 0),
      ],
      hints: {
        ...recruit_hints(),
        combat: boost_war_machine_combat,
      },
    })

    assert.strictEqual(sorted[0].code, TroopCode.WAR_MACHINE)
  })

  it('applies scout cap per city independently', () => {
    const capped_hints = recruitSortHintsForCity({
      city_troops: [ troop(TroopCode.SEEKER, SYSTEM_MAX_SCOUT_TROOPS) ],
      outpost_hints: no_outpost_hints,
      combat: army_ready_combat,
    })
    const fresh_city_hints = recruitSortHintsForCity({
      city_troops: [],
      outpost_hints: no_outpost_hints,
      combat: army_ready_combat,
    })

    assert.strictEqual(capped_hints.scout_count, SYSTEM_MAX_SCOUT_TROOPS)
    assert.strictEqual(fresh_city_hints.scout_count, 0)

    const capped_order = sortTroopsForSystemRecruit({
      troops: [
        troop(TroopCode.SEEKER, 0),
        troop(TroopCode.ASSEMBLER, 0),
      ],
      hints: capped_hints,
    }).map(t => t.code)
    const fresh_order = sortTroopsForSystemRecruit({
      troops: [
        troop(TroopCode.SEEKER, 0),
        troop(TroopCode.ASSEMBLER, 0),
      ],
      hints: fresh_city_hints,
    }).map(t => t.code)

    assert.deepStrictEqual(capped_order[0], TroopCode.ASSEMBLER)
    assert.ok(fresh_order.indexOf(TroopCode.SEEKER) < fresh_order.indexOf(TroopCode.ASSEMBLER))
  })
})

describe('systemRecruitBatchCount', () => {
  const base_hints = recruit_hints()

  it('does not batch-recruit harvesters without an outpost that needs one', () => {
    const count = systemRecruitBatchCount({
      troop_code: TroopCode.HARVESTER,
      stock: {
        plastic: 500,
        mushroom: 0,
        plasma: 0,
      },
      unit_cost: {
        plastic: 100,
        mushroom: 0,
        plasma: 0,
      },
      hints: base_hints,
    })

    assert.strictEqual(count, 0)
  })

  it('recruits multiple harvesters when a permanent outpost needs one', () => {
    const count = systemRecruitBatchCount({
      troop_code: TroopCode.HARVESTER,
      stock: {
        plastic: 500,
        mushroom: 0,
        plasma: 0,
      },
      unit_cost: {
        plastic: 100,
        mushroom: 0,
        plasma: 0,
      },
      hints: {
        ...base_hints,
        needs_harvester_on_outpost: true,
        has_harvester_outpost: true,
      },
    })

    assert.strictEqual(count, 5)
  })

  it('limits scouts to remaining per-city headroom', () => {
    const count = systemRecruitBatchCount({
      troop_code: TroopCode.SEEKER,
      stock: {
        plastic: 10_000,
        mushroom: 0,
        plasma: 0,
      },
      unit_cost: {
        plastic: 1,
        mushroom: 0,
        plasma: 0,
      },
      hints: {
        ...base_hints,
        scout_count: 1,
      },
    })

    assert.strictEqual(count, SYSTEM_MAX_SCOUT_TROOPS - 1)
  })

  it('returns zero when founder cap is reached', () => {
    const headroom = maxRoleRecruitHeadroom(TroopRole.FOUNDER, {
      scout_count: 0,
      founder_count: SYSTEM_MAX_FOUNDER_TROOPS,
    })
    assert.strictEqual(headroom, 0)

    const count = systemRecruitBatchCount({
      troop_code: TroopCode.ASSEMBLER,
      stock: {
        plastic: 10_000,
        mushroom: 0,
        plasma: 0,
      },
      unit_cost: {
        plastic: 1,
        mushroom: 0,
        plasma: 0,
      },
      hints: {
        ...base_hints,
        founder_count: SYSTEM_MAX_FOUNDER_TROOPS,
      },
    })
    assert.strictEqual(count, 0)
  })
})

describe('loadOutpostRecruitHints', () => {
  const player_id = id()
  const outpost_id = id()
  const outpost_cell_id = id()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('flags harvester need on permanent outposts with stock and no cultivator', async () => {
    vi.spyOn(OutpostListQuery.prototype, 'run').mockResolvedValue({
      outposts: [
        OutpostEntity.create({
          id: outpost_id,
          player_id,
          cell_id: outpost_cell_id,
          type: OutpostType.PERMANENT,
        }),
      ],
      cells: [
        CellEntity.create({
          id: outpost_cell_id,
          coordinates: {
            x: 2,
            y: 2,
          },
          type: CellType.LAKE,
          resource_coefficient: {
            plastic: 0,
            mushroom: 1,
            plasma: 0,
          },
          solar_coefficient: 1,
        }),
      ],
      resource_stocks: [
        testResourceStock({
          cell_id: outpost_cell_id,
          plastic: 100,
          mushroom: 0,
        }),
      ],
      count_limit: 10,
    })
    vi.spyOn(TroopListQuery.prototype, 'run').mockResolvedValue({
      troops: [ troop(TroopCode.HAULER, 1) ],
      costs: {} as never,
      pending_recruitment: null,
    })

    const hints = await loadOutpostRecruitHints(player_id)

    assert.strictEqual(hints.needs_harvester_on_outpost, true)
    assert.strictEqual(hints.has_harvester_outpost, true)
    assert.strictEqual(hints.has_reclaimer_outpost, false)
  })
})
