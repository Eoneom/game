import { wsClient } from './websocket'
import type { Mock } from 'vitest'
import { vi } from 'vitest'

type MockWsInstance = {
  onmessage: ((event: { data: string }) => void) | null
  onerror: (() => void) | null
  onclose: (() => void) | null
  close: Mock
}

let mockWsInstance: MockWsInstance

beforeEach(() => {
  mockWsInstance = {
    onmessage: null,
    onerror: null,
    onclose: null,
    close: vi.fn(),
  }

  global.WebSocket = vi.fn().mockImplementation(function () {
    return mockWsInstance
  }) as unknown as typeof WebSocket

  wsClient.disconnect()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('WsClient', () => {
  describe('connect', () => {
    it('opens a WebSocket to the correct URL', () => {
      wsClient.connect('my-token')

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000?token=my-token')
    })

    it('closes an existing connection before opening a new one', () => {
      wsClient.connect('token-1')
      const firstInstance = mockWsInstance

      wsClient.connect('token-2')

      expect(firstInstance.close).toHaveBeenCalledTimes(1)
      expect(global.WebSocket).toHaveBeenCalledTimes(2)
    })
  })

  describe('on / message handling', () => {
    it('calls the registered handler with the parsed payload on a matching message', () => {
      const handler = vi.fn()
      wsClient.connect('token')
      wsClient.on('city:event', handler)

      mockWsInstance.onmessage?.({ data: JSON.stringify({ type: 'city:event', city_id: 'x' }) })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ city_id: 'x' })
    })

    it('does not call a handler registered for a different event type', () => {
      const handler = vi.fn()
      wsClient.connect('token')
      wsClient.on('other:event', handler)

      mockWsInstance.onmessage?.({ data: JSON.stringify({ type: 'city:event', city_id: 'x' }) })

      expect(handler).not.toHaveBeenCalled()
    })

    it('silently ignores malformed JSON messages', () => {
      wsClient.connect('token')

      expect(() => {
        mockWsInstance.onmessage?.({ data: 'not-valid-json' })
      }).not.toThrow()
    })
  })

  describe('disconnect', () => {
    it('closes the WebSocket and clears the reference', () => {
      wsClient.connect('token')

      wsClient.disconnect()

      expect(mockWsInstance.close).toHaveBeenCalledTimes(1)
    })
  })
})
