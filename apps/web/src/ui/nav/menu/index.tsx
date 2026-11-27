import React from 'react'
import { useLocation as useRouterLocation } from '@tanstack/react-router'
import { OutpostType } from '@eoneom/api-client'

import { useLocation } from '#location/context'
import { useLocationActivity } from '#location/activity-hooks'
import { useLogout } from '#auth/hooks'
import { useCountUnreadReports } from '#communication/report/hooks'
import { useCountUnreadMail } from '#communication/mail/hooks'
import { useObservabilitySession } from '#admin/system-player-observability/hooks'
import { useGetCity } from '#city/hooks'
import { useGetOutpost } from '#outpost/hooks'
import { useListIncomingMovements, useMovementCapacity } from '#troop/hooks'
import { formatCoordinates } from '#helpers/transform'
import { NavEntry, NavEntryBadge, NavEntryCount } from '#ui/nav/menu/entry'
import {
  BuildingActivity,
  FortificationActivity,
  MovementActivity,
  RecruitmentActivity,
  ResearchActivity,
} from '#ui/nav/menu/activity'

const sectionLabelClass = 'm-0 text-caption uppercase tracking-wider text-label'
const listClass = 'm-0 flex list-none flex-col gap-0.5 p-0'

/** Queue depth « +N » in the entry's right slot; nothing when the queue is empty. */
const queueDepthSlot = (depth = 0): React.ReactNode => depth > 0
  ? <NavEntryCount srLabel="en file">+{depth}</NavEntryCount>
  : undefined

/** Movement cap « used/limit », red when full (slice 028). */
const useMovementCapSlot = (): React.ReactNode => {
  const { data: capacity } = useMovementCapacity()
  if (!capacity) {
    return null
  }
  return (
    <NavEntryCount danger={capacity.used >= capacity.limit} srLabel="déplacements utilisés">
      {capacity.used}/{capacity.limit}
    </NavEntryCount>
  )
}

/**
 * Left column (slice 041): entries of the current location with their activity line,
 * then the empire-wide entries, then « Se déconnecter ».
 */
export const NavMenu: React.FC = () => {
  const { mutate: logout } = useLogout()
  const { cityId, outpostId } = useLocation()
  const { pathname } = useRouterLocation()
  const { data: unreadReports } = useCountUnreadReports()
  const { data: unreadMail } = useCountUnreadMail()
  const { data: observabilitySession } = useObservabilitySession()
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(cityId ? null : outpostId)
  const { data: activity } = useLocationActivity()
  const { data: incoming = [] } = useListIncomingMovements()
  const movementCap = useMovementCapSlot()

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const isExact = (href: string) => pathname === href || pathname === `${href}/`

  const attacksHere = incoming.filter(movement => cityId
    ? movement.target.kind === 'city' && movement.target.id === cityId
    : outpostId
      ? movement.target.kind === 'outpost' && movement.target.id === outpostId
      : false)

  const movementActivity = (
    <MovementActivity
      count={activity?.movements.count ?? 0}
      nextArriveAt={activity?.movements.next_arrive_at ?? null}
      attacks={attacksHere}
    />
  )

  let locationSection: React.ReactNode = null
  if (cityId) {
    const params = { cityId }
    const base = `/city/${cityId}`
    locationSection = (
      <section aria-labelledby="nav-location-label" className="space-y-2">
        <div>
          <h2 id="nav-location-label" className={sectionLabelClass}>Colonie</h2>
          <p className="m-0 truncate text-body font-semibold text-amber" title={city?.name}>
            {city?.name ?? '…'}
          </p>
        </div>
        <ul className={listClass}>
          <NavEntry
            to="/city/$cityId/base/"
            params={params}
            label="Tableau de bord"
            current={isExact(`${base}/base`)}
          />
          <NavEntry
            to="/city/$cityId/base/building"
            params={params}
            label="Bâtiments"
            current={isCurrent(`${base}/base/building`)}
            right={queueDepthSlot(activity?.building_queue_depth)}
            activity={activity ? (
              <BuildingActivity building={activity.building} queueDepth={activity.building_queue_depth} />
            ) : undefined}
          />
          <NavEntry
            to="/city/$cityId/base/technology"
            params={params}
            label="Technologies"
            current={isCurrent(`${base}/base/technology`)}
            right={queueDepthSlot(activity?.research_queue_depth)}
            activity={activity ? (
              <ResearchActivity
                research={activity.research}
                queueDepth={activity.research_queue_depth}
                cityId={cityId}
              />
            ) : undefined}
          />
          <NavEntry
            to="/city/$cityId/base/troop"
            params={params}
            label="Troupes"
            current={isCurrent(`${base}/base/troop`)}
            right={queueDepthSlot(activity?.recruitment_queue_depth)}
            activity={activity ? (
              <RecruitmentActivity recruitment={activity.recruitment} queueDepth={activity.recruitment_queue_depth} />
            ) : undefined}
          />
          <NavEntry
            to="/city/$cityId/base/defense"
            params={params}
            label="Défense"
            current={isCurrent(`${base}/base/defense`)}
            right={queueDepthSlot(activity?.fortification_queue_depth)}
            activity={activity ? (
              <FortificationActivity
                fortification={activity.fortification}
                queueDepth={activity.fortification_queue_depth}
                available={activity.fortification_available}
              />
            ) : undefined}
          />
          <NavEntry
            to="/city/$cityId/world/movement"
            params={params}
            label="Déplacements"
            current={isCurrent(`${base}/world/movement`)}
            right={movementCap}
            activity={movementActivity}
            threat={attacksHere.length > 0}
          />
          <NavEntry
            to="/city/$cityId/world/map"
            params={params}
            label="Carte"
            current={isCurrent(`${base}/world/map`)}
          />
        </ul>
      </section>
    )
  } else if (outpostId) {
    const params = { outpostId }
    const base = `/outpost/${outpostId}`
    const coordinates = outpost ? formatCoordinates(outpost.coordinates) : '…'
    locationSection = (
      <section aria-labelledby="nav-location-label" className="space-y-2">
        <div>
          <h2 id="nav-location-label" className={sectionLabelClass}>Avant-poste</h2>
          <p className="m-0 flex items-baseline gap-2">
            <span className="truncate font-mono text-body font-semibold text-amber" title={coordinates}>{coordinates}</span>
            {outpost ? (
              <span className="text-caption text-label">
                {outpost.type === OutpostType.TEMPORARY ? 'Temporaire' : 'Permanent'}
              </span>
            ) : null}
          </p>
        </div>
        <ul className={listClass}>
          <NavEntry
            to="/outpost/$outpostId"
            params={params}
            label="Tableau de bord"
            current={isExact(base)}
          />
          <NavEntry
            to="/outpost/$outpostId/troop"
            params={params}
            label="Unités"
            current={isCurrent(`${base}/troop`)}
          />
          <NavEntry
            to="/outpost/$outpostId/world/movement"
            params={params}
            label="Déplacements"
            current={isCurrent(`${base}/world/movement`)}
            right={movementCap}
            activity={movementActivity}
            threat={attacksHere.length > 0}
          />
          <NavEntry
            to="/outpost/$outpostId/world/map"
            params={params}
            label="Carte"
            current={isCurrent(`${base}/world/map`)}
          />
        </ul>
      </section>
    )
  }

  return (
    <nav
      aria-label="Navigation principale"
      className="primary-nav surface-frame flex h-full min-h-0 w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-rust/70 p-3"
    >
      {locationSection}

      <section aria-labelledby="nav-empire-label" className="space-y-2">
        <h2 id="nav-empire-label" className={sectionLabelClass}>Empire</h2>
        <ul className={listClass}>
          <NavEntry
            to="/inbox/report"
            label="Rapports"
            current={isCurrent('/inbox/report')}
            right={unreadReports ? <NavEntryBadge count={unreadReports} /> : undefined}
          />
          <NavEntry
            to="/inbox/mail"
            label="Courrier"
            current={isCurrent('/inbox/mail')}
            right={unreadMail ? <NavEntryBadge count={unreadMail} /> : undefined}
          />
          <NavEntry to="/alliance" label="Alliance" current={isCurrent('/alliance')} />
          <NavEntry to="/ranking" label="Classements" current={isCurrent('/ranking')} />
          <NavEntry to="/exchange" label="Bourse" current={isCurrent('/exchange')} />
          {observabilitySession?.is_admin ? (
            <NavEntry to="/admin" label="Observabilité IA" current={isCurrent('/admin')} />
          ) : null}
        </ul>
      </section>

      <button
        type="button"
        className="mt-auto w-full rounded-sm border border-rust/50 bg-transparent px-3 py-2 text-left text-meta font-semibold uppercase tracking-wide text-amber-dim transition hover:border-danger hover:text-amber"
        onClick={e => {
          e.preventDefault()
          logout()
        }}
      >
        Se déconnecter
      </button>
    </nav>
  )
}
