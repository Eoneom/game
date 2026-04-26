import { Factory } from '#adapter/factory'
import { withTransaction } from '#adapter/database/context'

export async function runCommand<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const logger = Factory.getLogger(`app:command:${name}`)
  logger.info('run')
  return withTransaction(fn)
}
