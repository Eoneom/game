import React from 'react'
import { Link } from '@tanstack/react-router'

import { LayoutPage } from '#ui/layout/page'
import { formatDate } from '#helpers/transform'
import { translateError } from '#helpers/error-translations'
import { useAllianceDetails } from '#alliance/hooks'
import { allianceDisplayName } from '#alliance/translations'
import { FactionTranslations } from '#faction/translations'

const AnyLink = Link as React.ComponentType<{
  to: string
  search?: Record<string, string>
  className?: string
  children: React.ReactNode
}>

/** Public view of an alliance (slice 033 `GET /alliance/:alliance_id`), opened from the rankings (slice 034). */
export const AlliancePublicView: React.FC<{ allianceId: string }> = ({ allianceId }) => {
  const { data, isPending, error } = useAllianceDetails(allianceId)

  let content: React.ReactNode = <p className="m-0 text-sm text-label">Chargement…</p>
  if (error) {
    content = <p role="alert" className="m-0 text-sm text-danger">{translateError(error.message)}</p>
  } else if (!isPending && data) {
    content = (
      <div className="space-y-3">
        <header className="space-y-1">
          <h2 className="m-0 text-base text-amber">{allianceDisplayName(data.name, data.tag)}</h2>
          <p className="m-0 text-xs text-label">
            {FactionTranslations[data.faction_code].name} — {data.member_count} membre{data.member_count > 1 ? 's' : ''} — fondée le {formatDate(data.created_at)}
          </p>
        </header>
        {data.chef && (
          <p className="m-0 text-sm text-amber-dim">
            Chef :{' '}
            <AnyLink to="/inbox/mail" search={{ view: 'compose', to: data.chef.name }} className="text-amber hover:underline">
              {data.chef.name}
            </AnyLink>
          </p>
        )}
        {data.description
          ? <p className="m-0 whitespace-pre-wrap text-sm text-amber-dim">{data.description}</p>
          : <p className="m-0 text-sm text-label">Pas de description.</p>}
        <AnyLink to="/ranking" search={{ kind: 'alliance' }} className="text-xs text-amber-dim hover:text-amber hover:underline">
          ← Classement des alliances
        </AnyLink>
      </div>
    )
  }

  return <LayoutPage>{content}</LayoutPage>
}
