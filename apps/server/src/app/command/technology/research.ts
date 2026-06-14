import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { PricingService } from '#core/pricing/service'
import { RequirementService } from '#core/requirement/service'
import { TechnologyCode } from '#core/technology/constant/code'
import { now } from '#shared/time'

export interface ResearchTechnologyParams {
  player_id: string
  city_id: string
  technology_code: TechnologyCode
}

export async function researchTechnology({
  city_id,
  player_id,
  technology_code,
}: ResearchTechnologyParams): Promise<void> {
  return runCommand('technology:research', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const pending_research = await job_queue.getPendingTechnologyResearch({ player_id })
    const is_technology_in_progress = pending_research !== null

    const [
      city,
      technology,
    ] = await Promise.all([
      repository.city.get(city_id),
      repository.technology.get({
        player_id,
        code: technology_code
      }),
    ])
    const city_cell = await repository.cell.getById(city.cell_id)

    technology.assertCanResearch({ is_technology_in_progress })

    const levels = await AppService.getTechnologyRequirementLevels({
      city_id,
      player_id,
      technology_code,
      technology_level: technology.level
    })

    RequirementService.checkTechnologyRequirement({
      technology_code: technology.code,
      technology_level: technology.level,
      levels,
    })

    const research_lab = await repository.building.get({
      city_id,
      code: BuildingCode.RESEARCH_LAB
    })

    const {
      resource,
      duration
    } = PricingService.getTechnologyLevelCost({
      code: technology.code,
      level: technology.level + 1,
      research_lab_level: research_lab.level
    })
    const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
    AppService.assertCityResourceStockContext({
      city,
      city_cell,
      stock,
      player_id
    })
    const updated_stock = stock.purchase({ resource })
    const execute_at = now() + duration * 1000

    await repository.resource_stock.updateOne(updated_stock)

    await job_queue.scheduleTechnologyResearchFinish({
      player_id,
      city_id,
      technology_id: technology.id,
      level: technology.level,
      execute_at
    })
  })
}
