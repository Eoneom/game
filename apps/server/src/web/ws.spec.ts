import { RequestError } from '@eoneom/api-client'
import {
  vi, type MockInstance 
} from 'vitest'
vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(function () {
    return { on: vi.fn() }
  }),
  WebSocket: { OPEN: 1 },
}))

vi.mock('#app/command/auth/authorize', () => ({ authorizeAuth: vi.fn() }))
vi.mock('#app/query/admin/observability-access', () => ({ isObservabilityAdmin: vi.fn().mockResolvedValue(false) }))

import { setupWebSocketServer } from './ws'
import {
  WebSocketServer, WebSocket 
} from 'ws'
import { AppEvent } from '#core/events'
import { authorizeAuth } from '#app/command/auth/authorize'
import { isObservabilityAdmin } from '#app/query/admin/observability-access'
import { Server } from 'http'

function makeMockWs(readyState: number = WebSocket.OPEN) {
  const handlers: Map<string, () => void> = new Map()
  return {
    close: vi.fn(),
    send: vi.fn(),
    on: vi.fn((event: string, handler: () => void) => {
      handlers.set(event, handler)
    }),
    readyState,
    _handlers: handlers,
  }
}

function makeReq(url: string) {
  return { url }
}

describe('setupWebSocketServer', () => {
  let mockLogger: { info: MockInstance; error: MockInstance; warn: MockInstance; debug: MockInstance; child: MockInstance }
  let capturedEventListeners: Map<string, (payload: unknown) => void>
  let gameConnectionHandler: (ws: ReturnType<typeof makeMockWs>, req: ReturnType<typeof makeReq>) => Promise<void>
  let adminObservabilityConnectionHandler: (ws: ReturnType<typeof makeMockWs>, req: ReturnType<typeof makeReq>) => Promise<void>

  beforeEach(() => {
    vi.clearAllMocks()
    capturedEventListeners = new Map()

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    }

    const eventBus = {
      emit: vi.fn(),
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        capturedEventListeners.set(event, handler)
      }),
    }

    setupWebSocketServer({ on: vi.fn() } as Server, {
      eventBus: eventBus as any,
      logger: mockLogger as any
    })

    const wss_instances = (WebSocketServer as unknown as MockInstance).mock.results.map(
      result => result.value
    )
    const game_wss = wss_instances[wss_instances.length - 2]
    const admin_wss = wss_instances[wss_instances.length - 1]

    gameConnectionHandler = (game_wss.on as MockInstance).mock.calls.find(([ event ]) => event === 'connection')[1]
    adminObservabilityConnectionHandler = (admin_wss.on as MockInstance).mock.calls.find(([ event ]) => event === 'connection')[1]
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('closes the connection when token is missing from the URL', async () => {
    const mockWs = makeMockWs()

    await gameConnectionHandler(mockWs, makeReq('/'))

    expect(mockWs.close).toHaveBeenCalledWith(4001, RequestError.TOKEN_NOT_FOUND)
  })

  it('closes the connection when authorization fails', async () => {
    (authorizeAuth as MockInstance).mockRejectedValue(new Error('invalid token'))
    const mockWs = makeMockWs()

    await gameConnectionHandler(mockWs, makeReq('/?token=bad-token'))

    expect(mockWs.close).toHaveBeenCalledWith(4001, 'unauthorized')
  })

  it('forwards CityResourcesGathered event to the connected player WebSocket', async () => {
    const player_id = 'player-1'
    const city_id = 'city-1'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.CityResourcesGathered)
    eventHandler?.({
      city_id,
      player_id 
    })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: AppEvent.CityResourcesGathered,
      city_id 
    }))
  })

  it('does not send when the WebSocket is not open', async () => {
    const player_id = 'player-2'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(0)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.CityResourcesGathered)
    eventHandler?.({
      city_id: 'city-1',
      player_id 
    })

    expect(mockWs.send).not.toHaveBeenCalled()
  })

  it('removes the player connection on WebSocket close and stops forwarding events', async () => {
    const player_id = 'player-3'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    mockWs._handlers.get('close')?.()

    const eventHandler = capturedEventListeners.get(AppEvent.CityResourcesGathered)
    eventHandler?.({
      city_id: 'city-1',
      player_id 
    })

    expect(mockWs.send).not.toHaveBeenCalled()
  })

  it('forwards BuildingUpgradeFinished event with city_id to the connected player WebSocket', async () => {
    const player_id = 'player-4'
    const city_id = 'city-2'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.BuildingUpgradeFinished)
    eventHandler?.({
      city_id,
      player_id 
    })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: AppEvent.BuildingUpgradeFinished,
      city_id 
    }))
  })

  it('forwards TechnologyResearchFinished event to the connected player WebSocket', async () => {
    const player_id = 'player-5'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.TechnologyResearchFinished)
    eventHandler?.({ player_id })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: AppEvent.TechnologyResearchFinished }))
  })

  it('forwards TroopMovementFinished event to the connected player WebSocket', async () => {
    const player_id = 'player-6'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.TroopMovementFinished)
    eventHandler?.({ player_id })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: AppEvent.TroopMovementFinished }))
  })

  it('forwards TroopRecruitmentUpdated event with city_id to the connected player WebSocket', async () => {
    const player_id = 'player-6b'
    const city_id = 'city-recruit'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.TroopRecruitmentUpdated)
    eventHandler?.({
      player_id,
      city_id
    })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: AppEvent.TroopRecruitmentUpdated,
      city_id
    }))
  })

  it('forwards OutpostCreated event to the connected player WebSocket', async () => {
    const player_id = 'player-7'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.OutpostCreated)
    eventHandler?.({ player_id })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: AppEvent.OutpostCreated }))
  })

  it('forwards OutpostDeleted event with outpost_id to the connected player WebSocket', async () => {
    const player_id = 'player-8'
    const outpost_id = 'outpost-1'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.OutpostDeleted)
    eventHandler?.({
      player_id,
      outpost_id 
    })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: AppEvent.OutpostDeleted,
      outpost_id 
    }))
  })

  it('forwards OutpostResourcesGathered event with outpost_id to the connected player WebSocket', async () => {
    const player_id = 'player-11'
    const outpost_id = 'outpost-2'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.OutpostResourcesGathered)
    eventHandler?.({
      player_id,
      outpost_id
    })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: AppEvent.OutpostResourcesGathered,
      outpost_id
    }))
  })

  it('forwards SystemPlayerActionCommitted to admin observability WebSockets only', async () => {
    const admin_player_id = 'admin-1'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id: admin_player_id })
    ;(isObservabilityAdmin as MockInstance).mockResolvedValue(true)
    const mockWs = makeMockWs(WebSocket.OPEN)

    await adminObservabilityConnectionHandler(
      mockWs,
      makeReq('/admin/observability/ws?token=valid-token')
    )

    const eventHandler = capturedEventListeners.get(AppEvent.SystemPlayerActionCommitted)
    eventHandler?.({
      committed_at: 1,
      player_id: 'system-1',
      player_name: 'Alpha',
      tick_index: 3,
      outcome: 'success',
      attempts: [
        {
          category: 'upgrade',
          result: 'success',
        },
      ],
      summary: 'Joueur système Alpha — test',
      committed_actions: [
        {
          category: 'upgrade',
          payload: { building_code: 'mushroom_farm' },
        },
      ],
    })

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: AppEvent.SystemPlayerActionCommitted,
      committed_at: 1,
      player_id: 'system-1',
      player_name: 'Alpha',
      tick_index: 3,
      outcome: 'success',
      attempts: [
        {
          category: 'upgrade',
          result: 'success',
        },
      ],
      summary: 'Joueur système Alpha — test',
      committed_actions: [
        {
          category: 'upgrade',
          payload: { building_code: 'mushroom_farm' },
        },
      ],
    }))
  })

  it('does not forward SystemPlayerActionCommitted on the game WebSocket', async () => {
    const admin_player_id = 'admin-2'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id: admin_player_id })
    ;(isObservabilityAdmin as MockInstance).mockResolvedValue(true)
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.SystemPlayerActionCommitted)
    eventHandler?.({
      committed_at: 1,
      player_id: 'system-1',
      player_name: 'Alpha',
      tick_index: 1,
      outcome: 'idle',
      attempts: [],
      summary: 'idle',
      payload: {},
    })

    expect(mockWs.send).not.toHaveBeenCalled()
  })

  it('forwards SystemPlayerStatsUpdated to admin observability WebSockets only', async () => {
    const admin_player_id = 'admin-1'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id: admin_player_id })
    ;(isObservabilityAdmin as MockInstance).mockResolvedValue(true)
    const mockWs = makeMockWs(WebSocket.OPEN)

    await adminObservabilityConnectionHandler(
      mockWs,
      makeReq('/admin/observability/ws?token=valid-token')
    )

    const eventHandler = capturedEventListeners.get(AppEvent.SystemPlayerStatsUpdated)
    const snapshot = {
      player_id: 'system-1',
      player_name: 'Alpha',
      cities: [],
      outposts: [],
      technologies: [],
      buildings_by_city: [],
      updated_at: 2,
    }
    eventHandler?.(snapshot)

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({
      type: AppEvent.SystemPlayerStatsUpdated,
      ...snapshot,
    }))
  })

  it('closes admin observability WebSocket when player is not allowlisted', async () => {
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id: 'player-x' })
    ;(isObservabilityAdmin as MockInstance).mockResolvedValue(false)
    const mockWs = makeMockWs(WebSocket.OPEN)

    await adminObservabilityConnectionHandler(
      mockWs,
      makeReq('/admin/observability/ws?token=valid-token')
    )

    expect(mockWs.close).toHaveBeenCalledWith(4003, 'forbidden')
  })

  it('does not forward an event to a different player WebSocket', async () => {
    const player_id = 'player-9'
    const other_player_id = 'player-10'
    ;(authorizeAuth as MockInstance).mockResolvedValue({ player_id })
    const mockWs = makeMockWs(WebSocket.OPEN)

    await gameConnectionHandler(mockWs, makeReq('/?token=valid-token'))

    const eventHandler = capturedEventListeners.get(AppEvent.CityResourcesGathered)
    eventHandler?.({
      city_id: 'city-1',
      player_id: other_player_id 
    })

    expect(mockWs.send).not.toHaveBeenCalled()
  })
})
