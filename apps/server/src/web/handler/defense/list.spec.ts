import { defenseListResponseMapper } from '#web/handler/defense/list'
import { BuildingCode } from '#core/building/constant/code'
import { DefenseBuildQueueEntity } from '#core/defense/build-queue-entity'
import { DefenseCode } from '#core/defense/constant/code'
import { DefenseEntity } from '#core/defense/entity'
import { CountCostValue } from '#core/pricing/value/count'
import { RequirementService } from '#core/requirement/service'
import { RequirementValue } from '#core/requirement/value/requirement'

describe('defenseListResponseMapper', () => {
  const costs = Object.fromEntries(Object.values(DefenseCode).map(code => [
    code,
    {
      code,
      resource: {
        plastic: 1,
        mushroom: 2,
        plasma: 3 
      },
      duration: 9,
    } 
  ])) as Record<DefenseCode, CountCostValue<DefenseCode>>
  const requirements = Object.fromEntries(Object.values(DefenseCode).map(code => [
    code,
    RequirementService.getDefenseRequirement({ defense_code: code }),
  ])) as Record<DefenseCode, RequirementValue>

  it('maps stats, costs, requirements, the active batch and the queue', () => {
    const response = defenseListResponseMapper({
      defenses: [
        DefenseEntity.create({
          id: 'd1',
          player_id: 'p',
          city_id: 'c',
          code: DefenseCode.TURRET,
          count: 4 
        }) 
      ],
      costs,
      requirements,
      city_wall_level: 2,
      capacity: {
        total: 40,
        used: 8,
        queued: 6 
      },
      pending_build: {
        defense_code: DefenseCode.RAMPART,
        remaining_count: 2,
        finish_at: 2_000,
        started_at: 1_000,
        last_progress: 1_000,
      },
      build_queue: [
        DefenseBuildQueueEntity.create({
          id: 'q1',
          player_id: 'p',
          city_id: 'c',
          defense_code: DefenseCode.MINEFIELD,
          count: 4,
          created_at: 1 
        }) 
      ],
      build_queue_limit: 3,
    })

    expect(response).toEqual({
      city_wall_level: 2,
      capacity: {
        total: 40,
        used: 8,
        queued: 6 
      },
      defenses: [
        {
          code: DefenseCode.TURRET,
          count: 4,
          points: 2,
          attack: 25,
          life: 20,
          armed: true,
          cost: {
            plastic: 1,
            mushroom: 2,
            plasma: 3,
            duration: 9 
          },
          requirement: {
            buildings: [
              {
                code: BuildingCode.CITY_WALL,
                level: 2 
              } 
            ],
            technologies: [
              {
                code: 'fortification',
                level: 1 
              } 
            ],
          },
        },
      ],
      ongoing_build: {
        defense_code: DefenseCode.RAMPART,
        finish_at: 2_000,
        remaining_count: 2,
        duration_per_unit: 9,
        started_at: 1_000,
      },
      build_queue: [
        {
          id: 'q1',
          defense_code: DefenseCode.MINEFIELD,
          count: 4 
        } 
      ],
      build_queue_limit: 3,
    })
  })
})
