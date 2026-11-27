import React from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { MailPage, type MailPageSearch } from '#communication/mail/page'

const InboxMailRoute: React.FC = () => {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return <MailPage search={search} onNavigate={(next) => navigate({ search: next })} />
}

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

export const Route = createFileRoute('/inbox/mail')({
  validateSearch: (search: Record<string, unknown>): MailPageSearch => ({
    box: search.box === 'sent' ? 'sent' : search.box === 'inbox' ? 'inbox' : undefined,
    mail_id: optionalString(search.mail_id),
    view: search.view === 'compose' || search.view === 'blocked' ? search.view : undefined,
    to: optionalString(search.to),
    reply_to: optionalString(search.reply_to),
  }),
  component: InboxMailRoute,
})
