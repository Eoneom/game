import assert from 'assert'
import { Factory } from '#adapter/factory'
import { JobQueue } from '#app/port/job-queue'
import { Repository } from '#app/port/repository/generic'
import { DefenseListQuery } from '#query/defense/list'
import { CityEntity } from '#core/city/entity'
import { CityError } from '#core/city/error'
import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseEntity } from '#core/defense/entity'
import { id } from '#shared/identification'

describe('DefenseListQuery', () => {
  const player_id = id()
  const city = CityEntity.initCity({
    name: 'walled',
    player_id,
    cell_id: id()
  })

  beforeEach(() => {
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      city: { get: vi.fn().mockResolvedValue(city) },
      building: { getLevel: vi.fn().mockResolvedValue(2) },
      defense: {
        listByCity: vi.fn().mockResolvedValue([
          DefenseEntity.create({
            id: id(),
            player_id,
            city_id: city.id,
            code: DefenseCode.RAMPART,
            count: 5 
          }),
          DefenseEntity.create({
            id: id(),
            player_id,
            city_id: city.id,
            code: DefenseCode.TURRET,
            count: 2 
          }),
        ])
      },
      defense_build_queue: {
        listByCity: vi.fn().mockResolvedValue([
          DefenseBuildQueueEntity.create({
            id: id(),
            player_id,
            city_id: city.id,
            defense_code: DefenseCode.MINEFIELD,
            count: 3,
            created_at: 1 
          }) 
        ])
      },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getJobQueue').mockReturnValue({
      getPendingDefenseBuildProgress: vi.fn().mockResolvedValue({
        player_id,
        city_id: city.id,
        defense_code: DefenseCode.TURRET,
        remaining_count: 2,
        finish_at: 2_000,
        started_at: 1_000,
        last_progress: 1_000,
        execute_at: 1_500,
        job_id: 'job-id',
      }),
    } as unknown as JobQueue)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists every defense type and the used / queued / total capacity', async () => {
    const result = await new DefenseListQuery().run({
      player_id,
      city_id: city.id
    })

    assert.deepStrictEqual(result.defenses.map(defense => [
      defense.code,
      defense.count 
    ]), [
      [
        DefenseCode.RAMPART,
        5 
      ],
      [
        DefenseCode.TURRET,
        2 
      ],
      [
        DefenseCode.MINEFIELD,
        0 
      ],
      [
        DefenseCode.SHIELD_GENERATOR,
        0 
      ],
      [
        DefenseCode.PLASMA_BATTERY,
        0 
      ],
    ])
    assert.deepStrictEqual(result.capacity, {
      total: 40,
      used: 5 + 4,
      queued: 4 + 3,
    })
    assert.strictEqual(result.pending_build?.defense_code, DefenseCode.TURRET)
    assert.strictEqual(result.build_queue_limit, 3)
    assert.strictEqual(result.costs[DefenseCode.PLASMA_BATTERY].resource.plasma, 300)
  })

  it('rejects another player', async () => {
    await assert.rejects(new DefenseListQuery().run({
      player_id: id(),
      city_id: city.id
    }), new Error(CityError.NOT_OWNER))
  })
})
