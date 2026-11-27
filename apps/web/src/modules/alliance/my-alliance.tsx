import React, { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ALLIANCE_DESCRIPTION_MAX_LENGTH,
  AllianceRole,
  type AllianceMineDataResponse,
} from '@eoneom/api-client'

import { client } from '#helpers/api'
import { formatCoordinates, formatDate } from '#helpers/transform'
import { Button } from '#ui/button'
import { useLocation } from '#location/context'
import { useListCities } from '#city/hooks'
import { useAllianceAction, useAllianceApplications } from '#alliance/hooks'
import {
  AllianceRoleLabels,
  allianceDisplayName,
  canKick,
  canManageMembers,
} from '#alliance/translations'
import { fieldClass, sectionTitleClass } from '#alliance/no-alliance'

type MyAllianceData = NonNullable<AllianceMineDataResponse['alliance']>
type Member = MyAllianceData['members'][number]

const MapLink = Link as React.ComponentType<{
  to: string
  params?: Record<string, string>
  search?: Record<string, number>
  className?: string
  children: React.ReactNode
}>

const InviteForm: React.FC = () => {
  const [ playerName, setPlayerName ] = useState('')
  const invite = useAllianceAction(
    (token, player_name: string) => client.alliance.invite(token, { player_name }),
    { success: 'Invitation envoyée', onSuccess: () => setPlayerName('') }
  )

  return (
    <form
      className="flex gap-2"
      onSubmit={event => {
        event.preventDefault()
        invite.mutate(playerName.trim())
      }}
    >
      <input
        aria-label="Joueur à inviter"
        className={fieldClass}
        placeholder="Nom du joueur à inviter"
        value={playerName}
        onChange={event => setPlayerName(event.target.value)}
      />
      <Button type="submit" disabled={invite.isPending || !playerName.trim()}>Inviter</Button>
    </form>
  )
}

const ReceivedApplications: React.FC = () => {
  const { data } = useAllianceApplications()
  const accept = useAllianceAction(
    (token, application_id: string) => client.alliance.acceptApplication(token, { application_id }),
    { success: 'Candidature acceptée' }
  )
  const refuse = useAllianceAction(
    (token, application_id: string) => client.alliance.refuseApplication(token, { application_id }),
    { success: 'Candidature refusée' }
  )
  const received = data?.received ?? []

  return (
    <section className="space-y-2">
      <h3 className={sectionTitleClass}>Candidatures</h3>
      {received.length === 0 && <p className="m-0 text-sm text-label">Aucune candidature en attente.</p>}
      <ul className="m-0 list-none space-y-2 p-0">
        {received.map(application => (
          <li key={application.id} className="space-y-1 rounded-sm border border-rust/30 p-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm text-amber">{application.player.name}</div>
                <div className="text-xs text-label">Le {formatDate(application.created_at)}</div>
              </div>
              <div className="flex gap-2">
                <Button disabled={accept.isPending} onClick={() => accept.mutate(application.id)}>Accepter</Button>
                <Button variant="ghost" disabled={refuse.isPending} onClick={() => refuse.mutate(application.id)}>Refuser</Button>
              </div>
            </div>
            {application.message && (
              <p className="m-0 whitespace-pre-wrap text-sm text-amber-dim">{application.message}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

const MemberRow: React.FC<{
  member: Member
  viewerRole: AllianceRole
  isViewer: boolean
  mapCityId: string | null
}> = ({ member, viewerRole, isViewer, mapCityId }) => {
  const setRole = useAllianceAction(
    (token, role: AllianceRole.OFFICIER | AllianceRole.MEMBRE) => client.alliance.setRole(token, { player_id: member.player_id, role }),
    { success: 'Rôle modifié' }
  )
  const transfer = useAllianceAction(
    (token, player_id: string) => client.alliance.transferLeadership(token, { player_id }),
    { success: 'Direction transmise' }
  )
  const kick = useAllianceAction(
    (token, player_id: string) => client.alliance.kick(token, { player_id }),
    { success: 'Membre exclu' }
  )

  const isChef = viewerRole === AllianceRole.CHEF

  return (
    <li className="space-y-1 rounded-sm border border-rust/30 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm text-amber">{member.name}</span>
          <span className="ml-2 text-xs uppercase tracking-wider text-label">{AllianceRoleLabels[member.role]}</span>
        </div>
        {!isViewer && (
          <div className="flex flex-wrap gap-1">
            {isChef && member.role === AllianceRole.MEMBRE && (
              <Button variant="ghost" disabled={setRole.isPending} onClick={() => setRole.mutate(AllianceRole.OFFICIER)}>
                Promouvoir
              </Button>
            )}
            {isChef && member.role === AllianceRole.OFFICIER && (
              <Button variant="ghost" disabled={setRole.isPending} onClick={() => setRole.mutate(AllianceRole.MEMBRE)}>
                Rétrograder
              </Button>
            )}
            {isChef && (
              <Button
                variant="ghost"
                disabled={transfer.isPending}
                onClick={() => {
                  if (window.confirm(`Transmettre la direction de l'alliance à ${member.name} ? Vous deviendrez officier.`)) {
                    transfer.mutate(member.player_id)
                  }
                }}
              >
                Nommer chef
              </Button>
            )}
            {canKick({ viewer: viewerRole, target: member.role }) && (
              <Button
                variant="danger"
                disabled={kick.isPending}
                onClick={() => {
                  if (window.confirm(`Exclure ${member.name} de l'alliance ?`)) {
                    kick.mutate(member.player_id)
                  }
                }}
              >
                Exclure
              </Button>
            )}
          </div>
        )}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-xs text-amber-dim">
        {member.cities.map(city => (
          <li key={city.id}>
            {mapCityId ? (
              <MapLink
                to="/city/$cityId/world/map"
                params={{ cityId: mapCityId }}
                search={{ x: city.coordinates.x, y: city.coordinates.y }}
                className="hover:text-amber hover:underline"
              >
                {city.name} ({formatCoordinates(city.coordinates)})
              </MapLink>
            ) : (
              <span>{city.name} ({formatCoordinates(city.coordinates)})</span>
            )}
          </li>
        ))}
      </ul>
    </li>
  )
}

const DescriptionEditor: React.FC<{ description: string }> = ({ description }) => {
  const [ editing, setEditing ] = useState(false)
  const [ draft, setDraft ] = useState(description)
  const save = useAllianceAction(
    (token, next: string) => client.alliance.updateDescription(token, { description: next }),
    { success: 'Description modifiée', onSuccess: () => setEditing(false) }
  )

  if (!editing) {
    return (
      <Button variant="ghost" onClick={() => {
        setDraft(description)
        setEditing(true)
      }}>
        Modifier la description
      </Button>
    )
  }

  return (
    <form
      className="space-y-2"
      onSubmit={event => {
        event.preventDefault()
        save.mutate(draft)
      }}
    >
      <textarea
        aria-label="Description de l'alliance"
        className={fieldClass}
        rows={4}
        maxLength={ALLIANCE_DESCRIPTION_MAX_LENGTH}
        value={draft}
        onChange={event => setDraft(event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>Enregistrer</Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
      </div>
    </form>
  )
}

/** With alliance: header, members, invitations and applications for officers, leave / dissolve. */
export const MyAlliance: React.FC<{ alliance: MyAllianceData, viewerId: string | null }> = ({ alliance, viewerId }) => {
  const { cityId } = useLocation()
  const { data: citiesData } = useListCities()
  const mapCityId = cityId ?? citiesData?.cities[0]?.id ?? null

  const leave = useAllianceAction((token, _: void) => client.alliance.leave(token), { success: 'Vous avez quitté l\'alliance' })
  const dissolve = useAllianceAction((token, _: void) => client.alliance.dissolve(token), { success: 'Alliance dissoute' })

  const isChef = alliance.viewer_role === AllianceRole.CHEF
  const alone = alliance.members.length === 1

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="m-0 text-base text-amber">{allianceDisplayName(alliance.name, alliance.tag)}</h2>
        <p className="m-0 text-xs text-label">
          Votre rôle : {AllianceRoleLabels[alliance.viewer_role]} — fondée le {formatDate(alliance.created_at)}
        </p>
        {alliance.description
          ? <p className="m-0 whitespace-pre-wrap text-sm text-amber-dim">{alliance.description}</p>
          : <p className="m-0 text-sm text-label">Pas de description.</p>}
        {isChef && <DescriptionEditor description={alliance.description} />}
      </header>

      <section className="space-y-2">
        <h3 className={sectionTitleClass}>Membres ({alliance.members.length})</h3>
        <ul className="m-0 list-none space-y-2 p-0">
          {alliance.members.map(member => (
            <MemberRow
              key={member.player_id}
              member={member}
              viewerRole={alliance.viewer_role}
              isViewer={member.player_id === viewerId}
              mapCityId={mapCityId}
            />
          ))}
        </ul>
      </section>

      {canManageMembers(alliance.viewer_role) && (
        <>
          <section className="space-y-2">
            <h3 className={sectionTitleClass}>Inviter un joueur</h3>
            <InviteForm />
          </section>
          <ReceivedApplications />
        </>
      )}

      <section className="flex flex-wrap gap-2">
        {!isChef && (
          <Button
            variant="danger"
            disabled={leave.isPending}
            onClick={() => {
              if (window.confirm('Quitter l\'alliance ? Vous devrez attendre 24 h avant d\'en rejoindre une autre.')) {
                leave.mutate()
              }
            }}
          >
            Quitter l&apos;alliance
          </Button>
        )}
        {isChef && (
          <>
            {!alone && (
              <p className="m-0 text-xs text-label">
                Pour quitter l&apos;alliance, nommez d&apos;abord un autre chef.
              </p>
            )}
            <Button
              variant="danger"
              disabled={dissolve.isPending}
              onClick={() => {
                if (window.confirm('Dissoudre l\'alliance ? Tous les membres la quittent et l\'historique de discussion est supprimé.')) {
                  dissolve.mutate()
                }
              }}
            >
              Dissoudre
            </Button>
          </>
        )}
      </section>
    </div>
  )
}
