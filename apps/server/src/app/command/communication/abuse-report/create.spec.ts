import type { MockInstance } from 'vitest'
import { createCommunicationAbuseReport } from './create'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { AbuseReportEntity } from '#core/communication/abuse-report/entity'
import { AbuseReportKind } from '#core/communication/abuse-report/kind'
import { ChatMessageEntity } from '#core/communication/chat/entity'
import { CommunicationError } from '#core/communication/error'
import { MailEntity } from '#core/communication/mail/entity'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'

describe('createCommunicationAbuseReport', () => {
  const reporter = PlayerEntity.initPlayer({
    name: 'Alice',
    faction_code: FactionCode.THE_CONFEDERATION
  })
  const mail = MailEntity.create({
    id: 'mail-1',
    sender_id: 'author',
    recipient_id: reporter.id,
    subject: 'Insulte',
    body: 'Texte',
    in_reply_to: null,
    delivered: true,
    sent_at: 1,
    read_at: null,
    deleted_by_sender: false,
    deleted_by_recipient: true
  })
  const chat_messages: Record<string, ChatMessageEntity> = {
    global: ChatMessageEntity.create({
      id: 'chat-global',
      channel: 'global',
      author_id: 'author',
      body: 'spam',
      created_at: 1
    }),
    other_faction: ChatMessageEntity.create({
      id: 'chat-other',
      channel: `faction:${FactionCode.THE_ASH_LITURGY}`,
      author_id: 'author',
      body: 'secret',
      created_at: 1
    }),
  }

  let createIfAbsent: MockInstance

  beforeEach(() => {
    createIfAbsent = vi.fn().mockResolvedValue(true)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: { get: vi.fn().mockResolvedValue(reporter) },
      mail: { getById: vi.fn().mockResolvedValue(mail) },
      chat_message: { getById: vi.fn(async (message_id: string) => Object.values(chat_messages).find(message => message.id === message_id)) },
      abuse_report: { createIfAbsent },
      alliance: { findMembership: vi.fn().mockResolvedValue(null) },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores a snapshot of a letter the reporter received, even once deleted', async () => {
    await createCommunicationAbuseReport({
      reporter_id: reporter.id,
      kind: AbuseReportKind.MAIL,
      message_id: mail.id,
      reason: '  insultes '
    })

    const report = createIfAbsent.mock.calls[0][0] as AbuseReportEntity
    expect(report).toMatchObject({
      reporter_id: reporter.id,
      author_id: 'author',
      kind: AbuseReportKind.MAIL,
      message_id: mail.id,
      content: 'Insulte\n\nTexte',
      reason: 'insultes'
    })
  })

  it('stores a snapshot of a visible chat message', async () => {
    await createCommunicationAbuseReport({
      reporter_id: reporter.id,
      kind: AbuseReportKind.CHAT,
      message_id: 'chat-global'
    })

    expect(createIfAbsent.mock.calls[0][0]).toMatchObject({
      author_id: 'author',
      content: 'spam',
      reason: null
    })
  })

  it('rejects a letter the reporter only sent', async () => {
    await expect(createCommunicationAbuseReport({
      reporter_id: 'author',
      kind: AbuseReportKind.MAIL,
      message_id: mail.id
    })).rejects.toThrow(CommunicationError.MAIL_NOT_OWNER)
    expect(createIfAbsent).not.toHaveBeenCalled()
  })

  it('rejects a chat message from another faction channel', async () => {
    await expect(createCommunicationAbuseReport({
      reporter_id: reporter.id,
      kind: AbuseReportKind.CHAT,
      message_id: 'chat-other'
    })).rejects.toThrow(CommunicationError.CHANNEL_FORBIDDEN)
    expect(createIfAbsent).not.toHaveBeenCalled()
  })

  it('rejects a reason over 500 characters', async () => {
    await expect(createCommunicationAbuseReport({
      reporter_id: reporter.id,
      kind: AbuseReportKind.CHAT,
      message_id: 'chat-global',
      reason: 'x'.repeat(501)
    })).rejects.toThrow(CommunicationError.REASON_INVALID)
  })

  it('succeeds without error when the reporter already reported the message', async () => {
    createIfAbsent.mockResolvedValue(false)

    await expect(createCommunicationAbuseReport({
      reporter_id: reporter.id,
      kind: AbuseReportKind.CHAT,
      message_id: 'chat-global'
    })).resolves.toBeUndefined()
  })
})
