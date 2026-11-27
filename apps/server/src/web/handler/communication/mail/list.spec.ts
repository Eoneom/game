import type { MockInstance } from 'vitest'
import {
  NextFunction, Request, Response
} from 'express'
import { communicationListMailHandler } from './list'
import { CommunicationListMailQuery } from '#query/communication/mail/list'
import { MailEntity } from '#core/communication/mail/entity'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'

describe('communicationListMailHandler', () => {
  const sender = PlayerEntity.initPlayer({
    name: 'Alice',
    faction_code: FactionCode.THE_CONFEDERATION
  })
  const recipient = PlayerEntity.initPlayer({
    name: 'Bob',
    faction_code: FactionCode.THE_ASH_LITURGY
  })
  const mail = MailEntity.create({
    id: 'mail-1',
    sender_id: sender.id,
    recipient_id: recipient.id,
    subject: 'Salut',
    body: 'b',
    in_reply_to: null,
    delivered: false,
    sent_at: 10,
    read_at: null,
    deleted_by_sender: false,
    deleted_by_recipient: false
  })

  let run: MockInstance
  let res: { json: MockInstance, status: MockInstance, locals: Record<string, unknown> }
  let next: MockInstance

  beforeEach(() => {
    run = vi.spyOn(CommunicationListMailQuery.prototype, 'run').mockResolvedValue({
      mails: [ mail ],
      players: new Map([
        [
          sender.id,
          sender
        ],
        [
          recipient.id,
          recipient
        ]
      ]),
      total: 1
    })
    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      locals: { player_id: sender.id }
    }
    next = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists the sent box without read state or delivery', async () => {
    await communicationListMailHandler({
      query: {
        box: 'sent',
        page: '2'
      } 
    } as unknown as Request, res as unknown as Response, next as unknown as NextFunction)

    expect(run).toHaveBeenCalledWith({
      player_id: sender.id,
      box: 'sent',
      page: 2
    })
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      data: {
        mails: [
          {
            id: 'mail-1',
            subject: 'Salut',
            sender: {
              id: sender.id,
              name: 'Alice',
              faction_code: FactionCode.THE_CONFEDERATION
            },
            recipient: {
              id: recipient.id,
              name: 'Bob',
              faction_code: FactionCode.THE_ASH_LITURGY
            },
            sent_at: 10,
            was_read: true,
            in_reply_to: null
          } 
        ],
        total: 1,
        page_size: 10
      }
    })
  })

  it('defaults to the inbox', async () => {
    res.locals.player_id = recipient.id
    await communicationListMailHandler({ query: {} } as unknown as Request, res as unknown as Response, next as unknown as NextFunction)

    expect(run).toHaveBeenCalledWith({
      player_id: recipient.id,
      box: 'inbox',
      page: 1
    })
    expect(res.json.mock.calls[0][0].data.mails[0].was_read).toBe(false)
  })
})
