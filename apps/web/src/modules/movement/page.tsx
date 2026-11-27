import React from 'react'
import { Link } from '@tanstack/react-router'
import { TechnologyCode } from '@eoneom/api-client'

import { LayoutPage } from '#ui/layout/page'
import { LayoutDetailsEmpty } from '#ui/layout/details/empty'
import { useNow } from '#hook/now'
import {
  troopKeys,
  useGetMovement,
  useListIncomingMovements,
  useListMovements,
  useMovementCapacity,
} from '#troop/hooks'
import { useListTechnologies } from '#technology/hooks'
import { MovementDetails } from '#movement/details'
import { IncomingMovementDetails } from '#movement/incoming/details'
import { MovementCapacityReadout } from '#movement/capacity'
import { useLocationDirectory } from '#movement/location-label'
import {
  DEFAULT_MOVEMENT_SORT,
  DEFAULT_MOVEMENT_TAB,
  MovementListSearch,
  MovementTab,
  OwnMovementTab,
  movementsOfTab,
} from '#movement/list/sort'
import { MovementTabs, movementTabId, movementTabPanelId } from '#movement/list/tabs'
import { IncomingMovementTable, MovementTable } from '#movement/list/table'
import { useArrivalRefetch } from '#movement/list/arrival-refetch'
import {
  MovementOrigin,
  movementListPath,
  movementOriginOf,
  movementSendPath,
  usePathNavigate,
  worldMapPath,
} from '#movement/navigation'

const AnyLink = Link as React.ComponentType<{
  to: string
  search?: Record<string, string>
  className?: string
  children: React.ReactNode
}>

const LIST_REFETCH_MS = 30_000

const primaryLinkClass = 'neon-amber motion-safe-neon inline-block rounded-sm border border-copper bg-copper/30 px-3 py-2 text-meta font-semibold uppercase tracking-wide text-amber hover:bg-copper/50'
const textLinkClass = 'text-amber underline-offset-2 hover:underline'

type MovementPageProps = (
  | { cityId: string; outpostId?: never }
  | { cityId?: never; outpostId: string }
) & {
  movementId?: string
  search: MovementListSearch
}

const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col items-start gap-3 px-2 py-6 text-body text-amber-dim">{children}</div>
)

const TabEmptyState: React.FC<{
  tab: MovementTab
  origin: MovementOrigin
  detectionLevel: number
  technologyCityId: string | null
}> = ({ tab, origin, detectionLevel, technologyCityId }) => {
  switch (tab) {
    case 'sortants':
      return (
        <EmptyState>
          <p className="m-0">Aucun déplacement en cours.</p>
          <AnyLink to={movementSendPath(origin)} className={primaryLinkClass}>Envoyer des troupes</AnyLink>
        </EmptyState>
      )
    case 'entrants':
      return detectionLevel < 1 ? (
        <EmptyState>
          <p className="m-0">
            {technologyCityId ? (
              <AnyLink
                to={`/city/${technologyCityId}/base/technology`}
                search={{ code: TechnologyCode.DETECTION }}
                className={textLinkClass}
              >
                Recherchez la Détection
              </AnyLink>
            ) : 'Recherchez la Détection'}{' '}
            pour être prévenu des attaques entrantes.
          </p>
        </EmptyState>
      ) : (
        <EmptyState><p className="m-0">Aucune attaque détectée.</p></EmptyState>
      )
    case 'retours':
      return <EmptyState><p className="m-0">Aucune troupe sur le chemin du retour.</p></EmptyState>
    case 'convois':
      return (
        <EmptyState>
          <p className="m-0">Aucun convoi de bourse en route.</p>
          <AnyLink to="/exchange" className={textLinkClass}>Ouvrir la bourse</AnyLink>
        </EmptyState>
      )
  }
}

/** Movements page (slice 045): cap meter, four tabs of compact tables, the selected movement on the right. */
export const MovementPage: React.FC<MovementPageProps> = ({ cityId, outpostId, movementId, search }) => {
  const origin = movementOriginOf({ cityId, outpostId })
  const navigate = usePathNavigate()
  const now = useNow()
  const directory = useLocationDirectory()
  const tab = search.tab ?? DEFAULT_MOVEMENT_TAB
  const sort = search.sort ?? DEFAULT_MOVEMENT_SORT

  const { data: movements = [] } = useListMovements({ refetchInterval: LIST_REFETCH_MS })
  const { data: incoming = [] } = useListIncomingMovements({ refetchInterval: LIST_REFETCH_MS })
  const { data: capacity } = useMovementCapacity()
  const { data: technologyList } = useListTechnologies()
  const detectionLevel = technologyList?.technologies.find(technology => technology.code === TechnologyCode.DETECTION)?.level ?? 0
  const selectedIncoming = search.incoming ? incoming.find(movement => movement.id === search.incoming) : undefined
  const { data: movement } = useGetMovement(selectedIncoming ? null : movementId)

  useArrivalRefetch({
    arrivals: movements.filter(entry => !entry.battle_id),
    now,
    queryKey: troopKeys.movements,
  })
  useArrivalRefetch({ arrivals: incoming, now, queryKey: troopKeys.incomingMovements })

  const listPath = movementListPath(origin)
  const currentPath = movementId ? `${listPath}/${movementId}` : listPath
  const listSearch = (next: MovementListSearch) => ({
    tab: next.tab && next.tab !== DEFAULT_MOVEMENT_TAB ? next.tab : undefined,
    sort: next.sort && next.sort !== DEFAULT_MOVEMENT_SORT ? next.sort : undefined,
    incoming: next.incoming,
  })

  const ownRows = (value: OwnMovementTab) => movementsOfTab(movements, value)
  const counts: Record<MovementTab, number> = {
    sortants: ownRows('sortants').length,
    entrants: incoming.length,
    retours: ownRows('retours').length,
    convois: ownRows('convois').length,
  }
  const limitReached = Boolean(capacity && capacity.used >= capacity.limit)

  const details = selectedIncoming
    ? <IncomingMovementDetails movement={selectedIncoming} />
    : movement
      ? <MovementDetails movement={movement} mapPath={worldMapPath(origin)} />
      : <LayoutDetailsEmpty>Sélectionnez un mouvement pour voir son détail.</LayoutDetailsEmpty>

  const tabRows = tab === 'entrants' ? incoming : ownRows(tab)

  return (
    <LayoutPage details={details}>
      <div className="space-y-3">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="m-0 text-title text-amber">Mouvements</h1>
            {limitReached && (
              <p className="m-0 text-meta text-danger" role="status">
                Limite atteinte : attendez un retour ou améliorez un centre de commandement.
              </p>
            )}
          </div>
          <div className="flex items-end gap-4">
            {capacity && <MovementCapacityReadout used={capacity.used} limit={capacity.limit} />}
            <AnyLink to={movementSendPath(origin)} className={primaryLinkClass}>Envoyer des troupes</AnyLink>
          </div>
        </header>

        <MovementTabs
          tab={tab}
          counts={counts}
          onSelect={next => navigate({ to: currentPath, search: listSearch({ ...search, tab: next }), replace: true })}
        />

        <div id={movementTabPanelId} role="tabpanel" aria-labelledby={movementTabId(tab)}>
          {tabRows.length === 0 ? (
            <TabEmptyState
              tab={tab}
              origin={origin}
              detectionLevel={detectionLevel}
              technologyCityId={cityId ?? directory.cities[0]?.id ?? null}
            />
          ) : tab === 'entrants' ? (
            <IncomingMovementTable
              movements={incoming}
              sort={sort}
              onSort={next => navigate({ to: currentPath, search: listSearch({ ...search, sort: next }), replace: true })}
              now={now}
              selectedId={selectedIncoming?.id}
              onSelect={id => navigate({ to: listPath, search: listSearch({ tab, sort, incoming: id }) })}
            />
          ) : (
            <MovementTable
              tab={tab}
              movements={ownRows(tab)}
              sort={sort}
              onSort={next => navigate({ to: currentPath, search: listSearch({ ...search, sort: next }), replace: true })}
              now={now}
              directory={directory}
              selectedId={selectedIncoming ? undefined : movementId}
              onSelect={id => navigate({ to: `${listPath}/${id}`, search: listSearch({ tab, sort }) })}
            />
          )}
        </div>
      </div>
    </LayoutPage>
  )
}
