import type { MockInstance } from 'vitest'
import { CommunicationGetMailQuery } from './get'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CommunicationError } from '#core/communication/error'
import { MailEntity } from '#core/communication/mail/entity'

describe('CommunicationGetMailQuery', () => {
  let mail: MailEntity
  let updateOne: MockInstance

  beforeEach(() => {
    mail = MailEntity.create({
      id: 'mail-1',
      sender_id: 'sender',
      recipient_id: 'recipient',
      subject: 's',
      body: 'b',
      in_reply_to: null,
      delivered: true,
      sent_at: 1,
      read_at: null,
      deleted_by_sender: false,
      deleted_by_recipient: false
    })
    updateOne = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(Factory, 'getRepository').mockReturnValue({
      mail: {
        getById: vi.fn(async () => mail),
        updateOne
      },
      player: { listByIds: vi.fn().mockResolvedValue([]) },
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('marks the letter read when the recipient opens it', async () => {
    const result = await new CommunicationGetMailQuery().run({
      player_id: 'recipient',
      mail_id: mail.id
    })

    expect(result.mail.read_at).not.toBeNull()
    expect(updateOne).toHaveBeenCalledTimes(1)
  })

  it('leaves read state alone when the sender opens it', async () => {
    const result = await new CommunicationGetMailQuery().run({
      player_id: 'sender',
      mail_id: mail.id
    })

    expect(result.mail.read_at).toBeNull()
    expect(updateOne).not.toHaveBeenCalled()
  })

  it.each([
    [
      'a stranger',
      () => mail,
      'stranger'
    ],
    [
      'the recipient of an undelivered letter',
      () => MailEntity.create({
        ...mail,
        delivered: false
      }),
      'recipient'
    ],
    [
      'a sender who deleted it',
      () => mail.deleteFor('sender'),
      'sender'
    ],
  ])('rejects %s', async (_label, build, player_id) => {
    mail = build()
    await expect(new CommunicationGetMailQuery().run({
      player_id,
      mail_id: mail.id
    })).rejects.toThrow(CommunicationError.MAIL_NOT_OWNER)
  })
})
