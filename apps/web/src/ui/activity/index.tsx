import React from 'react'
import { Link, useLocation as useRouterLocation } from '@tanstack/react-router'
import classNames from 'classnames'

import { useLocationActivity } from '#location/activity-hooks'
import { useLocation } from '#location/context'
import { useCountdownProgress } from '#hook/countdown-progress'
import { BuildingTranslations } from '#building/translations'
import { TechnologyTranslations } from '#technology/translations'
import { TroopTranslations } from '#troop/translations'
import { formatDurationMmSs } from '#helpers/transform'

const Chip: React.FC<{
  to: string
  params?: Record<string, string>
  label: string
  detail: string
  active?: boolean
  urgent?: boolean
}> = ({ to, params, label, detail, active, urgent }) => {
  const RouterLink = Link as React.ComponentType<{
    to: string
    params?: Record<string, string>
    className?: string
    children: React.ReactNode
  }>
  return (
    <RouterLink
      to={to}
      params={params}
      className={classNames(
        'flex min-w-0 items-center gap-2 rounded-sm border px-2 py-1 text-xs transition',
        active
          ? 'neon-amber motion-safe-neon border-amber/50 bg-chrome text-amber'
          : 'border-rust/40 bg-chrome/70 text-amber-dim hover:border-rust hover:text-amber',
        urgent && !active && 'border-copper text-amber'
      )}
    >
      <span className="shrink-0 uppercase tracking-wider text-label">{label}</span>
      <span className="truncate">{detail}</span>
    </RouterLink>
  )
}

const useRouteActive = (href: string) => {
  const { pathname } = useRouterLocation()
  return pathname === href || pathname.startsWith(`${href}/`)
}

const BuildingChip: React.FC<{ cityId: string }> = ({ cityId }) => {
  const { data } = useLocationActivity()
  const building = data?.building
  const routeActive = useRouteActive(`/city/${cityId}/base/building`)
  const { remainingSeconds, elapsedProgress } = useCountdownProgress({
    endAt: building?.upgrade_at,
    startAt: building?.upgrade_started_at,
  })
  if (!building && !(data?.building_queue_depth)) {
    return (
      <Chip
        to="/city/$cityId/base/building"
        params={{ cityId }}
        label="Construction"
        detail="Libre"
        active={routeActive}
      />
    )
  }
  const name = building
    ? BuildingTranslations[building.code].name
    : 'File'
  const urgent = elapsedProgress > 0.9
  return (
    <Chip
      to="/city/$cityId/base/building"
      params={{ cityId }}
      label="Construction"
      detail={
        building
          ? `${name} · ${formatDurationMmSs(remainingSeconds)} · Q${data?.building_queue_depth ?? 0}`
          : `Q${data?.building_queue_depth ?? 0}`
      }
      active={routeActive || Boolean(building)}
      urgent={urgent}
    />
  )
}

const ResearchChip: React.FC<{ cityId: string }> = ({ cityId }) => {
  const { data } = useLocationActivity()
  const research = data?.research
  const routeActive = useRouteActive(`/city/${cityId}/base/technology`)
  const { remainingSeconds, elapsedProgress } = useCountdownProgress({
    endAt: research?.research_at,
    startAt: research?.research_started_at,
  })
  if (!research) {
    return (
      <Chip
        to="/city/$cityId/base/technology"
        params={{ cityId }}
        label="Recherche"
        detail="Libre"
        active={routeActive}
      />
    )
  }
  return (
    <Chip
      to="/city/$cityId/base/technology"
      params={{ cityId }}
      label="Recherche"
      detail={`${TechnologyTranslations[research.code].name} · ${formatDurationMmSs(remainingSeconds)}`}
      active={routeActive || Boolean(research)}
      urgent={elapsedProgress > 0.9}
    />
  )
}

const RecruitChip: React.FC<{ cityId: string }> = ({ cityId }) => {
  const { data } = useLocationActivity()
  const recruitment = data?.recruitment
  const routeActive = useRouteActive(`/city/${cityId}/base/troop`)
  const { remainingSeconds, elapsedProgress } = useCountdownProgress({
    endAt: recruitment?.finish_at,
    startAt: recruitment?.started_at,
  })
  if (!recruitment) {
    return (
      <Chip
        to="/city/$cityId/base/troop"
        params={{ cityId }}
        label="Recrutement"
        detail="Libre"
        active={routeActive}
      />
    )
  }
  return (
    <Chip
      to="/city/$cityId/base/troop"
      params={{ cityId }}
      label="Recrutement"
      detail={`${recruitment.remaining_count} ${TroopTranslations[recruitment.code].name} · ${formatDurationMmSs(remainingSeconds)}`}
      active={routeActive || Boolean(recruitment)}
      urgent={elapsedProgress > 0.9}
    />
  )
}

const MovementChip: React.FC = () => {
  const { cityId, outpostId } = useLocation()
  const { data } = useLocationActivity()
  const count = data?.movements.count ?? 0
  const { remainingSeconds } = useCountdownProgress({
    endAt: data?.movements.next_arrive_at ?? undefined,
    startAt: data?.movements.next_arrive_at
      ? (data.movements.next_arrive_at as number) - 60_000
      : undefined,
  })

  const to = cityId
    ? '/city/$cityId/world/movement'
    : '/outpost/$outpostId/world/movement'
  const params = cityId ? { cityId } : outpostId ? { outpostId } : undefined
  const href = cityId
    ? `/city/${cityId}/world/movement`
    : outpostId
      ? `/outpost/${outpostId}/world/movement`
      : ''
  const routeActive = useRouteActive(href)

  return (
    <Chip
      to={to}
      params={params}
      label="Déplacement"
      detail={
        count > 0
          ? `${count} en route · prochain ${formatDurationMmSs(remainingSeconds)}`
          : 'Aucun'
      }
      active={routeActive || count > 0}
    />
  )
}

export const ActivityStrip: React.FC = () => {
  const { cityId } = useLocation()

  return (
    <div className="activity-strip surface-chrome relative z-10 flex flex-wrap items-center gap-2 border-b border-rust/70 px-3 py-2">
      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-label">Activité</span>
      {cityId ? (
        <>
          <BuildingChip cityId={cityId} />
          <ResearchChip cityId={cityId} />
          <RecruitChip cityId={cityId} />
        </>
      ) : null}
      <MovementChip />
    </div>
  )
}
