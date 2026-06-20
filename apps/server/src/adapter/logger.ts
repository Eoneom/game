import { AppLogger } from '#app/port/logger'
import pino, { Logger } from 'pino'

const TICK_LOG_PATH = 'logs/system-tick.log'

let stdout_root: Logger | undefined
let tick_root: Logger | undefined

const getStdoutRoot = (): Logger => {
  if (!stdout_root) {
    stdout_root = pino({ level: 'info' })
  }
  return stdout_root
}

const getTickRoot = (): Logger => {
  if (!tick_root) {
    tick_root = pino(
      { level: 'info' },
      pino.multistream([
        { stream: process.stdout },
        {
          stream: pino.destination({
            dest: TICK_LOG_PATH,
            mkdir: true,
            sync: true
          })
        }
      ])
    )
  }
  return tick_root
}

export const loggerAdapter = (pino_logger?: Logger): AppLogger => {
  const logger = pino_logger ?? getStdoutRoot()

  return {
    error: (message: string, obj?: Record<string, unknown>): void => {
      logger.error(obj, message)
    },
    warn: (message: string, obj?: Record<string, unknown>): void => {
      logger.warn(obj, message)
    },
    info: (message: string, obj?: Record<string, unknown>): void => {
      logger.info(obj, message)
    },
    debug: (message: string, obj?: Record<string, unknown>): void => {
      logger.debug(obj, message)
    },
    child: (args: Record<string, string>): AppLogger => {
      return loggerAdapter(logger.child(args))
    }
  }
}

export const createStdoutLogger = (component: string): AppLogger => {
  return loggerAdapter(getStdoutRoot().child({ component }))
}

export const createTickLogger = (component: string): AppLogger => {
  return loggerAdapter(getTickRoot().child({ component }))
}
