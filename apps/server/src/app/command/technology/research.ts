import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  processTechnologyResearchQueue,
  startTechnologyResearch
} from '#app/command/technology/start-research'
import { CityError } from '#core/city/error'
import { RESEARCH_QUEUE_LIMIT } from '#core/technology/constant/research-queue'
import { TechnologyCode } from '#core/technology/constant/code'
import { TechnologyError } from '#core/technology/error'
import { TechnologyResearchQueueEntity } from '#core/technology/research-queue-entity'
import { id } from '#shared/identification'
import { now } from '#shared/time'

export interface ResearchTechnologyParams {
  player_id: string
  city_id: string
  technology_code: TechnologyCode
}

async function enqueueTechnologyResearch({
  player_id,
  city_id,
  technology_code
}: {
  player_id: string
  city_id: string
  technology_code: TechnologyCode
}): Promise<void> {
  const repository = Factory.getRepository()

  const city = await repository.city.get(city_id)
  if (!city.isOwnedBy(player_id)) {
    throw new Error(CityError.NOT_OWNER)
  }

  await repository.technology.get({
    player_id,
    code: technology_code
  })

  const queue_count = await repository.technology_research_queue.countByPlayer({ player_id })
  if (queue_count >= RESEARCH_QUEUE_LIMIT) {
    throw new Error(TechnologyError.QUEUE_FULL)
  }

  await repository.technology_research_queue.create(TechnologyResearchQueueEntity.create({
    id: id(),
    player_id,
    city_id,
    technology_code,
    created_at: now()
  }))
}

export async function researchTechnology({
  city_id,
  player_id,
  technology_code,
}: ResearchTechnologyParams): Promise<void> {
  return runCommand('technology:research', async () => {
    const job_queue = Factory.getJobQueue()

    let pending_research = await job_queue.getPendingTechnologyResearch({ player_id })

    if (!pending_research) {
      await processTechnologyResearchQueue({ player_id })
      pending_research = await job_queue.getPendingTechnologyResearch({ player_id })
    }

    if (!pending_research) {
      await startTechnologyResearch({
        player_id,
        city_id,
        technology_code
      })
      return
    }

    await enqueueTechnologyResearch({
      player_id,
      city_id,
      technology_code
    })
  })
}
