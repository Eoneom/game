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
