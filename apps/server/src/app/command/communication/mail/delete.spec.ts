import type { MockInstance } from 'vitest'
import { deleteCommunicationMail } from './delete'
import { Factory } from '#adapter/factory'
import { Repository } from '#app/port/repository/generic'
import { CommunicationError } from '#core/communication/error'
import { MailEntity } from '#core/communication/mail/entity'

describe('deleteCommunicationMail', () => {
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
    updateOne = vi.fn(async (updated: MailEntity) => {
      mail = updated
    })
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

  it('deletes for the caller side only', async () => {
    await deleteCommunicationMail({
      mail_id: mail.id,
      player_id: 'recipient'
    })

    expect(mail.deleted_by_recipient).toBe(true)
    expect(mail.deleted_by_sender).toBe(false)
  })

  it('then rejects the same side and still lets the other side delete', async () => {
    await deleteCommunicationMail({
      mail_id: mail.id,
      player_id: 'recipient'
    })
    await expect(deleteCommunicationMail({
      mail_id: mail.id,
      player_id: 'recipient'
    })).rejects.toThrow(CommunicationError.MAIL_NOT_OWNER)

    await deleteCommunicationMail({
      mail_id: mail.id,
      player_id: 'sender'
    })
    expect(mail.deleted_by_sender).toBe(true)
    expect(mail.deleted_by_recipient).toBe(true)
  })

  it('rejects a stranger', async () => {
    await expect(deleteCommunicationMail({
      mail_id: mail.id,
      player_id: 'stranger'
    })).rejects.toThrow(CommunicationError.MAIL_NOT_OWNER)
    expect(updateOne).not.toHaveBeenCalled()
  })
})
