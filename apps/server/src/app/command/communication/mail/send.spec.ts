import type { MockInstance } from 'vitest'
import { sendCommunicationMail } from './send'
import { Factory } from '#adapter/factory'
import { RateLimiterInMemory } from '#adapter/rate-limiter'
import { AppEventBus } from '#app/event-bus'
import { Repository } from '#app/port/repository/generic'
import { CommunicationError } from '#core/communication/error'
import { MailEntity } from '#core/communication/mail/entity'
import { AppEvent } from '#core/events'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'
import { PlayerError } from '#core/player/error'

describe('sendCommunicationMail', () => {
  const sender = PlayerEntity.initPlayer({
    name: 'Alice',
    faction_code: FactionCode.THE_CONFEDERATION
  })
  const recipient = PlayerEntity.initPlayer({
    name: 'Bob',
    faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY
  })
  const system = PlayerEntity.initPlayer({
    name: 'Horde',
    faction_code: FactionCode.THE_ASH_LITURGY,
    system_controlled: true
  })
  const players = [
    sender,
    recipient,
    system
  ]

  let clock: number
  let mailCreate: MockInstance
  let mailGetById: MockInstance
  let isBlocked: MockInstance
  let emit: MockInstance

  const send = (overrides: Partial<Parameters<typeof sendCommunicationMail>[0]> = {}) => sendCommunicationMail({
    sender_id: sender.id,
    recipient_name: 'Bob',
    subject: '  Bonjour  ',
    body: 'Un message',
    ...overrides
  })

  beforeEach(() => {
    clock = 1_000_000
    mailCreate = vi.fn().mockResolvedValue('id')
    mailGetById = vi.fn()
    isBlocked = vi.fn().mockResolvedValue(false)
    emit = vi.fn()

    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      player: {
        getByName: vi.fn(async (name: string) => {
          const player = players.find(candidate => candidate.name === name)
          if (!player) throw new Error(PlayerError.NOT_FOUND)
          return player
        })
      },
      mail: {
        create: mailCreate,
        getById: mailGetById
      },
      player_block: { isBlocked },
    } as unknown as Repository)
    vi.spyOn(Factory, 'getEventBus').mockReturnValue({ emit } as unknown as AppEventBus)
    vi.spyOn(Factory, 'getRateLimiter').mockReturnValue(new RateLimiterInMemory({ clock: () => clock }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores a delivered letter and notifies the recipient', async () => {
    const { mail_id } = await send()

    expect(mailCreate).toHaveBeenCalledTimes(1)
    const mail = mailCreate.mock.calls[0][0] as MailEntity
    expect(mail).toMatchObject({
      id: mail_id,
      sender_id: sender.id,
      recipient_id: recipient.id,
      subject: 'Bonjour',
      body: 'Un message',
      in_reply_to: null,
      delivered: true,
      read_at: null,
      deleted_by_sender: false,
      deleted_by_recipient: false,
    })
    expect(emit).toHaveBeenCalledWith(AppEvent.MailReceived, {
      player_id: recipient.id,
      mail_id
    })
  })

  it.each([
    [
      { subject: ' ' },
      CommunicationError.SUBJECT_INVALID
    ],
    [
      { subject: 'x'.repeat(121) },
      CommunicationError.SUBJECT_INVALID
    ],
    [
      { body: '' },
      CommunicationError.BODY_INVALID
    ],
    [
      { body: 'x'.repeat(5001) },
      CommunicationError.BODY_INVALID
    ],
    [
      { recipient_name: 'Nobody' },
      CommunicationError.RECIPIENT_NOT_FOUND
    ],
    [
      { recipient_name: '' },
      CommunicationError.RECIPIENT_NOT_FOUND
    ],
    [
      { recipient_name: 'Alice' },
      CommunicationError.RECIPIENT_IS_SELF
    ],
    [
      { recipient_name: 'Horde' },
      CommunicationError.RECIPIENT_SYSTEM
    ],
  ])('rejects %o with %s', async (overrides, error) => {
    await expect(send(overrides)).rejects.toThrow(error)
    expect(mailCreate).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })

  it('keeps the letter in the sent box without delivering it when the recipient blocked the sender', async () => {
    isBlocked.mockResolvedValue(true)

    await send()

    expect(isBlocked).toHaveBeenCalledWith({
      blocker_id: recipient.id,
      blocked_id: sender.id
    })
    expect(mailCreate.mock.calls[0][0].delivered).toBe(false)
    expect(emit).not.toHaveBeenCalled()
  })

  it('links a reply to the letter it answers', async () => {
    const original = MailEntity.create({
      id: 'original',
      sender_id: recipient.id,
      recipient_id: sender.id,
      subject: 'Question',
      body: '?',
      in_reply_to: null,
      delivered: true,
      sent_at: 1,
      read_at: 2,
      deleted_by_sender: false,
      deleted_by_recipient: false
    })
    mailGetById.mockResolvedValue(original)

    await send({
      subject: 'Re: Question',
      in_reply_to: 'original'
    })

    expect(mailCreate.mock.calls[0][0].in_reply_to).toBe('original')
  })

  it('rejects a reply to a letter the sender cannot see', async () => {
    mailGetById.mockResolvedValue(MailEntity.create({
      id: 'foreign',
      sender_id: recipient.id,
      recipient_id: 'someone-else',
      subject: 's',
      body: 'b',
      in_reply_to: null,
      delivered: true,
      sent_at: 1,
      read_at: null,
      deleted_by_sender: false,
      deleted_by_recipient: false
    }))

    await expect(send({ in_reply_to: 'foreign' })).rejects.toThrow(CommunicationError.MAIL_NOT_OWNER)
  })

  it('allows one letter per 10 seconds per sender', async () => {
    await send()
    clock += 9_999
    await expect(send()).rejects.toThrow(CommunicationError.RATE_LIMITED)
    expect(mailCreate).toHaveBeenCalledTimes(1)

    clock += 1
    await send()
    expect(mailCreate).toHaveBeenCalledTimes(2)
  })

  it('does not count a rejected letter against the rate limit', async () => {
    await expect(send({ subject: '' })).rejects.toThrow(CommunicationError.SUBJECT_INVALID)
    await send()
    expect(mailCreate).toHaveBeenCalledTimes(1)
  })
})
