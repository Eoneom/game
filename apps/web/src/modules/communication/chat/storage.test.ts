import { ChatChannel } from '@eoneom/api-client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { readChatPanelState, writeChatPanelState } from './storage'

const memoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('chat panel storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to a closed global panel without localStorage', () => {
    vi.stubGlobal('localStorage', undefined)

    expect(readChatPanelState()).toEqual({ open: false, tab: ChatChannel.GLOBAL })
    expect(() => writeChatPanelState({ open: true, tab: ChatChannel.FACTION })).not.toThrow()
  })

  it('keeps the open state and active tab', () => {
    vi.stubGlobal('localStorage', memoryStorage())

    writeChatPanelState({ open: true, tab: ChatChannel.FACTION })

    expect(readChatPanelState()).toEqual({ open: true, tab: ChatChannel.FACTION })
  })

  it('ignores a corrupted value', () => {
    const storage = memoryStorage()
    storage.setItem('chat-panel', '{oops')
    vi.stubGlobal('localStorage', storage)

    expect(readChatPanelState()).toEqual({ open: false, tab: ChatChannel.GLOBAL })
  })
})
