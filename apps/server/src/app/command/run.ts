import { Factory } from '#adapter/factory'

export async function runCommand<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const logger = Factory.getLogger(`app:command:${name}`)
  logger.info('run')
  return Factory.runInTransaction(fn)
}
