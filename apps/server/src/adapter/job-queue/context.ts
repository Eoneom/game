import type { PgBoss } from 'pg-boss'
import type { AppLogger } from '#app/port/logger'

export const DEFAULT_DATABASE_URL = 'postgres://eoneom:eoneom@localhost:5432/eoneom'
export const PGBOSS_SCHEMA = 'pgboss'

export type JobQueueContext = {
  boss: PgBoss
  logger: AppLogger
}

export const resolveDatabaseUrl = (connectionString?: string): string => {
  return connectionString ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL
}
