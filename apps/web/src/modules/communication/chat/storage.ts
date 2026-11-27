import { ChatChannel } from '@eoneom/api-client'

const STORAGE_KEY = 'chat-panel'

export interface ChatPanelState {
  open: boolean
  tab: ChatChannel
}

const DEFAULT_STATE: ChatPanelState = {
  open: false,
  tab: ChatChannel.GLOBAL,
}

/** `localStorage` may be missing (tests, private mode) or throw: the panel then falls back to defaults. */
const getStorage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

export const readChatPanelState = (): ChatPanelState => {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<ChatPanelState>
    return {
      open: parsed.open === true,
      tab: parsed.tab === ChatChannel.FACTION || parsed.tab === ChatChannel.ALLIANCE ? parsed.tab : ChatChannel.GLOBAL,
    }
  } catch {
    return DEFAULT_STATE
  }
}

export const writeChatPanelState = (state: ChatPanelState): void => {
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable: the state just won't survive a reload.
  }
}
