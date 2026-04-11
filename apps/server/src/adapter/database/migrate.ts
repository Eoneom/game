import { createDatabase } from './client'
import { promises as fs } from 'fs'
import {
  FileMigrationProvider,
  Migrator
} from 'kysely/migration'
import * as path from 'path'

import '../../load-env'

async function createMigrator() {
  const db = createDatabase()
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations')
    })
  })
  return {
    db,
    migrator 
  }
}

async function migrateToLatest(): Promise<void> {
  const {
    db, migrator 
  } = await createMigrator()
  const {
    error, results 
  } = await migrator.migrateToLatest()

  results?.forEach((result) => {
    if (result.status === 'Success') {
      console.log(`migration "${result.migrationName}" was executed successfully`)
    } else if (result.status === 'Error') {
      console.error(`failed to execute migration "${result.migrationName}"`)
    }
  })

  if (error) {
    console.error('failed to migrate')
    console.error(error)
    await db.destroy()
    process.exit(1)
  }

  await db.destroy()
}

async function migrateDown(): Promise<void> {
  const {
    db, migrator 
  } = await createMigrator()
  const {
    error, results 
  } = await migrator.migrateDown()

  results?.forEach((result) => {
    if (result.status === 'Success') {
      console.log(`migration "${result.migrationName}" was reverted successfully`)
    } else if (result.status === 'Error') {
      console.error(`failed to revert migration "${result.migrationName}"`)
    }
  })

  if (error) {
    console.error('failed to migrate down')
    console.error(error)
    await db.destroy()
    process.exit(1)
  }

  await db.destroy()
}

const direction = process.argv[2]

if (direction === 'down') {
  migrateDown()
} else {
  migrateToLatest()
}
