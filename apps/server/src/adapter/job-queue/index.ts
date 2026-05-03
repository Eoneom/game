import {
  PgBoss,
  type WorkHandlerFor,
  type WorkOptions
} from 'pg-boss'
import { AppLogger } from '#app/port/logger'

const DEFAULT_DATABASE_URL = 'postgres://eoneom:eoneom@localhost:5432/eoneom'
const PGBOSS_SCHEMA = 'pgboss'

export const BUILDING_UPGRADE_FINISH_QUEUE = 'building.upgrade.finish'
export const TECHNOLOGY_RESEARCH_FINISH_QUEUE = 'technology.research.finish'
export const TROOP_RECRUIT_PROGRESS_QUEUE = 'troop.recruit.progress'
export const TROOP_MOVEMENT_FINISH_QUEUE = 'troop.movement.finish'
export const CITY_RESOURCES_GATHER_QUEUE = 'city.resources.gather'

export const TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS = 5_000
export const CITY_RESOURCES_GATHER_INTERVAL_MS = 5_000
export const CITY_RESOURCES_GATHER_SINGLETON_KEY = 'global'

export type BuildingUpgradeFinishJobData = {
  player_id: string
  city_id: string
  building_id: string
  level: number
}

export type PendingBuildingUpgrade = BuildingUpgradeFinishJobData & {
  execute_at: number
  job_id: string
}

export type TechnologyResearchFinishJobData = {
  player_id: string
  city_id: string
  technology_id: string
  level: number
}

export type PendingTechnologyResearch = TechnologyResearchFinishJobData & {
  execute_at: number
  job_id: string
}

export type TroopRecruitProgressJobData = {
  player_id: string
  city_id: string
  troop_id: string
  remaining_count: number
  finish_at: number
  started_at: number
  last_progress: number
}

export type PendingTroopRecruitProgress = TroopRecruitProgressJobData & {
  execute_at: number
  job_id: string
}

export type TroopMovementFinishJobData = {
  player_id: string
  movement_id: string
}

export type PendingTroopMovementFinish = TroopMovementFinishJobData & {
  execute_at: number
  job_id: string
}

export type CityResourcesGatherJobData = Record<string, never>

export type PendingCityResourcesGather = {
  execute_at: number
  job_id: string
}

export const nextTroopRecruitProgressAt = ({
  finish_at,
  remaining_count,
  now: now_ms
}: {
  finish_at: number
  remaining_count: number
  now: number
}): number => {
  const remaining_ms = Math.max(0, finish_at - now_ms)
  if (remaining_ms === 0 || remaining_count <= 0) {
    return finish_at
  }

  const ms_per_unit = remaining_ms / remaining_count
  const delay = Math.min(remaining_ms, Math.max(TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS, ms_per_unit))
  return now_ms + delay
}

const resolveDatabaseUrl = (connectionString?: string): string => {
  return connectionString ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL
}

export class JobQueue {
  private readonly boss: PgBoss
  private readonly logger: AppLogger

  constructor({
    logger,
    connectionString
  }: {
    logger: AppLogger
    connectionString?: string
  }) {
    this.logger = logger
    this.boss = new PgBoss({
      connectionString: resolveDatabaseUrl(connectionString),
      schema: PGBOSS_SCHEMA
    })

    this.boss.on('error', (error: Error) => {
      this.logger.error(error.message, { err: error })
    })
  }

  async start(): Promise<void> {
    this.logger.info('starting pg-boss...')
    await this.boss.start()
    await this.boss.createQueue(BUILDING_UPGRADE_FINISH_QUEUE)
    await this.boss.createQueue(TECHNOLOGY_RESEARCH_FINISH_QUEUE)
    await this.boss.createQueue(TROOP_RECRUIT_PROGRESS_QUEUE, { policy: 'stately' })
    await this.boss.createQueue(TROOP_MOVEMENT_FINISH_QUEUE)
    await this.boss.createQueue(CITY_RESOURCES_GATHER_QUEUE, { policy: 'stately' })
    this.logger.info('pg-boss started', { schema: PGBOSS_SCHEMA })
  }

  async stop(): Promise<void> {
    this.logger.info('stopping pg-boss...')
    await this.boss.stop({ graceful: true })
    this.logger.info('pg-boss stopped')
  }

  getBoss(): PgBoss {
    return this.boss
  }

  async work<ReqData, ResData = unknown, const O extends WorkOptions = WorkOptions>(
    name: string,
    options: O,
    handler: WorkHandlerFor<O, ReqData, ResData>
  ): Promise<string> {
    return this.boss.work(name, options, handler)
  }

  async scheduleBuildingUpgradeFinish({
    player_id,
    city_id,
    building_id,
    level,
    execute_at
  }: {
    player_id: string
    city_id: string
    building_id: string
    level: number
    execute_at: number
  }): Promise<string | null> {
    const data: BuildingUpgradeFinishJobData = {
      player_id,
      city_id,
      building_id,
      level
    }

    this.logger.info('schedule building upgrade finish', {
      city_id,
      building_id,
      level,
      execute_at
    })

    return this.boss.send(BUILDING_UPGRADE_FINISH_QUEUE, data, {
      startAfter: new Date(execute_at),
      singletonKey: city_id
    })
  }

  async cancelBuildingUpgradeFinish({ city_id }: { city_id: string }): Promise<void> {
    const jobs = await this.boss.findJobs<BuildingUpgradeFinishJobData>(
      BUILDING_UPGRADE_FINISH_QUEUE,
      {
        key: city_id,
        queued: true
      }
    )

    if (jobs.length === 0) {
      this.logger.info('no queued building upgrade job to cancel', { city_id })
      return
    }

    const ids = jobs.map(job => job.id)
    this.logger.info('cancel building upgrade finish', {
      city_id,
      ids
    })
    await this.boss.cancel(BUILDING_UPGRADE_FINISH_QUEUE, ids)
  }

  async getPendingBuildingUpgrade({ city_id }: { city_id: string }): Promise<PendingBuildingUpgrade | null> {
    const jobs = await this.boss.findJobs<BuildingUpgradeFinishJobData>(
      BUILDING_UPGRADE_FINISH_QUEUE,
      { key: city_id }
    )

    const job = jobs.find(candidate => candidate.state === 'created' || candidate.state === 'retry' || candidate.state === 'active')

    if (!job || !job.data) {
      return null
    }

    return {
      player_id: job.data.player_id,
      city_id: job.data.city_id,
      building_id: job.data.building_id,
      level: job.data.level,
      execute_at: job.startAfter.getTime(),
      job_id: job.id
    }
  }

  async scheduleTechnologyResearchFinish({
    player_id,
    city_id,
    technology_id,
    level,
    execute_at
  }: {
    player_id: string
    city_id: string
    technology_id: string
    level: number
    execute_at: number
  }): Promise<string | null> {
    const data: TechnologyResearchFinishJobData = {
      player_id,
      city_id,
      technology_id,
      level
    }

    this.logger.info('schedule technology research finish', {
      player_id,
      city_id,
      technology_id,
      level,
      execute_at
    })

    return this.boss.send(TECHNOLOGY_RESEARCH_FINISH_QUEUE, data, {
      startAfter: new Date(execute_at),
      singletonKey: player_id
    })
  }

  async cancelTechnologyResearchFinish({ player_id }: { player_id: string }): Promise<void> {
    const jobs = await this.boss.findJobs<TechnologyResearchFinishJobData>(
      TECHNOLOGY_RESEARCH_FINISH_QUEUE,
      {
        key: player_id,
        queued: true
      }
    )

    if (jobs.length === 0) {
      this.logger.info('no queued technology research job to cancel', { player_id })
      return
    }

    const ids = jobs.map(job => job.id)
    this.logger.info('cancel technology research finish', {
      player_id,
      ids
    })
    await this.boss.cancel(TECHNOLOGY_RESEARCH_FINISH_QUEUE, ids)
  }

  async getPendingTechnologyResearch({ player_id }: { player_id: string }): Promise<PendingTechnologyResearch | null> {
    const jobs = await this.boss.findJobs<TechnologyResearchFinishJobData>(
      TECHNOLOGY_RESEARCH_FINISH_QUEUE,
      { key: player_id }
    )

    const job = jobs.find(candidate => candidate.state === 'created' || candidate.state === 'retry' || candidate.state === 'active')

    if (!job || !job.data) {
      return null
    }

    return {
      player_id: job.data.player_id,
      city_id: job.data.city_id,
      technology_id: job.data.technology_id,
      level: job.data.level,
      execute_at: job.startAfter.getTime(),
      job_id: job.id
    }
  }

  async scheduleTroopRecruitProgress({
    player_id,
    city_id,
    troop_id,
    remaining_count,
    finish_at,
    started_at,
    last_progress,
    execute_at
  }: TroopRecruitProgressJobData & {
    execute_at: number
  }): Promise<string | null> {
    const data: TroopRecruitProgressJobData = {
      player_id,
      city_id,
      troop_id,
      remaining_count,
      finish_at,
      started_at,
      last_progress
    }

    this.logger.info('schedule troop recruit progress', {
      city_id,
      troop_id,
      remaining_count,
      finish_at,
      execute_at
    })

    return this.boss.send(TROOP_RECRUIT_PROGRESS_QUEUE, data, {
      startAfter: new Date(execute_at),
      singletonKey: city_id
    })
  }

  async cancelTroopRecruitProgress({ city_id }: { city_id: string }): Promise<void> {
    const jobs = await this.boss.findJobs<TroopRecruitProgressJobData>(
      TROOP_RECRUIT_PROGRESS_QUEUE,
      {
        key: city_id,
        queued: true
      }
    )

    if (jobs.length === 0) {
      this.logger.info('no queued troop recruit progress job to cancel', { city_id })
      return
    }

    const ids = jobs.map(job => job.id)
    this.logger.info('cancel troop recruit progress', {
      city_id,
      ids
    })
    await this.boss.cancel(TROOP_RECRUIT_PROGRESS_QUEUE, ids)
  }

  async getPendingTroopRecruitProgress({ city_id }: { city_id: string }): Promise<PendingTroopRecruitProgress | null> {
    const jobs = await this.boss.findJobs<TroopRecruitProgressJobData>(
      TROOP_RECRUIT_PROGRESS_QUEUE,
      { key: city_id }
    )

    const job = jobs.find(candidate => candidate.state === 'created')
      ?? jobs.find(candidate => candidate.state === 'retry')
      ?? jobs.find(candidate => candidate.state === 'active')

    if (!job || !job.data) {
      return null
    }

    return {
      player_id: job.data.player_id,
      city_id: job.data.city_id,
      troop_id: job.data.troop_id,
      remaining_count: job.data.remaining_count,
      finish_at: job.data.finish_at,
      started_at: job.data.started_at,
      last_progress: job.data.last_progress,
      execute_at: job.startAfter.getTime(),
      job_id: job.id
    }
  }

  async scheduleTroopMovementFinish({
    player_id,
    movement_id,
    execute_at
  }: {
    player_id: string
    movement_id: string
    execute_at: number
  }): Promise<string | null> {
    const data: TroopMovementFinishJobData = {
      player_id,
      movement_id
    }

    this.logger.info('schedule troop movement finish', {
      player_id,
      movement_id,
      execute_at
    })

    return this.boss.send(TROOP_MOVEMENT_FINISH_QUEUE, data, {
      startAfter: new Date(execute_at),
      singletonKey: movement_id
    })
  }

  async cancelTroopMovementFinish({ movement_id }: { movement_id: string }): Promise<void> {
    const jobs = await this.boss.findJobs<TroopMovementFinishJobData>(
      TROOP_MOVEMENT_FINISH_QUEUE,
      {
        key: movement_id,
        queued: true
      }
    )

    if (jobs.length === 0) {
      this.logger.info('no queued troop movement finish job to cancel', { movement_id })
      return
    }

    const ids = jobs.map(job => job.id)
    this.logger.info('cancel troop movement finish', {
      movement_id,
      ids
    })
    await this.boss.cancel(TROOP_MOVEMENT_FINISH_QUEUE, ids)
  }

  async getPendingTroopMovementFinish({ movement_id }: { movement_id: string }): Promise<PendingTroopMovementFinish | null> {
    const jobs = await this.boss.findJobs<TroopMovementFinishJobData>(
      TROOP_MOVEMENT_FINISH_QUEUE,
      { key: movement_id }
    )

    const job = jobs.find(candidate => candidate.state === 'created' || candidate.state === 'retry' || candidate.state === 'active')

    if (!job || !job.data) {
      return null
    }

    return {
      player_id: job.data.player_id,
      movement_id: job.data.movement_id,
      execute_at: job.startAfter.getTime(),
      job_id: job.id
    }
  }

  async scheduleCityResourcesGather({
    execute_at
  }: {
    execute_at: number
  }): Promise<string | null> {
    const data: CityResourcesGatherJobData = {}

    this.logger.info('schedule city resources gather', { execute_at })

    return this.boss.send(CITY_RESOURCES_GATHER_QUEUE, data, {
      startAfter: new Date(execute_at),
      singletonKey: CITY_RESOURCES_GATHER_SINGLETON_KEY
    })
  }

  async getPendingCityResourcesGather(): Promise<PendingCityResourcesGather | null> {
    const jobs = await this.boss.findJobs<CityResourcesGatherJobData>(
      CITY_RESOURCES_GATHER_QUEUE,
      { key: CITY_RESOURCES_GATHER_SINGLETON_KEY }
    )

    const job = jobs.find(candidate => candidate.state === 'created')
      ?? jobs.find(candidate => candidate.state === 'retry')
      ?? jobs.find(candidate => candidate.state === 'active')

    if (!job) {
      return null
    }

    return {
      execute_at: job.startAfter.getTime(),
      job_id: job.id
    }
  }

  async ensureCityResourcesGatherScheduled({
    execute_at
  }: {
    execute_at: number
  }): Promise<string | null> {
    const pending = await this.getPendingCityResourcesGather()
    if (pending) {
      this.logger.info('city resources gather already scheduled', {
        job_id: pending.job_id,
        execute_at: pending.execute_at
      })
      return pending.job_id
    }

    return this.scheduleCityResourcesGather({ execute_at })
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
