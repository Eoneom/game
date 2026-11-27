import React from 'react'
import classNames from 'classnames'
import type { CommunicationMailBox, CommunicationMailItem } from '@eoneom/api-client'

import { formatDate } from '#helpers/transform'
import { Button } from '#ui/button'

const BOXES: { box: CommunicationMailBox; label: string }[] = [
  { box: 'inbox', label: 'Reçus' },
  { box: 'sent', label: 'Envoyés' },
]

interface Props {
  box: CommunicationMailBox
  mails: CommunicationMailItem[]
  currentPage: number
  total: number
  pageSize: number
  selectedMailId: string | null
  onBoxChange: (box: CommunicationMailBox) => void
  onPageChange: (page: number) => void
  onMailSelect: (mailId: string) => void
  onCompose: () => void
  onShowBlocked: () => void
}

export const MailList: React.FC<Props> = ({
  box,
  mails,
  currentPage,
  total,
  pageSize,
  selectedMailId,
  onBoxChange,
  onPageChange,
  onMailSelect,
  onCompose,
  onShowBlocked,
}) => {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {BOXES.map(({ box: value, label }) => (
            <button
              key={value}
              type="button"
              className={classNames(
                'rounded-sm border px-2 py-1 text-xs uppercase tracking-wider transition',
                box === value
                  ? 'neon-amber motion-safe-neon border-amber/50 bg-chrome text-amber'
                  : 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber'
              )}
              onClick={() => onBoxChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" onClick={onShowBlocked}>Joueurs bloqués</Button>
          <Button onClick={onCompose}>Écrire</Button>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-amber-dim">
          <p className="m-0">Page {currentPage}/{totalPages}</p>
          <div className="flex gap-1">
            <Button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} variant="ghost">
              Précédente
            </Button>
            <Button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} variant="ghost">
              Suivante
            </Button>
          </div>
        </div>
      )}
      {mails.length === 0 && (
        <p className="m-0 text-sm text-label">{box === 'inbox' ? 'Aucune lettre reçue.' : 'Aucune lettre envoyée.'}</p>
      )}
      <ul className="m-0 list-none space-y-2 p-0">
        {mails.map(mail => (
          <li
            key={mail.id}
            className={classNames(
              'cursor-pointer rounded-sm border p-2 transition hover:border-amber/50',
              selectedMailId === mail.id && 'border-amber/60',
              mail.was_read
                ? 'border-rust/30 bg-chrome/40 text-amber-dim'
                : 'neon-amber motion-safe-neon border-amber/40 bg-chrome text-amber'
            )}
            onClick={() => onMailSelect(mail.id)}
          >
            <div className="flex justify-between gap-2 text-xs">
              <span className="uppercase tracking-wider text-label">
                {box === 'inbox' ? `De ${mail.sender.name}` : `À ${mail.recipient.name}`}
              </span>
              <time dateTime={new Date(mail.sent_at).toISOString()}>{formatDate(mail.sent_at)}</time>
            </div>
            <div className="mt-1 truncate text-sm">{mail.subject}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
