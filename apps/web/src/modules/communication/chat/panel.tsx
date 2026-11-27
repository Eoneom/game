import React, { useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import { useNavigate } from '@tanstack/react-router'
import {
  AbuseReportKind,
  AppEvent,
  CHAT_BODY_MAX_LENGTH,
  ChatChannel,
  type ChatMessageEventPayload,
  type CommunicationChatMessage,
} from '@eoneom/api-client'

import { wsClient } from '#helpers/websocket'
import { factionColor } from '#faction/color'
import { useChatHistory, usePostChatMessage } from '#communication/chat/hooks'
import { readChatPanelState, writeChatPanelState, type ChatPanelState } from '#communication/chat/storage'
import { useBlockPlayer } from '#communication/block/hooks'
import { promptAbuseReason, useReportAbuse } from '#communication/abuse-report/hooks'
import { useMyAlliance } from '#alliance/hooks'
import { allianceDisplayName } from '#alliance/translations'

const BASE_TABS: { channel: ChatChannel; label: string }[] = [
  { channel: ChatChannel.GLOBAL, label: 'Global' },
  { channel: ChatChannel.FACTION, label: 'Faction' },
]

/** The Alliance tab only shows for alliance members (slice 033). */
const ALLIANCE_TAB = { channel: ChatChannel.ALLIANCE, label: 'Alliance' }

const PLACEHOLDERS: Record<ChatChannel, string> = {
  [ChatChannel.GLOBAL]: 'Message à tous…',
  [ChatChannel.FACTION]: 'Message à votre faction…',
  [ChatChannel.ALLIANCE]: 'Message à votre alliance…',
}

const formatChatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const ActivityDot: React.FC<{ label: string }> = ({ label }) => (
  <span
    role="status"
    aria-label={label}
    className="inline-block h-2 w-2 rounded-full bg-amber shadow-[0_0_6px_rgba(241,196,15,0.8)]"
  />
)

const ChatMessageRow: React.FC<{
  message: CommunicationChatMessage
  isOwn: boolean
  menuOpen: boolean
  onToggleMenu: () => void
  onWrite: () => void
  onBlock: () => void
  onReport: () => void
}> = ({ message, isOwn, menuOpen, onToggleMenu, onWrite, onBlock, onReport }) => (
  <li className="relative flex gap-2 text-meta leading-snug">
    <time className="shrink-0 font-mono text-caption text-label" dateTime={new Date(message.created_at).toISOString()}>
      {formatChatTime(message.created_at)}
    </time>
    <div className="min-w-0">
      {isOwn ? (
        <span className="font-semibold" style={{ color: factionColor(message.author.faction_code) }}>
          {allianceDisplayName(message.author.name, message.author.alliance_tag)}
        </span>
      ) : (
        <button
          type="button"
          className="font-semibold hover:underline"
          style={{ color: factionColor(message.author.faction_code) }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          {allianceDisplayName(message.author.name, message.author.alliance_tag)}
        </button>
      )}
      <span className="text-amber-dim"> : </span>
      <span className="whitespace-pre-wrap break-words text-amber">{message.body}</span>
      {menuOpen && (
        <ul
          role="menu"
          className="absolute left-12 z-30 m-0 mt-1 list-none rounded-sm border border-rust/60 bg-chrome p-1 text-meta shadow-lg"
        >
          <li>
            <button type="button" role="menuitem" className="block w-full px-2 py-1 text-left text-amber hover:bg-rust/30" onClick={onWrite}>
              Écrire
            </button>
          </li>
          <li>
            <button type="button" role="menuitem" className="block w-full px-2 py-1 text-left text-amber hover:bg-rust/30" onClick={onBlock}>
              Bloquer
            </button>
          </li>
          <li>
            <button type="button" role="menuitem" className="block w-full px-2 py-1 text-left text-amber hover:bg-rust/30" onClick={onReport}>
              Signaler
            </button>
          </li>
        </ul>
      )}
    </div>
  </li>
)

/** Collapsible chat panel at the bottom of every authenticated page (slice 032). */
export const ChatPanel: React.FC = () => {
  const navigate = useNavigate()
  const [ storedPanel, setPanel ] = useState<ChatPanelState>(readChatPanelState)
  const [ unseen, setUnseen ] = useState<Record<ChatChannel, boolean>>({
    [ChatChannel.GLOBAL]: false,
    [ChatChannel.FACTION]: false,
    [ChatChannel.ALLIANCE]: false,
  })
  const { data: myAlliance } = useMyAlliance()
  const isAllianceMember = Boolean(myAlliance?.alliance)
  const tabs = isAllianceMember ? [ ...BASE_TABS, ALLIANCE_TAB ] : BASE_TABS
  // Leaving the alliance removes the tab: fall back to the global channel.
  const panel: ChatPanelState = storedPanel.tab === ChatChannel.ALLIANCE && !isAllianceMember
    ? { ...storedPanel, tab: ChatChannel.GLOBAL }
    : storedPanel
  const [ draft, setDraft ] = useState('')
  const [ menuMessageId, setMenuMessageId ] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const history = useChatHistory(panel.tab, panel.open)
  const postMessage = usePostChatMessage(panel.tab, { onSuccess: () => setDraft('') })
  const blockPlayer = useBlockPlayer()
  const reportAbuse = useReportAbuse()

  const viewerId = history.data?.pages[0]?.viewer_player_id ?? null
  const viewerIdRef = useRef<string | null>(null)
  viewerIdRef.current = viewerId
  const panelRef = useRef(panel)
  panelRef.current = panel

  const updatePanel = (next: ChatPanelState) => {
    setPanel(next)
    writeChatPanelState(next)
    if (next.open) {
      setUnseen(current => ({ ...current, [next.tab]: false }))
    }
    setMenuMessageId(null)
  }

  useEffect(() => {
    return wsClient.on<ChatMessageEventPayload>(AppEvent.ChatMessage, ({ channel, message }) => {
      if (message.author.id === viewerIdRef.current) return
      const { open, tab } = panelRef.current
      if (open && tab === channel) return
      setUnseen(current => ({ ...current, [channel]: true }))
    })
  }, [])

  // Pages are newest first; the panel reads top to bottom, oldest first.
  const messages = useMemo(
    () => (history.data?.pages ?? []).flatMap(page => page.messages).slice().reverse(),
    [ history.data ]
  )
  const newestId = messages[messages.length - 1]?.id

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [ newestId, panel.open, panel.tab ])

  const send = () => {
    const body = draft.trim()
    if (!body || postMessage.isPending) return
    postMessage.mutate(body)
  }

  const hasActivity = unseen[ChatChannel.GLOBAL] || unseen[ChatChannel.FACTION] || (isAllianceMember && unseen[ChatChannel.ALLIANCE])

  return (
    <section
      aria-label="Discussion"
      className={classNames(
        'chat-panel surface-frame relative z-20 flex shrink-0 flex-col border-t border-rust/70',
        panel.open ? 'h-64' : 'h-auto'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-1">
        <button
          type="button"
          className="flex items-center gap-2 text-caption uppercase tracking-wider text-label hover:text-amber"
          aria-expanded={panel.open}
          onClick={() => updatePanel({ ...panel, open: !panel.open })}
        >
          <span aria-hidden>{panel.open ? '▾' : '▸'}</span>
          Discussion
          {!panel.open && hasActivity && <ActivityDot label="Nouveaux messages" />}
        </button>
        <div role="tablist" className="ml-2 flex gap-1">
          {tabs.map(({ channel, label }) => (
            <button
              key={channel}
              type="button"
              role="tab"
              aria-selected={panel.tab === channel}
              className={classNames(
                'flex items-center gap-1 rounded-sm border px-2 py-0.5 text-caption uppercase tracking-wider transition',
                panel.tab === channel
                  ? 'border-amber/50 bg-chrome text-amber'
                  : 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber'
              )}
              onClick={() => updatePanel({ open: true, tab: channel })}
            >
              {label}
              {unseen[channel] && (!panel.open || panel.tab !== channel) && (
                <ActivityDot label={`Nouveaux messages ${label}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {panel.open && (
        <>
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
            {history.hasNextPage && (
              <button
                type="button"
                className="mb-1 text-meta text-amber-dim underline hover:text-amber disabled:opacity-40"
                disabled={history.isFetchingNextPage}
                onClick={() => history.fetchNextPage()}
              >
                charger plus
              </button>
            )}
            {messages.length === 0 && !history.isPending && (
              <p className="m-0 text-meta text-label">Aucun message pour le moment.</p>
            )}
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {messages.map(message => (
                <ChatMessageRow
                  key={message.id}
                  message={message}
                  isOwn={message.author.id === viewerId}
                  menuOpen={menuMessageId === message.id}
                  onToggleMenu={() => setMenuMessageId(current => current === message.id ? null : message.id)}
                  onWrite={() => {
                    setMenuMessageId(null)
                    navigate({ to: '/inbox/mail', search: { view: 'compose', to: message.author.name } })
                  }}
                  onBlock={() => {
                    setMenuMessageId(null)
                    if (window.confirm(`Bloquer ${message.author.name} ? Vous ne verrez plus ses messages.`)) {
                      blockPlayer.mutate(message.author.name)
                    }
                  }}
                  onReport={() => {
                    setMenuMessageId(null)
                    const reason = promptAbuseReason()
                    if (reason === null) return
                    reportAbuse.mutate({
                      kind: AbuseReportKind.CHAT,
                      message_id: message.id,
                      ...(reason ? { reason } : {}),
                    })
                  }}
                />
              ))}
            </ul>
          </div>
          <form
            className="flex items-center gap-2 border-t border-rust/40 px-3 py-1.5"
            onSubmit={event => {
              event.preventDefault()
              send()
            }}
          >
            <input
              aria-label="Message"
              className="min-w-0 flex-1 rounded-sm border border-edge bg-transparent px-2 py-1 text-body text-amber placeholder:text-muted focus:border-amber"
              placeholder={PLACEHOLDERS[panel.tab]}
              maxLength={CHAT_BODY_MAX_LENGTH}
              value={draft}
              onChange={event => setDraft(event.target.value)}
            />
            <span className="font-mono text-caption text-label" aria-label="Caractères">
              {draft.length}/{CHAT_BODY_MAX_LENGTH}
            </span>
            <button
              type="submit"
              className="rounded-sm border border-copper bg-copper/30 px-2 py-1 text-caption uppercase tracking-wide text-amber hover:bg-copper/50 disabled:opacity-40"
              disabled={!draft.trim() || postMessage.isPending}
            >
              Envoyer
            </button>
          </form>
        </>
      )}
    </section>
  )
}
