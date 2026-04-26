import '../../load-env'
import { getRootDatabase } from '#adapter/database/context'
import {
  migrateDown,
  migrateToLatest
} from './migrate'

async function main(): Promise<void> {
  const direction = process.argv[2]
  try {
    if (direction === 'down') {
      await migrateDown()
    } else {
      await migrateToLatest()
    }
    await getRootDatabase().destroy()
    process.exit(0)
  } catch (error) {
    console.error(error)
    try {
      await getRootDatabase().destroy()
    } catch {
      // ignore destroy errors during shutdown
    }
    process.exit(1)
  }
}

void main()
