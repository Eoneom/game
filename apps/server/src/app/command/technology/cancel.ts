import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { processTechnologyResearchQueue } from '#app/command/technology/start-research'
import { AppService } from '#app/service'
import { BuildingCode } from '#core/building/constant/code'
import { PricingService } from '#core/pricing/service'
import { TechnologyError } from '#core/technology/error'

export interface CancelTechnologyParams {
  player_id: string
}

export async function cancelTechnology({ player_id }: CancelTechnologyParams): Promise<void> {
  return runCommand('technology:cancel', async () => {
    const repository = Factory.getRepository()
    const job_queue = Factory.getJobQueue()

    const pending = await job_queue.getPendingTechnologyResearch({ player_id })

    if (!pending) {
      throw new Error(TechnologyError.NOT_IN_PROGRESS)
    }

    const [
      technology,
      city,
      research_lab
    ] = await Promise.all([
      repository.technology.getById(pending.technology_id),
      repository.city.get(pending.city_id),
      repository.building.get({
        city_id: pending.city_id,
        code: BuildingCode.RESEARCH_LAB
      })
    ])
    const city_cell = await repository.cell.getById(city.cell_id)

    const resource_refund = PricingService.getTechnologyResearchRefund({
      code: technology.code,
      level: technology.level,
      research_lab_level: research_lab.level
    })

    const stock = await repository.resource_stock.getByCellId({ cell_id: city_cell.id })
    AppService.assertCityResourceStockContext({
      city,
      city_cell,
      stock,
      player_id
    })
    const updated_stock = stock.refund({ resource: resource_refund })

    await Promise.all([
      repository.resource_stock.updateOne(updated_stock),
      job_queue.cancelTechnologyResearchFinish({ player_id })
    ])

    await processTechnologyResearchQueue({ player_id })
  })
}
