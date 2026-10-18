import { RequestError } from '@eoneom/api-client'
import {
  WebSocketServer, WebSocket
} from 'ws'
import { Server } from 'http'
import { authorizeAuth } from '#app/command/auth/authorize'
import { isObservabilityAdmin } from '#app/query/admin/observability-access'
import { AppEventBus } from '#app/event-bus'
import { AppLogger } from '#app/port/logger'
import { AppEvent } from '#core/events'
import { now } from '#shared/time'

const ADMIN_OBSERVABILITY_WS_PATH = '/admin/observability/ws'

const game_connections = new Map<string, WebSocket>()
const admin_observability_connections = new Map<string, WebSocket>()

async function authorizeWsPlayerId(token: string | null): Promise<string | null> {
  if (!token) {
    return null
  }
  const { player_id } = await authorizeAuth({
    token,
    action_at: now()
  })
  return player_id
}

export function setupWebSocketServer(
  server: Server,
  {
    eventBus,
    logger
  }: {
    eventBus: AppEventBus
    logger: AppLogger
  }
): void {
  const game_wss = new WebSocketServer({ noServer: true })
  const admin_observability_wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url ?? '', 'http://localhost').pathname

    if (pathname === ADMIN_OBSERVABILITY_WS_PATH) {
      admin_observability_wss.handleUpgrade(request, socket, head, (ws) => {
        admin_observability_wss.emit('connection', ws, request)
      })
      return
    }

    game_wss.handleUpgrade(request, socket, head, (ws) => {
      game_wss.emit('connection', ws, request)
    })
  })

  game_wss.on('connection', async (ws, req) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(4001, RequestError.TOKEN_NOT_FOUND)
      return
    }

    try {
      const player_id = await authorizeWsPlayerId(token)
      if (!player_id) {
        ws.close(4001, RequestError.TOKEN_NOT_FOUND)
        return
      }
      game_connections.set(player_id, ws)
      logger.info('game player connected', { player_id })

      ws.on('close', () => {
        game_connections.delete(player_id)
        logger.info('game player disconnected', { player_id })
      })
    } catch {
      ws.close(4001, 'unauthorized')
    }
  })

  admin_observability_wss.on('connection', async (ws, req) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(4001, RequestError.TOKEN_NOT_FOUND)
      return
    }

    try {
      const player_id = await authorizeWsPlayerId(token)
      if (!player_id) {
        ws.close(4001, RequestError.TOKEN_NOT_FOUND)
        return
      }
      const is_admin = await isObservabilityAdmin({ player_id })
      if (!is_admin) {
        ws.close(4003, 'forbidden')
        return
      }

      admin_observability_connections.set(player_id, ws)
      logger.info('admin observability connected', { player_id })

      ws.on('close', () => {
        admin_observability_connections.delete(player_id)
        logger.info('admin observability disconnected', { player_id })
      })
    } catch {
      ws.close(4001, 'unauthorized')
    }
  })

  eventBus.on(AppEvent.CityResourcesGathered, ({
    city_id, player_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.CityResourcesGathered,
        city_id
      }))
    }
  })

  eventBus.on(AppEvent.BuildingUpgradeFinished, ({
    city_id, player_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.BuildingUpgradeFinished,
        city_id
      }))
    }
  })

  eventBus.on(AppEvent.BuildingQueueItemDropped, ({
    player_id,
    city_id,
    building_code,
    error_code
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.BuildingQueueItemDropped,
        city_id,
        building_code,
        error_code
      }))
    }
  })

  eventBus.on(AppEvent.TechnologyResearchFinished, ({ player_id }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: AppEvent.TechnologyResearchFinished }))
    }
  })

  eventBus.on(AppEvent.TechnologyQueueItemDropped, ({
    player_id,
    city_id,
    technology_code,
    error_code
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.TechnologyQueueItemDropped,
        city_id,
        technology_code,
        error_code
      }))
    }
  })

  eventBus.on(AppEvent.TroopMovementFinished, ({ player_id }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: AppEvent.TroopMovementFinished }))
    }
  })

  eventBus.on(AppEvent.TroopRecruitmentUpdated, ({
    city_id, player_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.TroopRecruitmentUpdated,
        city_id
      }))
    }
  })

  eventBus.on(AppEvent.OutpostCreated, ({ player_id }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: AppEvent.OutpostCreated }))
    }
  })

  eventBus.on(AppEvent.OutpostDeleted, ({
    player_id, outpost_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.OutpostDeleted,
        outpost_id
      }))
    }
  })

  eventBus.on(AppEvent.OutpostResourcesGathered, ({
    outpost_id, player_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.OutpostResourcesGathered,
        outpost_id
      }))
    }
  })

  eventBus.on(AppEvent.SystemPlayerActionCommitted, (payload) => {
    for (const [ admin_player_id, ws ] of admin_observability_connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: AppEvent.SystemPlayerActionCommitted,
          committed_at: payload.committed_at,
          player_id: payload.player_id,
          player_name: payload.player_name,
          tick_index: payload.tick_index,
          outcome: payload.outcome,
          attempts: payload.attempts,
          summary: payload.summary,
          committed_actions: payload.committed_actions,
          payload: payload.payload,
        }))
      } else {
        admin_observability_connections.delete(admin_player_id)
      }
    }
  })

  eventBus.on(AppEvent.SystemPlayerStatsUpdated, (snapshot) => {
    for (const [ admin_player_id, ws ] of admin_observability_connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: AppEvent.SystemPlayerStatsUpdated,
          ...snapshot,
        }))
      } else {
        admin_observability_connections.delete(admin_player_id)
      }
    }
  })
}
