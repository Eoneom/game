import React, { useState } from 'react'
import {
  ALLIANCE_APPLICATION_MESSAGE_MAX_LENGTH,
  ALLIANCE_DESCRIPTION_MAX_LENGTH,
  ALLIANCE_NAME_MAX_LENGTH,
} from '@eoneom/api-client'

import { client } from '#helpers/api'
import { formatDate } from '#helpers/transform'
import { Button } from '#ui/button'
import {
  useAllianceAction,
  useAllianceApplications,
  useAllianceInvitations,
  useAllianceSearch,
} from '#alliance/hooks'
import { allianceDisplayName } from '#alliance/translations'

export const fieldClass = 'w-full rounded-sm border border-edge bg-transparent px-3 py-2 text-body text-amber placeholder:text-muted focus:border-amber'
export const sectionTitleClass = 'm-0 text-caption uppercase tracking-wider text-label'

const CreateAllianceForm: React.FC = () => {
  const [ name, setName ] = useState('')
  const [ tag, setTag ] = useState('')
  const [ description, setDescription ] = useState('')
  const create = useAllianceAction(
    (token, body: { name: string; tag: string; description: string }) => client.alliance.create(token, body),
    { success: 'Alliance fondée' }
  )

  return (
    <form
      className="max-w-[40rem] space-y-2"
      onSubmit={event => {
        event.preventDefault()
        create.mutate({ name: name.trim(), tag: tag.trim().toUpperCase(), description })
      }}
    >
      <h3 className={sectionTitleClass}>Fonder une alliance</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem]">
        <input
          aria-label="Nom de l'alliance"
          className={fieldClass}
          placeholder="Nom (3 à 30 caractères)"
          maxLength={ALLIANCE_NAME_MAX_LENGTH}
          value={name}
          onChange={event => setName(event.target.value)}
        />
        <input
          aria-label="Tag"
          className={fieldClass}
          placeholder="TAG"
          maxLength={5}
          value={tag}
          onChange={event => setTag(event.target.value.toUpperCase())}
        />
      </div>
      <textarea
        aria-label="Description"
        className={fieldClass}
        rows={3}
        placeholder="Description (facultative)"
        maxLength={ALLIANCE_DESCRIPTION_MAX_LENGTH}
        value={description}
        onChange={event => setDescription(event.target.value)}
      />
      <Button type="submit" disabled={create.isPending || !name.trim() || !tag.trim()}>Fonder</Button>
    </form>
  )
}

const AllianceSearch: React.FC<{ appliedAllianceIds: Set<string> }> = ({ appliedAllianceIds }) => {
  const [ q, setQ ] = useState('')
  const [ message, setMessage ] = useState('')
  const { data: alliances = [], isFetching } = useAllianceSearch(q, true)
  const apply = useAllianceAction(
    (token, alliance_id: string) => client.alliance.apply(token, { alliance_id, ...(message.trim() ? { message } : {}) }),
    { success: 'Candidature envoyée', onSuccess: () => setMessage('') }
  )

  return (
    <section className="space-y-2">
      <h3 className={sectionTitleClass}>Alliances de votre faction</h3>
      <input
        aria-label="Rechercher une alliance"
        className={fieldClass}
        placeholder="Nom ou tag"
        value={q}
        onChange={event => setQ(event.target.value)}
      />
      <textarea
        aria-label="Message de candidature"
        className={fieldClass}
        rows={2}
        placeholder="Message de candidature (facultatif)"
        maxLength={ALLIANCE_APPLICATION_MESSAGE_MAX_LENGTH}
        value={message}
        onChange={event => setMessage(event.target.value)}
      />
      {!isFetching && alliances.length === 0 && <p className="m-0 text-body text-label">Aucune alliance trouvée.</p>}
      <ul className="m-0 list-none space-y-2 p-0">
        {alliances.map(alliance => (
          <li key={alliance.id} className="flex items-center justify-between gap-2 rounded-sm border border-rust/30 p-2">
            <div>
              <div className="text-body text-amber">{allianceDisplayName(alliance.name, alliance.tag)}</div>
              <div className="text-caption text-label">{alliance.member_count} membre{alliance.member_count > 1 ? 's' : ''}</div>
            </div>
            {appliedAllianceIds.has(alliance.id)
              ? <span className="text-meta text-label">Candidature envoyée</span>
              : (
                <Button variant="ghost" disabled={apply.isPending} onClick={() => apply.mutate(alliance.id)}>
                  Postuler
                </Button>
              )}
          </li>
        ))}
      </ul>
    </section>
  )
}

const PendingInvitations: React.FC = () => {
  const { data: invitations = [] } = useAllianceInvitations()
  const accept = useAllianceAction(
    (token, invitation_id: string) => client.alliance.acceptInvitation(token, { invitation_id })
  )
  const refuse = useAllianceAction(
    (token, invitation_id: string) => client.alliance.refuseInvitation(token, { invitation_id }),
    { success: 'Invitation refusée' }
  )

  if (invitations.length === 0) return null

  return (
    <section className="space-y-2">
      <h3 className={sectionTitleClass}>Invitations reçues</h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {invitations.map(invitation => (
          <li key={invitation.id} className="flex items-center justify-between gap-2 rounded-sm border border-rust/30 p-2">
            <div>
              <div className="text-body text-amber">{allianceDisplayName(invitation.alliance.name, invitation.alliance.tag)}</div>
              <div className="text-meta text-label">
                Invité par {invitation.invited_by.name} — expire le {formatDate(invitation.expires_at)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button disabled={accept.isPending} onClick={() => accept.mutate(invitation.id)}>Accepter</Button>
              <Button variant="ghost" disabled={refuse.isPending} onClick={() => refuse.mutate(invitation.id)}>Refuser</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const OwnApplications: React.FC = () => {
  const { data } = useAllianceApplications()
  const withdraw = useAllianceAction(
    (token, application_id: string) => client.alliance.withdrawApplication(token, { application_id }),
    { success: 'Candidature retirée' }
  )
  const sent = data?.sent ?? []

  if (sent.length === 0) return null

  return (
    <section className="space-y-2">
      <h3 className={sectionTitleClass}>Vos candidatures</h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {sent.map(application => (
          <li key={application.id} className="flex items-center justify-between gap-2 rounded-sm border border-rust/30 p-2">
            <div>
              <div className="text-body text-amber">{allianceDisplayName(application.alliance.name, application.alliance.tag)}</div>
              <div className="text-caption text-label">Envoyée le {formatDate(application.created_at)}</div>
            </div>
            <Button variant="ghost" disabled={withdraw.isPending} onClick={() => withdraw.mutate(application.id)}>
              Retirer
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Without alliance: cooldown notice, invitations, own applications, create form and search. */
export const NoAlliance: React.FC<{ cooldownUntil: number | null }> = ({ cooldownUntil }) => {
  const { data } = useAllianceApplications()
  const appliedAllianceIds = new Set((data?.sent ?? []).map(application => application.alliance.id))

  return (
    <div className="space-y-5">
      <header>
        <h2 className="m-0 text-heading text-amber">Alliance</h2>
        <p className="m-0 text-meta text-amber-dim">
          Vous n&apos;appartenez à aucune alliance. Une alliance regroupe des commandants de votre faction.
        </p>
      </header>
      {cooldownUntil && (
        <p role="status" className="m-0 rounded-sm border border-danger/60 p-2 text-body text-amber">
          Vous avez quitté une alliance : vous pourrez en rejoindre ou en fonder une à partir du {formatDate(cooldownUntil)}.
        </p>
      )}
      <PendingInvitations />
      <OwnApplications />
      <CreateAllianceForm />
      <AllianceSearch appliedAllianceIds={appliedAllianceIds} />
    </div>
  )
}
