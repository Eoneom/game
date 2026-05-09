import {
  PgBoss,
  type WorkHandlerFor,
  type WorkOptions
} from 'pg-boss'
import { AppLogger } from '#app/port/logger'
import {
  PGBOSS_SCHEMA,
  resolveDatabaseUrl,
  type JobQueueContext
} from '#adapter/job-queue/context'
import {
  BUILDING_UPGRADE_FINISH_QUEUE,
  cancelBuildingUpgradeFinish,
  getPendingBuildingUpgrade,
  scheduleBuildingUpgradeFinish,
  type PendingBuildingUpgrade
} from '#adapter/job-queue/building/finish-upgrade'
import {
  TECHNOLOGY_RESEARCH_FINISH_QUEUE,
  cancelTechnologyResearchFinish,
  getPendingTechnologyResearch,
  scheduleTechnologyResearchFinish,
  type PendingTechnologyResearch
} from '#adapter/job-queue/technology/finish-research'
import {
  TROOP_RECRUIT_PROGRESS_QUEUE,
  cancelTroopRecruitProgress,
  getPendingTroopRecruitProgress,
  scheduleTroopRecruitProgress,
  type PendingTroopRecruitProgress,
  type TroopRecruitProgressJobData
} from '#adapter/job-queue/troop/recruit'
import {
  TROOP_MOVEMENT_FINISH_QUEUE,
  cancelTroopMovementFinish,
  getPendingTroopMovementFinish,
  scheduleTroopMovementFinish,
  type PendingTroopMovementFinish
} from '#adapter/job-queue/troop/finish-movement'
import {
  CITY_RESOURCES_GATHER_QUEUE,
  ensureCityResourcesGatherScheduled,
  getPendingCityResourcesGather,
  scheduleCityResourcesGather,
  type PendingCityResourcesGather
} from '#adapter/job-queue/city/gather'
import {
  OUTPOST_RESOURCES_GATHER_QUEUE,
  ensureOutpostResourcesGatherScheduled,
  getPendingOutpostResourcesGather,
  scheduleOutpostResourcesGather,
  type PendingOutpostResourcesGather
} from '#adapter/job-queue/outpost/gather'

export class JobQueue {
  private readonly ctx: JobQueueContext

  constructor({
    logger,
    connectionString
  }: {
    logger: AppLogger
    connectionString?: string
  }) {
    const boss = new PgBoss({
      connectionString: resolveDatabaseUrl(connectionString),
      schema: PGBOSS_SCHEMA
    })

    this.ctx = {
      boss,
      logger
    }

    this.ctx.boss.on('error', (error: Error) => {
      this.ctx.logger.error(error.message, { err: error })
    })
  }

  async start(): Promise<void> {
    this.ctx.logger.info('starting pg-boss...')
    await this.ctx.boss.start()
    await this.ctx.boss.createQueue(BUILDING_UPGRADE_FINISH_QUEUE)
    await this.ctx.boss.createQueue(TECHNOLOGY_RESEARCH_FINISH_QUEUE)
    await this.ctx.boss.createQueue(TROOP_RECRUIT_PROGRESS_QUEUE, { policy: 'stately' })
    await this.ctx.boss.createQueue(TROOP_MOVEMENT_FINISH_QUEUE)
    await this.ctx.boss.createQueue(CITY_RESOURCES_GATHER_QUEUE, { policy: 'stately' })
    await this.ctx.boss.createQueue(OUTPOST_RESOURCES_GATHER_QUEUE, { policy: 'stately' })
    this.ctx.logger.info('pg-boss started', { schema: PGBOSS_SCHEMA })
  }

  async stop(): Promise<void> {
    this.ctx.logger.info('stopping pg-boss...')
    await this.ctx.boss.stop({ graceful: true })
    this.ctx.logger.info('pg-boss stopped')
  }

  getBoss(): PgBoss {
    return this.ctx.boss
  }

  async work<ReqData, ResData = unknown, const O extends WorkOptions = WorkOptions>(
    name: string,
    options: O,
    handler: WorkHandlerFor<O, ReqData, ResData>
  ): Promise<string> {
    return this.ctx.boss.work(name, options, handler)
  }

  async scheduleBuildingUpgradeFinish(args: {
    player_id: string
    city_id: string
    building_id: string
    level: number
    execute_at: number
  }): Promise<string | null> {
    return scheduleBuildingUpgradeFinish(this.ctx, args)
  }

  async cancelBuildingUpgradeFinish(args: { city_id: string }): Promise<void> {
    return cancelBuildingUpgradeFinish(this.ctx, args)
  }

  async getPendingBuildingUpgrade(args: { city_id: string }): Promise<PendingBuildingUpgrade | null> {
    return getPendingBuildingUpgrade(this.ctx, args)
  }

  async scheduleTechnologyResearchFinish(args: {
    player_id: string
    city_id: string
    technology_id: string
    level: number
    execute_at: number
  }): Promise<string | null> {
    return scheduleTechnologyResearchFinish(this.ctx, args)
  }

  async cancelTechnologyResearchFinish(args: { player_id: string }): Promise<void> {
    return cancelTechnologyResearchFinish(this.ctx, args)
  }

  async getPendingTechnologyResearch(args: { player_id: string }): Promise<PendingTechnologyResearch | null> {
    return getPendingTechnologyResearch(this.ctx, args)
  }

  async scheduleTroopRecruitProgress(args: TroopRecruitProgressJobData & {
    execute_at: number
  }): Promise<string | null> {
    return scheduleTroopRecruitProgress(this.ctx, args)
  }

  async cancelTroopRecruitProgress(args: { city_id: string }): Promise<void> {
    return cancelTroopRecruitProgress(this.ctx, args)
  }

  async getPendingTroopRecruitProgress(args: { city_id: string }): Promise<PendingTroopRecruitProgress | null> {
    return getPendingTroopRecruitProgress(this.ctx, args)
  }

  async scheduleTroopMovementFinish(args: {
    player_id: string
    movement_id: string
    execute_at: number
  }): Promise<string | null> {
    return scheduleTroopMovementFinish(this.ctx, args)
  }

  async cancelTroopMovementFinish(args: { movement_id: string }): Promise<void> {
    return cancelTroopMovementFinish(this.ctx, args)
  }

  async getPendingTroopMovementFinish(args: { movement_id: string }): Promise<PendingTroopMovementFinish | null> {
    return getPendingTroopMovementFinish(this.ctx, args)
  }

  async scheduleCityResourcesGather(args: {
    execute_at: number
  }): Promise<string | null> {
    return scheduleCityResourcesGather(this.ctx, args)
  }

  async getPendingCityResourcesGather(): Promise<PendingCityResourcesGather | null> {
    return getPendingCityResourcesGather(this.ctx)
  }

  async ensureCityResourcesGatherScheduled(args: {
    execute_at: number
  }): Promise<string | null> {
    return ensureCityResourcesGatherScheduled(this.ctx, args)
  }

  async scheduleOutpostResourcesGather(args: {
    execute_at: number
  }): Promise<string | null> {
    return scheduleOutpostResourcesGather(this.ctx, args)
  }

  async getPendingOutpostResourcesGather(): Promise<PendingOutpostResourcesGather | null> {
    return getPendingOutpostResourcesGather(this.ctx)
  }

  async ensureOutpostResourcesGatherScheduled(args: {
    execute_at: number
  }): Promise<string | null> {
    return ensureOutpostResourcesGatherScheduled(this.ctx, args)
  }
}

export const createJobQueue = ({
  logger,
  connectionString
}: {
  logger: AppLogger
  connectionString?: string
}): JobQueue => {
  return new JobQueue({
    logger,
    connectionString
  })
}
