import { FactionCode } from '@eoneom/api-client'
import { describe, expect, it } from 'vitest'

import { replyRecipientName, replySubject } from './reply'

describe('replySubject', () => {
  it('prefixes the subject once', () => {
    expect(replySubject('Paix')).toBe('Re: Paix')
    expect(replySubject('Re: Paix')).toBe('Re: Paix')
  })

  it('keeps the subject within 120 characters', () => {
    expect(replySubject('x'.repeat(120))).toHaveLength(120)
  })
})

describe('replyRecipientName', () => {
  const mail = {
    id: 'm1',
    subject: 's',
    body: 'b',
    sender: { id: 'a', name: 'Alice', faction_code: FactionCode.THE_CONFEDERATION },
    recipient: { id: 'b', name: 'Bob', faction_code: FactionCode.THE_ASH_LITURGY },
    sent_at: 1,
    was_read: true,
    in_reply_to: null,
  }

  it('answers the sender from the inbox and the recipient from the sent box', () => {
    expect(replyRecipientName(mail, 'inbox')).toBe('Alice')
    expect(replyRecipientName(mail, 'sent')).toBe('Bob')
  })
})
