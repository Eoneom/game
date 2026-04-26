import { getRootDatabase } from '#adapter/database/context'
import { Factory } from '#adapter/factory'
import { promises as fs } from 'fs'
import {
  FileMigrationProvider,
  Migrator
} from 'kysely/migration'
import * as path from 'path'

function createMigrator() {
  return new Migrator({
    db: getRootDatabase(),
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  })
}

function logResults(
  results: Awaited<ReturnType<Migrator['migrateToLatest']>>['results'],
  action: 'execute' | 'revert'
): void {
  const logger = Factory.getLogger('adapter:database:migrate')
  results?.forEach((result) => {
    if (result.status === 'Success') {
      logger.info(`migration "${result.migrationName}" was ${action === 'execute' ? 'executed' : 'reverted'} successfully`)
    } else if (result.status === 'Error') {
      logger.error(`failed to ${action} migration "${result.migrationName}"`)
    }
  })
}

export async function migrateToLatest(): Promise<void> {
  const logger = Factory.getLogger('adapter:database:migrate')
  const migrator = createMigrator()
  const {
    error,
    results,
  } = await migrator.migrateToLatest()

  logResults(results, 'execute')

  if (error) {
    logger.error('failed to migrate')
    throw error
  }
}

export async function migrateDown(): Promise<void> {
  const logger = Factory.getLogger('adapter:database:migrate')
  const migrator = createMigrator()
  const {
    error,
    results,
  } = await migrator.migrateDown()

  logResults(results, 'revert')

  if (error) {
    logger.error('failed to migrate down')
    throw error
  }
}
