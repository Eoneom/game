import type { DB } from './types'
import {
  Kysely, PostgresDialect 
} from 'kysely'
import { Pool } from 'pg'

export type Database = DB

export function createDatabase(connectionString?: string): Kysely<DB> {
  const databaseUrl =
    connectionString ??
    process.env.DATABASE_URL ??
    'postgres://eoneom:eoneom@localhost:5432/eoneom'

  return new Kysely<DB>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString: databaseUrl }) }) })
}
