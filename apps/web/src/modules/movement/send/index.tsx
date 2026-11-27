import React, { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import { CombatStrategy, Coordinates, MovementAction, OutpostType, TechnologyCode } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { LayoutPage } from '#ui/layout/page'
import { formatCoordinates } from '#helpers/transform'
import { useNow } from '#hook/now'
import { useGetCity } from '#city/hooks'
import { useGetOutpost, useListOutposts } from '#outpost/hooks'
import { useCreateMovement, useListTroops, useMovementCapacity } from '#troop/hooks'
import { useListTechnologies } from '#technology/hooks'
import { useMyAlliance } from '#alliance/hooks'
import { formatLocationLabel, useLocationDirectory } from '#movement/location-label'
import { describeDestination, useDestinationInfo } from '#movement/api/destination'
import { useMovementEstimate } from '#movement/api/estimate'
import { cellDistance } from '#movement/format'
import { MovementOrigin } from '#movement/navigation'
import {
  actionChoices,
  actionLabel,
  orderBlockers,
  resolveAction,
  restrictSelection,
} from '#movement/send/actions'
import { cargoLoad, cargoMaximums, fitCargo } from '#movement/send/cargo'
import { pushRecentTarget, readRecentTargets, RecentTarget } from '#movement/send/recent-targets'
import {
  EMPTY_CARGO,
  MOVEMENT_SEND_STEPS,
  MovementSendState,
  MovementSendStep,
  SendableAction,
  TroopSelection,
  hasDestination,
  resolveStep,
  selectedTroopList,
} from '#movement/send/search'
import { MovementSendStepDestination } from '#movement/send/step-destination'
import { MovementSendStepOrder } from '#movement/send/step-order'
import { MovementSendStepSummary } from '#movement/send/step-summary'
import { MovementSendRecapPanel } from '#movement/send/recap-panel'

interface MovementSendWizardProps {
  origin: MovementOrigin
  /** URL-backed on the route, `useState`-backed in the map drawer (slice 044). Same shape as the parsed search params. */
  state: MovementSendState
  onStateChange: (next: MovementSendState, options: { push: boolean }) => void
  /** Route: navigate to the new movement. Drawer: show it and its arrow (044). */
  onSent: (movement_id: string) => void
  onCancel: () => void
  /** Route only: send from another own location (troops and cargo are dropped, they belong to the old one). */
  onOriginChange?: (origin: MovementOrigin, state: MovementSendState) => void
  /** Drawer: the recap renders below the steps instead of in the right details panel. */
  layout?: 'page' | 'drawer'
}

const STEP_LABELS: Record<MovementSendStep, string> = {
  destination: 'Destination',
  ordre: 'Ordre et troupes',
  recap: 'Récapitulatif',
}

const REMOVED_TROOPS_NOTICE = 'Les troupes non autorisées pour cet ordre ont été retirées.'

const sameCell = (a: Coordinates | null, b: Coordinates | null): boolean =>
  Boolean(a && b && a.x === b.x && a.y === b.y)

/**
 * Send wizard (slice 045): 1 Destination, 2 Ordre et troupes, 3 Récapitulatif, then « Envoyer ». Every field lives
 * in `state`, so the route keeps it in the URL and the map drawer of slice 044 in local state.
 */
export const MovementSendWizard: React.FC<MovementSendWizardProps> = ({
  origin,
  state,
  onStateChange,
  onSent,
  onCancel,
  onOriginChange,
  layout = 'page',
}) => {
  const now = useNow()
  const directory = useLocationDirectory()
  const cityId = origin.kind === 'city' ? origin.id : undefined
  const outpostId = origin.kind === 'outpost' ? origin.id : undefined
  const { data: city } = useGetCity(cityId)
  const { data: outpost } = useGetOutpost(outpostId)
  const troopQuery = useListTroops(cityId ? { cityId } : { outpostId: outpostId ?? '' })
  const { data: capacity } = useMovementCapacity()
  const { data: outposts } = useListOutposts()
  const { data: technologyList } = useListTechnologies()
  const { data: myAlliance } = useMyAlliance()
  const createMovement = useCreateMovement()
  const [ notice, setNotice ] = useState<string | null>(null)

  const espionageLevel = technologyList?.technologies.find(technology => technology.code === TechnologyCode.ESPIONAGE)?.level ?? 0
  const originCoordinates = city?.coordinates ?? outpost?.coordinates ?? null
  const destination: Coordinates | null = hasDestination(state) ? { x: state.x, y: state.y } : null
  const destinationQuery = useDestinationInfo(destination)
  const destinationInfo = destinationQuery.data
  const kind = destinationInfo?.kind

  // Carriers reserved for the faction exchange stay in the city but cannot move (slice 035).
  const available = useMemo(() => (troopQuery.data ?? [])
    .map(troop => ({ code: troop.code, count: Math.max(0, troop.count - (troop.exchange_reserved ?? 0)) }))
    .filter(troop => troop.count > 0), [ troopQuery.data ])

  const action = resolveAction({ requested: state.action, kind, espionage_level: espionageLevel })
  const choices = kind ? actionChoices({ kind, espionage_level: espionageLevel }) : []

  // Counts clamped to what is available now, then to the troops the action accepts.
  const selection: TroopSelection = useMemo(() => {
    const clamped: TroopSelection = {}
    for (const { code, count } of selectedTroopList(state.troops)) {
      const max = available.find(troop => troop.code === code)?.count ?? 0
      if (Math.min(count, max) > 0) clamped[code] = Math.min(count, max)
    }
    return restrictSelection(clamped, action).selection
  }, [ state.troops, available, action ])
  const troops = selectedTroopList(selection)

  const isTransport = action === MovementAction.TRANSPORT
  const stock = {
    plastic: city?.plastic ?? outpost?.plastic ?? 0,
    mushroom: city?.mushroom ?? outpost?.mushroom ?? 0,
    plasma: city?.plasma ?? outpost?.plasma ?? 0,
    // Outposts hold no water (slice 035).
    water: city?.water ?? 0,
  }

  const estimateQuery = useMovementEstimate(originCoordinates && destination && troops.length
    ? {
      origin: originCoordinates,
      destination,
      troops,
      resources: isTransport ? state.cargo : undefined,
    }
    : null)
  const estimate = troops.length ? estimateQuery.data : undefined
  const transportCapacity = estimate?.transport_capacity ?? 0
  const cargo = isTransport ? fitCargo({ cargo: state.cargo, stock, capacity: transportCapacity }) : EMPTY_CARGO
  const load = cargoLoad(cargo)
  const blockers = orderBlockers({ action, selection, cargo_load: load, transport_capacity: transportCapacity })
  const strategy = state.strategy ?? CombatStrategy.BALANCED
  const limitReached = Boolean(capacity && capacity.used >= capacity.limit)

  // Step guard: once the data needed to judge is loaded, a step that cannot be shown falls back (URL replaced).
  const dataReady = !troopQuery.isPending && (!destination || !destinationQuery.isPending) && Boolean(originCoordinates)
  let step = resolveStep(state)
  if (dataReady && step !== 'destination' && (sameCell(destination, originCoordinates) || !destinationInfo)) {
    step = 'destination'
  }
  if (dataReady && step === 'recap' && blockers.length > 0 && !estimateQuery.isFetching) {
    step = 'ordre'
  }
  useEffect(() => {
    if (state.step && state.step !== step) {
      onStateChange({ ...state, step }, { push: false })
    }
  }, [ state.step, step ])

  const [ player_id, setPlayerId ] = useState<string | null>(null)
  const [ recentTargets, setRecentTargets ] = useState<RecentTarget[]>([])
  useEffect(() => {
    const viewer = myAlliance?.viewer_player_id ?? null
    setPlayerId(viewer)
    setRecentTargets(viewer ? readRecentTargets(viewer) : [])
  }, [ myAlliance?.viewer_player_id ])

  const update = (patch: Partial<MovementSendState>) => onStateChange({ ...state, ...patch }, { push: false })
  // A preselected action (lone choice) is written to the state when the step changes.
  const goTo = (next: MovementSendStep) => onStateChange({ ...state, action: action ?? state.action, step: next }, { push: true })

  const changeAction = (next: SendableAction) => {
    const restricted = restrictSelection(state.troops, next)
    setNotice(restricted.removed ? REMOVED_TROOPS_NOTICE : null)
    update({
      action: next,
      troops: restricted.selection,
      cargo: next === MovementAction.TRANSPORT ? state.cargo : EMPTY_CARGO,
      strategy: next === MovementAction.ATTACK ? state.strategy : undefined,
    })
  }

  const send = () => {
    if (!originCoordinates || !destination || !action) return
    createMovement.mutate({
      action,
      origin: originCoordinates,
      destination,
      troops,
      resources: isTransport ? cargo : undefined,
      combat_strategy: action === MovementAction.ATTACK ? strategy : undefined,
    }, {
      onSuccess: data => {
        if (player_id) {
          pushRecentTarget(player_id, { coordinates: destination, action, sent_at: Date.now() })
        }
        if (data?.movement_id) onSent(data.movement_id)
      },
    })
  }

  const originLabel = originCoordinates ? formatLocationLabel(originCoordinates, directory) : '…'
  const destinationLabel = destinationInfo ? describeDestination(destinationInfo) : null
  const currentActionLabel = action ? actionLabel(action, kind) : null
  const orderLine = destination && currentActionLabel
    ? `${currentActionLabel} — ${destinationLabel ?? 'Case'} (${formatCoordinates(destination)}) depuis ${originLabel}`
    : ''

  const stepIndex = MOVEMENT_SEND_STEPS.indexOf(step)
  const canContinue = step === 'destination'
    ? Boolean(destination) && Boolean(destinationInfo) && !sameCell(destination, originCoordinates)
    : step === 'ordre' ? blockers.length === 0 : false

  const content = (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="m-0 text-title text-amber">Envoyer des troupes</h1>
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
      </header>

      <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Étapes">
        {MOVEMENT_SEND_STEPS.map((value, index) => {
          const current = value === step
          const done = index < stepIndex
          const label = `${index + 1} ${STEP_LABELS[value]}`
          return (
            <li key={value}>
              {done ? (
                <button
                  type="button"
                  className="rounded-sm border border-amber/40 px-3 py-1 text-caption uppercase tracking-wider text-amber hover:border-amber"
                  onClick={() => goTo(value)}
                >
                  {label}
                </button>
              ) : (
                <span
                  aria-current={current ? 'step' : undefined}
                  className={classNames(
                    'inline-block rounded-sm border px-3 py-1 text-caption uppercase tracking-wider',
                    current ? 'border-amber bg-chrome text-amber' : 'border-rust/40 text-label'
                  )}
                >
                  {label}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {step === 'destination' && (
        <MovementSendStepDestination
          origin={origin}
          originCoordinates={originCoordinates}
          directory={directory}
          destination={destination}
          destinationInfo={destinationInfo}
          destinationLoading={destinationQuery.isFetching}
          recentTargets={recentTargets}
          now={now}
          onDestinationChange={next => update({ x: next?.x, y: next?.y })}
          onOriginChange={onOriginChange
            ? next => onOriginChange(next, { ...state, troops: {}, cargo: EMPTY_CARGO })
            : undefined}
          onNext={() => goTo('ordre')}
        />
      )}

      {step === 'ordre' && (
        <MovementSendStepOrder
          kind={kind}
          choices={choices}
          action={action}
          onAction={changeAction}
          troops={available}
          selection={selection}
          onSelectionChange={next => {
            setNotice(null)
            update({ troops: next })
          }}
          notice={notice}
          cargo={cargo}
          cargoMax={cargoMaximums({ cargo, stock, capacity: transportCapacity })}
          showWater={origin.kind === 'city'}
          transportCapacity={transportCapacity}
          cargoLoad={load}
          onCargoChange={next => update({ cargo: next })}
          strategy={strategy}
          onStrategyChange={next => update({ strategy: next })}
          blockers={blockers}
        />
      )}

      {step === 'recap' && action && (
        <MovementSendStepSummary
          orderLine={orderLine}
          action={action}
          troops={troops}
          cargo={cargo}
          strategy={strategy}
          distance={originCoordinates && destination ? cellDistance(originCoordinates, destination) : 0}
          estimate={estimate}
          espionageLevel={espionageLevel}
          warnings={{
            isTemporaryOutpost: outpost?.type === OutpostType.TEMPORARY,
            troops: available,
            selectedTroops: selection,
            destinationCapacityExceeded: isTransport && Boolean(estimate?.destination_capacity_exceeded),
            movementLimitReached: limitReached,
            outpostLimitReached: action === MovementAction.BASE && kind === 'empty'
              && Boolean(outposts && outposts.outposts.length >= outposts.count_limit),
            spy: action === MovementAction.SPY,
            waterToOutpost: isTransport && cargo.water > 0 && kind === 'own_outpost',
          }}
          limitReached={limitReached}
          sending={createMovement.isPending}
          onSend={send}
        />
      )}

      <footer className="flex items-center justify-between gap-2 border-t border-rust/40 pt-3">
        {stepIndex > 0
          ? <Button variant="ghost" onClick={() => goTo(MOVEMENT_SEND_STEPS[stepIndex - 1])}>Retour</Button>
          : <span />}
        {step !== 'recap' && (
          <Button disabled={!canContinue} onClick={() => goTo(MOVEMENT_SEND_STEPS[stepIndex + 1])}>Suivant</Button>
        )}
      </footer>
    </div>
  )

  const recap = (
    <MovementSendRecapPanel
      originLabel={originLabel}
      destination={destination}
      destinationLabel={destinationLabel}
      action={action}
      actionLabel={currentActionLabel}
      troops={troops}
      cargo={cargo}
      strategy={strategy}
      durationSeconds={estimate ? estimate.duration : null}
      capacity={capacity}
    />
  )

  if (layout === 'drawer') {
    return (
      <div className="space-y-4">
        {content}
        <div className="border-t border-rust/40 pt-3">{recap}</div>
      </div>
    )
  }

  return <LayoutPage details={recap}>{content}</LayoutPage>
}
