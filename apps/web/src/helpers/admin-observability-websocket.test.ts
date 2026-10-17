import { adminObservabilityWsClient } from './admin-observability-websocket'
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

  adminObservabilityWsClient.disconnect()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AdminObservabilityWsClient', () => {
  it('opens the admin observability WebSocket path', () => {
    adminObservabilityWsClient.connect('my-token')

    expect(global.WebSocket).toHaveBeenCalledWith(
      'ws://localhost:3000/admin/observability/ws?token=my-token'
    )
  })
})
