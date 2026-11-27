import { RequestError } from '@eoneom/api-client'
import {
  WebSocketServer, WebSocket
} from 'ws'
import { Server } from 'http'
import { authorizeAuth } from '#app/command/auth/authorize'
import { isObservabilityAdmin } from '#app/query/admin/observability-access'
import { getPlayerFactionCode } from '#app/query/player/faction'
import { AppEventBus } from '#app/event-bus'
import { AppLogger } from '#app/port/logger'
import { AppEvent } from '#core/events'
import { FactionCode } from '#core/faction/constant/code'
import { now } from '#shared/time'

const ADMIN_OBSERVABILITY_WS_PATH = '/admin/observability/ws'

const game_connections = new Map<string, WebSocket>()
/** Faction of each connected player, for faction chat fan-out (slice 032). */
const game_connection_factions = new Map<string, FactionCode>()
const admin_observability_connections = new Map<string, WebSocket>()

/** Sends one message to several connected players (chat fan-out, slice 032). */
function sendToGamePlayers(
  message: Record<string, unknown>,
  is_recipient: (player_id: string) => boolean
): void {
  const data = JSON.stringify(message)
  game_connections.forEach((ws, player_id) => {
    if (ws.readyState === WebSocket.OPEN && is_recipient(player_id)) {
      ws.send(data)
    }
  })
}

/** `exchange:book-updated` goes out at most once per 2 s per faction book (slice 035). */
export const EXCHANGE_BOOK_UPDATE_THROTTLE_MS = 2000

/**
 * Leading-edge throttle per key: the first call runs at once; calls during the next `interval_ms` collapse into one
 * trailing run at the end of the window.
 */
type ThrottleWindow = { pending: (() => void) | null }

function createKeyedThrottle(interval_ms: number): (key: string, run: () => void) => void {
  const windows: Map<string, ThrottleWindow> = new Map()
  const open = (key: string) => {
    const window: ThrottleWindow = { pending: null }
    windows.set(key, window)
    setTimeout(() => {
      windows.delete(key)
      if (window.pending) {
        const pending = window.pending
        open(key)
        pending()
      }
    }, interval_ms)
  }
  return (key, run) => {
    const window = windows.get(key)
    if (window) {
      window.pending = run
      return
    }
    open(key)
    run()
  }
}

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

    let player_id: string | null
    try {
      player_id = await authorizeWsPlayerId(token)
    } catch {
      ws.close(4001, 'unauthorized')
      return
    }
    if (!player_id) {
      ws.close(4001, RequestError.TOKEN_NOT_FOUND)
      return
    }

    const connected_player_id = player_id
    game_connections.set(connected_player_id, ws)
    logger.info('game player connected', { player_id: connected_player_id })

    ws.on('close', () => {
      game_connections.delete(connected_player_id)
      game_connection_factions.delete(connected_player_id)
      logger.info('game player disconnected', { player_id: connected_player_id })
    })

    try {
      const faction_code = await getPlayerFactionCode({ player_id })
      if (game_connections.get(player_id) === ws) {
        game_connection_factions.set(player_id, faction_code)
      }
    } catch (err) {
      // Without a faction the player still gets every event except faction chat.
      logger.warn('game player faction unavailable', {
        player_id,
        err
      })
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

  eventBus.on(AppEvent.BattleFinished, ({
    player_id, report_id, perspective, winner
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.BattleFinished,
        player_id,
        report_id,
        perspective,
        winner,
      }))
    }
  })

  eventBus.on(AppEvent.MovementIncoming, ({
    player_id, movement_id, arrive_at
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.MovementIncoming,
        player_id,
        movement_id,
        arrive_at,
      }))
    }
  })

  eventBus.on(AppEvent.MailReceived, ({
    player_id, mail_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.MailReceived,
        mail_id,
      }))
    }
  })

  eventBus.on(AppEvent.ChatMessage, ({
    channel, faction_code, member_ids, excluded_player_ids, message
  }) => {
    const excluded = new Set(excluded_player_ids)
    const members = member_ids ? new Set(member_ids) : null
    sendToGamePlayers(
      {
        type: AppEvent.ChatMessage,
        channel,
        message,
      },
      (player_id) => !excluded.has(player_id)
        && (faction_code === null || game_connection_factions.get(player_id) === faction_code)
        && (members === null || members.has(player_id))
    )
  })

  eventBus.on(AppEvent.AllianceUpdated, ({
    player_ids, alliance_id
  }) => {
    const recipients = new Set(player_ids)
    sendToGamePlayers(
      {
        type: AppEvent.AllianceUpdated,
        alliance_id,
      },
      (player_id) => recipients.has(player_id)
    )
  })

  eventBus.on(AppEvent.AllianceInvitationReceived, ({
    player_id, invitation_id, alliance_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.AllianceInvitationReceived,
        invitation_id,
        alliance_id,
      }))
    }
  })

  eventBus.on(AppEvent.AllianceApplicationReceived, ({
    player_ids, application_id, alliance_id
  }) => {
    const recipients = new Set(player_ids)
    sendToGamePlayers(
      {
        type: AppEvent.AllianceApplicationReceived,
        application_id,
        alliance_id,
      },
      (player_id) => recipients.has(player_id)
    )
  })

  eventBus.on(AppEvent.AllianceJoined, ({
    player_id, alliance_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.AllianceJoined,
        alliance_id,
      }))
    }
  })

  eventBus.on(AppEvent.AllianceLeft, ({
    player_id, alliance_id, reason
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.AllianceLeft,
        alliance_id,
        reason,
      }))
    }
  })

  eventBus.on(AppEvent.ReinforcementArrived, ({
    player_id, city_id, owner_player_id, report_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.ReinforcementArrived,
        city_id,
        owner_player_id,
        report_id,
      }))
    }
  })

  eventBus.on(AppEvent.ReinforcementRecalled, ({
    player_id, city_id, owner_player_id, movement_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.ReinforcementRecalled,
        city_id,
        owner_player_id,
        movement_id,
      }))
    }
  })

  eventBus.on(AppEvent.ExchangeFilled, ({
    player_id, order_id, lots, price
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.ExchangeFilled,
        order_id,
        lots,
        price,
      }))
    }
  })

  const throttleBookUpdate = createKeyedThrottle(EXCHANGE_BOOK_UPDATE_THROTTLE_MS)
  eventBus.on(AppEvent.ExchangeBookUpdated, ({
    faction_code, resource
  }) => {
    throttleBookUpdate(`${faction_code}:${resource}`, () => sendToGamePlayers(
      {
        type: AppEvent.ExchangeBookUpdated,
        resource,
      },
      (player_id) => game_connection_factions.get(player_id) === faction_code
    ))
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

  eventBus.on(AppEvent.TroopQueueItemDropped, ({
    player_id,
    city_id,
    troop_code,
    error_code
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.TroopQueueItemDropped,
        city_id,
        troop_code,
        error_code
      }))
    }
  })

  eventBus.on(AppEvent.DefenseBuildUpdated, ({
    city_id, player_id
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.DefenseBuildUpdated,
        city_id
      }))
    }
  })

  eventBus.on(AppEvent.DefenseQueueItemDropped, ({
    player_id,
    city_id,
    defense_code,
    error_code
  }) => {
    const ws = game_connections.get(player_id)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: AppEvent.DefenseQueueItemDropped,
        city_id,
        defense_code,
        error_code
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
