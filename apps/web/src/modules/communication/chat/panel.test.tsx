import { render, screen, fireEvent, act } from '@testing-library/react'
import { AppEvent, ChatChannel, FactionCode, type CommunicationChatMessage } from '@eoneom/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const mutatePost = vi.fn()
const mutateBlock = vi.fn()
const mutateReport = vi.fn()
const fetchNextPage = vi.fn()
const wsHandlers = new Map<string, (payload: unknown) => void>()
let allianceMember = false
let historyPages: { messages: CommunicationChatMessage[]; has_more: boolean; viewer_player_id: string }[] = []

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('#helpers/websocket', () => ({
  wsClient: {
    on: (type: string, handler: (payload: unknown) => void) => {
      wsHandlers.set(type, handler)
      return () => wsHandlers.delete(type)
    },
  },
}))
vi.mock('#communication/chat/hooks', () => ({
  useChatHistory: (_channel: ChatChannel, enabled: boolean) => ({
    data: enabled ? { pages: historyPages } : undefined,
    isPending: false,
    hasNextPage: enabled && historyPages[historyPages.length - 1]?.has_more,
    isFetchingNextPage: false,
    fetchNextPage,
  }),
  usePostChatMessage: () => ({ mutate: mutatePost, isPending: false }),
}))
vi.mock('#alliance/hooks', () => ({ useMyAlliance: () => ({ data: { alliance: allianceMember ? { id: 'a1' } : null } }) }))
vi.mock('#communication/block/hooks', () => ({ useBlockPlayer: () => ({ mutate: mutateBlock }) }))
vi.mock('#communication/abuse-report/hooks', () => ({
  useReportAbuse: () => ({ mutate: mutateReport }),
  promptAbuseReason: () => 'spam',
}))

import { ChatPanel } from './panel'

const message = (id: string, author_id: string, name: string, body: string): CommunicationChatMessage => ({
  id,
  author: { id: author_id, name, faction_code: FactionCode.THE_CONFEDERATION, alliance_tag: null },
  body,
  created_at: new Date('2026-11-27T10:05:00').getTime(),
})

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', undefined)
    historyPages = [ {
      messages: [ message('m2', 'me', 'Moi', 'réponse'), message('m1', 'bob', 'Bob', 'bonjour') ],
      has_more: true,
      viewer_player_id: 'me',
    } ]
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    wsHandlers.clear()
  })

  it('starts collapsed without localStorage and opens on the global tab', () => {
    render(<ChatPanel />)

    expect(screen.queryByText('bonjour')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }))

    expect(screen.getByRole('tab', { name: /Global/ })).toHaveAttribute('aria-selected', 'true')
    const bodies = screen.getAllByText(/bonjour|réponse/).map(node => node.textContent)
    expect(bodies).toEqual([ 'bonjour', 'réponse' ])
    expect(screen.getAllByText('10:05', { selector: 'time' })).toHaveLength(2)
  })

  it('loads older messages with « charger plus »', () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }))

    fireEvent.click(screen.getByRole('button', { name: 'charger plus' }))

    expect(fetchNextPage).toHaveBeenCalled()
  })

  it('counts characters and posts the trimmed message', () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }))

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: ' salut ' } })
    expect(screen.getByText('7/500')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(mutatePost).toHaveBeenCalledWith('salut')
  })

  it('offers Écrire / Bloquer / Signaler on other authors only', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }))

    expect(screen.queryByRole('button', { name: 'Moi' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Bob' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Écrire' }))
    expect(navigate).toHaveBeenCalledWith({ to: '/inbox/mail', search: { view: 'compose', to: 'Bob' } })

    fireEvent.click(screen.getByRole('button', { name: 'Bob' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Bloquer' }))
    expect(mutateBlock).toHaveBeenCalledWith('Bob')

    fireEvent.click(screen.getByRole('button', { name: 'Bob' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Signaler' }))
    expect(mutateReport).toHaveBeenCalledWith({ kind: 'chat', message_id: 'm1', reason: 'spam' })
  })

  it('shows an activity dot for messages on a collapsed panel or an inactive tab', () => {
    render(<ChatPanel />)

    act(() => {
      wsHandlers.get(AppEvent.ChatMessage)?.({ channel: ChatChannel.FACTION, message: message('m3', 'bob', 'Bob', 'yo') })
    })
    expect(screen.getByRole('status', { name: 'Nouveaux messages' })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Nouveaux messages Faction' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }))
    expect(screen.getByRole('status', { name: 'Nouveaux messages Faction' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Faction/ }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the Alliance tab and [TAG] names only for alliance members (slice 033)', () => {
    historyPages = [ {
      messages: [ { ...message('m1', 'bob', 'Bob', 'bonjour'), author: { id: 'bob', name: 'Bob', faction_code: FactionCode.THE_CONFEDERATION, alliance_tag: 'ABC' } } ],
      has_more: false,
      viewer_player_id: 'me',
    } ]
    const { unmount } = render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }))
    expect(screen.queryByRole('tab', { name: /Alliance/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '[ABC] Bob' })).toBeInTheDocument()
    unmount()

    allianceMember = true
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }))
    expect(screen.getByRole('tab', { name: /Alliance/ })).toBeInTheDocument()
    allianceMember = false
  })

  it('opens to 288 px with a log of messages controlled by the toggle (slice 041)', () => {
    const { container } = render(<ChatPanel />)
    const section = container.querySelector('section[aria-label="Discussion"]')
    const toggle = screen.getByRole('button', { name: /Discussion/ })
    expect(section).toHaveClass('h-10')
    expect(toggle).toHaveAttribute('aria-controls', 'chat-messages')

    fireEvent.click(toggle)

    expect(section).toHaveClass('h-72')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'chat-messages')
    expect(screen.getByRole('log', { name: 'Messages' })).toHaveTextContent('bonjour')
  })

  it('moves between tabs with the arrow keys, Home and End, and selects with a click (slice 041)', () => {
    allianceMember = true
    render(<ChatPanel />)

    expect(screen.getByRole('tablist', { name: 'Canaux' })).toBeInTheDocument()
    const [ global, faction, alliance ] = screen.getAllByRole('tab')
    expect(global).toHaveAttribute('aria-selected', 'true')
    expect(global).toHaveAttribute('tabindex', '0')
    expect(faction).toHaveAttribute('tabindex', '-1')
    expect(global).toHaveAttribute('aria-controls', 'chat-messages')

    global.focus()
    fireEvent.keyDown(global, { key: 'ArrowRight' })
    expect(faction).toHaveFocus()
    fireEvent.keyDown(faction, { key: 'End' })
    expect(alliance).toHaveFocus()
    fireEvent.keyDown(alliance, { key: 'ArrowRight' })
    expect(global).toHaveFocus()
    fireEvent.keyDown(global, { key: 'ArrowLeft' })
    expect(alliance).toHaveFocus()
    fireEvent.keyDown(alliance, { key: 'Home' })
    expect(global).toHaveFocus()
    // Arrows only move the focus (manual activation).
    expect(global).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(faction)
    expect(faction).toHaveAttribute('aria-selected', 'true')
    expect(faction).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', faction.id)
    allianceMember = false
  })
})
