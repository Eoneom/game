import React, { useState } from 'react'
import { MAIL_BODY_MAX_LENGTH, MAIL_SUBJECT_MAX_LENGTH, PLAYER_SEARCH_MIN_LENGTH } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { usePlayerSearch, useSendMail } from '#communication/mail/hooks'

interface Props {
  initialRecipient?: string
  initialSubject?: string
  inReplyTo?: string
  onSent: () => void
  onCancel: () => void
}

const fieldClass = 'w-full rounded-sm border border-edge bg-transparent px-3 py-2 text-body text-amber placeholder:text-muted focus:border-amber'

export const MailCompose: React.FC<Props> = ({ initialRecipient = '', initialSubject = '', inReplyTo, onSent, onCancel }) => {
  const [ recipient, setRecipient ] = useState(initialRecipient)
  const [ subject, setSubject ] = useState(initialSubject)
  const [ body, setBody ] = useState('')
  const [ suggestionsOpen, setSuggestionsOpen ] = useState(false)

  const { data: suggestions = [] } = usePlayerSearch(suggestionsOpen ? recipient : '')
  const sendMail = useSendMail({ onSuccess: onSent })

  const visibleSuggestions = suggestions.filter(player => player.name !== recipient)

  return (
    <form
      className="max-w-[40rem] space-y-3"
      onSubmit={event => {
        event.preventDefault()
        sendMail.mutate({
          recipient_name: recipient.trim(),
          subject,
          body,
          ...(inReplyTo ? { in_reply_to: inReplyTo } : {}),
        })
      }}
    >
      <h2 className="m-0 text-heading text-amber">{inReplyTo ? 'Répondre' : 'Nouvelle lettre'}</h2>
      <div className="relative">
        <label className="mb-1 block text-meta text-label" htmlFor="mail-recipient">Destinataire</label>
        <input
          id="mail-recipient"
          className={fieldClass}
          autoComplete="off"
          value={recipient}
          onChange={event => {
            setRecipient(event.target.value)
            setSuggestionsOpen(true)
          }}
          onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
          placeholder={`Nom du joueur (${PLAYER_SEARCH_MIN_LENGTH} lettres min. pour suggérer)`}
        />
        {suggestionsOpen && visibleSuggestions.length > 0 && (
          <ul role="listbox" className="absolute z-30 m-0 mt-1 w-full list-none rounded-sm border border-rust/60 bg-chrome p-1 shadow-lg">
            {visibleSuggestions.map(player => (
              <li key={player.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="block w-full px-2 py-1 text-left text-body text-amber hover:bg-rust/30"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    setRecipient(player.name)
                    setSuggestionsOpen(false)
                  }}
                >
                  {player.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="mb-1 block text-meta text-label" htmlFor="mail-subject">Objet</label>
        <input
          id="mail-subject"
          className={fieldClass}
          maxLength={MAIL_SUBJECT_MAX_LENGTH}
          value={subject}
          onChange={event => setSubject(event.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-meta text-label" htmlFor="mail-body">Message</label>
        <textarea
          id="mail-body"
          className={`${fieldClass} min-h-40`}
          maxLength={MAIL_BODY_MAX_LENGTH}
          value={body}
          onChange={event => setBody(event.target.value)}
        />
        <p className="m-0 text-right font-mono text-caption text-label">{body.length}/{MAIL_BODY_MAX_LENGTH}</p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={sendMail.isPending || !recipient.trim() || !subject.trim() || !body.trim()}>
          Envoyer
        </Button>
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
      </div>
    </form>
  )
}
