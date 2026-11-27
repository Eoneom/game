import { MAIL_SUBJECT_MAX_LENGTH, type CommunicationGetMailDataResponse, type CommunicationMailBox } from '@eoneom/api-client'

const REPLY_PREFIX = 'Re: '

/** "Re: <subject>" without stacking prefixes, cut to the subject limit. */
export const replySubject = (subject: string): string => {
  const base = subject.startsWith(REPLY_PREFIX) ? subject : `${REPLY_PREFIX}${subject}`
  return base.slice(0, MAIL_SUBJECT_MAX_LENGTH)
}

/** A reply goes to the other side of the letter: its sender from the inbox, its recipient from the sent box. */
export const replyRecipientName = (mail: CommunicationGetMailDataResponse, box: CommunicationMailBox): string => {
  return box === 'sent' ? mail.recipient.name : mail.sender.name
}
