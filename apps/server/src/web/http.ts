import { createServer } from 'http'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { router } from '#web/router'
import { createErrorMiddleware } from '#web/middleware/error'
import { setupWebSocketServer } from '#web/ws'
import { AppEventBus } from '#app/event-bus'
import { AppLogger } from '#app/port/logger'

const http = express()
const rawPort = Number.parseInt(
  process.env.HTTP_PORT ?? '3000',
  10
)
const port =
  Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 3000

http.use(cors())
http.use(bodyParser.json())

export const launchServer = ({
  logger,
  eventBus
}: {
  logger: AppLogger
  eventBus: AppEventBus
}) => {
  http.use(router())
  http.use(createErrorMiddleware(logger.child({ component: 'middleware:error' })))

  const server = createServer(http)
  setupWebSocketServer(server, {
    eventBus,
    logger: logger.child({ component: 'web:ws' })
  })

  server.listen(port, () => {
    logger.info('awesome server listening', { port })
  })
}
