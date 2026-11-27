import { MailEntity } from '#core/communication/mail/entity'

const build = (overrides: Partial<Parameters<typeof MailEntity.create>[0]> = {}): MailEntity => MailEntity.create({
  id: 'mail-1',
  sender_id: 'sender',
  recipient_id: 'recipient',
  subject: 'subject',
  body: 'body',
  in_reply_to: null,
  delivered: true,
  sent_at: 1,
  read_at: null,
  deleted_by_sender: false,
  deleted_by_recipient: false,
  ...overrides
})

describe('MailEntity', () => {
  it('is visible to both sides once delivered', () => {
    const mail = build()
    expect(mail.isVisibleTo('sender')).toBe(true)
    expect(mail.isVisibleTo('recipient')).toBe(true)
    expect(mail.isVisibleTo('someone')).toBe(false)
  })

  it('hides an undelivered letter from the recipient only', () => {
    const mail = build({ delivered: false })
    expect(mail.isVisibleToSender('sender')).toBe(true)
    expect(mail.isVisibleToRecipient('recipient')).toBe(false)
  })

  it('soft deletes for one side only', () => {
    const deleted_by_recipient = build().deleteFor('recipient')
    expect(deleted_by_recipient.deleted_by_recipient).toBe(true)
    expect(deleted_by_recipient.deleted_by_sender).toBe(false)
    expect(deleted_by_recipient.isVisibleTo('recipient')).toBe(false)
    expect(deleted_by_recipient.isVisibleTo('sender')).toBe(true)

    const deleted_by_both = deleted_by_recipient.deleteFor('sender')
    expect(deleted_by_both.deleted_by_sender).toBe(true)
    expect(deleted_by_both.deleted_by_recipient).toBe(true)
  })

  it('keeps the first read date and clears it when marked unread', () => {
    const read = build().markAs({
      read: true,
      at: 10
    })
    expect(read.read_at).toBe(10)
    expect(read.markAs({
      read: true,
      at: 20
    }).read_at).toBe(10)
    expect(read.markAs({
      read: false,
      at: 20
    }).read_at).toBeNull()
  })
})
