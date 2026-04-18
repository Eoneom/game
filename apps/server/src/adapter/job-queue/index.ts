import { PgBoss } from 'pg-boss'
import { AppLogger } from '#app/port/logger'

const DEFAULT_DATABASE_URL = 'postgres://eoneom:eoneom@localhost:5432/eoneom'
const PGBOSS_SCHEMA = 'pgboss'

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
