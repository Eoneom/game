import type { MockInstance } from 'vitest'
import { markCommunicationMail } from './mark'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CommunicationError } from '#core/communication/error'
import { MailEntity } from '#core/communication/mail/entity'

describe('markCommunicationMail', () => {
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
      }
    } as unknown as Repository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('marks read then unread for the recipient', async () => {
    await markCommunicationMail({
      mail_id: mail.id,
      player_id: 'recipient',
      was_read: true
    })
    expect(updateOne.mock.calls[0][0].read_at).not.toBeNull()

    mail = updateOne.mock.calls[0][0]
    await markCommunicationMail({
      mail_id: mail.id,
      player_id: 'recipient',
      was_read: false
    })
    expect(updateOne.mock.calls[1][0].read_at).toBeNull()
  })

  it('rejects the sender', async () => {
    await expect(markCommunicationMail({
      mail_id: mail.id,
      player_id: 'sender',
      was_read: true
    })).rejects.toThrow(CommunicationError.MAIL_NOT_OWNER)
    expect(updateOne).not.toHaveBeenCalled()
  })
})
