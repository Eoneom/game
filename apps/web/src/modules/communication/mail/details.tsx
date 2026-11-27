import React from 'react'
import {
  AbuseReportKind,
  type CommunicationGetMailDataResponse,
  type CommunicationMailBox,
} from '@eoneom/api-client'

import { formatDate } from '#helpers/transform'
import { Button } from '#ui/button'
import { useDeleteMail, useMarkMailUnread } from '#communication/mail/hooks'
import { promptAbuseReason, useReportAbuse } from '#communication/abuse-report/hooks'

interface Props {
  mail: CommunicationGetMailDataResponse
  box: CommunicationMailBox
  onReply: () => void
  onDeleted: () => void
}

export const MailDetails: React.FC<Props> = ({ mail, box, onReply, onDeleted }) => {
  const deleteMail = useDeleteMail({ onSuccess: onDeleted })
  const markUnread = useMarkMailUnread()
  const reportAbuse = useReportAbuse()

  return (
    <article className="space-y-3">
      <header className="space-y-1">
        <h2 className="m-0 break-words text-base text-amber">{mail.subject}</h2>
        <p className="m-0 text-xs text-amber-dim">
          De <strong>{mail.sender.name}</strong> à <strong>{mail.recipient.name}</strong> · {formatDate(mail.sent_at)}
        </p>
      </header>
      <p className="m-0 whitespace-pre-wrap break-words text-sm text-amber">{mail.body}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onReply}>Répondre</Button>
        {box === 'inbox' && (
          <Button variant="ghost" disabled={markUnread.isPending} onClick={() => markUnread.mutate(mail.id)}>
            Marquer non lu
          </Button>
        )}
        <Button
          variant="danger"
          disabled={deleteMail.isPending}
          onClick={() => {
            if (window.confirm('Supprimer cette lettre ?')) deleteMail.mutate(mail.id)
          }}
        >
          Supprimer
        </Button>
        {box === 'inbox' && (
          <Button
            variant="ghost"
            disabled={reportAbuse.isPending}
            onClick={() => {
              const reason = promptAbuseReason()
              if (reason === null) return
              reportAbuse.mutate({
                kind: AbuseReportKind.MAIL,
                message_id: mail.id,
                ...(reason ? { reason } : {}),
              })
            }}
          >
            Signaler
          </Button>
        )}
      </div>
    </article>
  )
}
