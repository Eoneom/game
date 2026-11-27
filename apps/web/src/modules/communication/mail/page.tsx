import React, { useState } from 'react'
import type { CommunicationMailBox } from '@eoneom/api-client'

import { LayoutPage } from '#ui/layout/page'
import { InboxTabs } from '#communication/inbox-tabs'
import { MailList } from '#communication/mail/list'
import { MailDetails } from '#communication/mail/details'
import { MailCompose } from '#communication/mail/compose'
import { BlockedPlayers } from '#communication/block/list'
import { useGetMail, useListMail } from '#communication/mail/hooks'
import { replyRecipientName, replySubject } from '#communication/mail/reply'

export type MailView = 'compose' | 'blocked'

export interface MailPageSearch {
  box?: CommunicationMailBox
  mail_id?: string
  view?: MailView
  /** Prefilled recipient name for `compose`. */
  to?: string
  /** Letter being answered for `compose`. */
  reply_to?: string
}

export const MailPage: React.FC<{
  search: MailPageSearch
  onNavigate: (search: MailPageSearch) => void
}> = ({ search, onNavigate }) => {
  const box = search.box ?? 'inbox'
  const [ currentPage, setCurrentPage ] = useState(1)

  const { data: listData } = useListMail(box, currentPage)
  const { data: mail } = useGetMail(search.view ? null : search.mail_id)
  const { data: repliedMail } = useGetMail(search.view === 'compose' ? search.reply_to : null)

  let details: React.ReactNode = null
  if (search.view === 'compose') {
    const replyReady = !search.reply_to || repliedMail
    details = replyReady ? (
      <MailCompose
        key={`${search.to ?? ''}:${search.reply_to ?? ''}`}
        initialRecipient={repliedMail ? replyRecipientName(repliedMail, box) : search.to}
        initialSubject={repliedMail ? replySubject(repliedMail.subject) : ''}
        inReplyTo={repliedMail?.id}
        onSent={() => onNavigate({ box: 'sent' })}
        onCancel={() => onNavigate({ box })}
      />
    ) : null
  } else if (search.view === 'blocked') {
    details = <BlockedPlayers onClose={() => onNavigate({ box })} />
  } else if (mail) {
    details = (
      <MailDetails
        mail={mail}
        box={box}
        onReply={() => onNavigate({ box, view: 'compose', reply_to: mail.id })}
        onDeleted={() => onNavigate({ box })}
      />
    )
  }

  return (
    <LayoutPage details={details}>
      <InboxTabs active="mail" />
      <MailList
        box={box}
        mails={listData?.mails ?? []}
        currentPage={currentPage}
        total={listData?.total ?? 0}
        pageSize={listData?.page_size ?? 0}
        selectedMailId={search.view ? null : search.mail_id ?? null}
        onBoxChange={(next) => {
          setCurrentPage(1)
          onNavigate({ box: next })
        }}
        onPageChange={setCurrentPage}
        onMailSelect={(mailId) => onNavigate({ box, mail_id: mailId })}
        onCompose={() => onNavigate({ box, view: 'compose' })}
        onShowBlocked={() => onNavigate({ box, view: 'blocked' })}
      />
    </LayoutPage>
  )
}
