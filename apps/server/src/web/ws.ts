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

const connections = new Map<string, WebSocket>()
const admin_connections = new Set<string>()

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
  const wss = new WebSocketServer({ server })

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url ?? '', 'http://localhost')
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(4001, RequestError.TOKEN_NOT_FOUND)
      return
    }

    try {
      const { player_id } = await authorizeAuth({
        token,
        action_at: now()
      })

      connections.set(player_id, ws)
      const is_admin = await isObservabilityAdmin({ player_id })
      if (is_admin) {
        admin_connections.add(player_id)
      }
      logger.info('player connected', {
        player_id,
        is_admin,
      })

      ws.on('close', () => {
        connections.delete(player_id)
        admin_connections.delete(player_id)
        logger.info('player disconnected', { player_id })
      })
    } catch {
      ws.close(4001, 'unauthorized')
    }
  })

  eventBus.on(AppEvent.CityResourcesGathered, ({
    city_id, player_id
  }) => {
    const ws = connections.get(player_id)
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
    const ws = connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.BuildingUpgradeFinished,
        city_id
      }))
    }
  })

  eventBus.on(AppEvent.TechnologyResearchFinished, ({ player_id }) => {
    const ws = connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: AppEvent.TechnologyResearchFinished }))
    }
  })

  eventBus.on(AppEvent.TroopMovementFinished, ({ player_id }) => {
    const ws = connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: AppEvent.TroopMovementFinished }))
    }
  })

  eventBus.on(AppEvent.TroopRecruitmentUpdated, ({
    city_id, player_id
  }) => {
    const ws = connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.TroopRecruitmentUpdated,
        city_id
      }))
    }
  })

  eventBus.on(AppEvent.OutpostCreated, ({ player_id }) => {
    const ws = connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: AppEvent.OutpostCreated }))
    }
  })

  eventBus.on(AppEvent.OutpostDeleted, ({
    player_id, outpost_id
  }) => {
    const ws = connections.get(player_id)
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
    const ws = connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.OutpostResourcesGathered,
        outpost_id
      }))
    }
  })

  eventBus.on(AppEvent.SystemPlayerActionCommitted, (payload) => {
    for (const admin_player_id of admin_connections) {
      const ws = connections.get(admin_player_id)
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: AppEvent.SystemPlayerActionCommitted,
          committed_at: payload.committed_at,
          player_id: payload.player_id,
          player_name: payload.player_name,
          tick_index: payload.tick_index,
          category: payload.category,
          summary: payload.summary,
          payload: payload.payload,
        }))
      }
    }
  })
}
