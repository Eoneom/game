import React from 'react'
import { CombatStrategy, MovementAction, TroopCode, TroopMovementEstimateDataResponse, TroopRole, troop_role } from '@eoneom/api-client'

import { Button } from '#ui/button'
import { EntityThumb } from '#ui/entity-thumb'
import { formatSpeed, formatTime } from '#helpers/transform'
import { useNow } from '#hook/now'
import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import { CombatStrategyLabels } from '#movement/translations'
import { CargoIcons } from '#movement/cargo-icons'
import { formatArrivalClock } from '#movement/clock'
import { formatCellDistance, formatUnitCount, totalUnits } from '#movement/format'
import { MovementSendCargo, SendableAction } from '#movement/send/search'
import { MovementSendSpyPreview } from '#movement/send/spy'
import { MovementCreateWarning } from '#movement/send/warning'

type Troops = { code: TroopCode; count: number }[]
type Estimate = TroopMovementEstimateDataResponse

const percent = (multiplier: number): number => Math.round((multiplier - 1) * 100)

/** « Bonus appliqués » of the estimate: Propulsion tactique, Confederation logistics (slices 027, 039). */
export const appliedBonuses = (modifiers: Estimate['modifiers'], troops: Troops): string[] => {
  const roles = troops.filter(troop => troop.count > 0).map(troop => troop_role[troop.code])
  const has_combat = roles.includes(TroopRole.COMBAT)
  return [
    modifiers.propulsion_level > 0 && has_combat ? `Propulsion tactique niv. ${modifiers.propulsion_level}` : null,
    modifiers.non_combat_speed_multiplier > 1 && !has_combat
      ? `Logistique confédérée : +${percent(modifiers.non_combat_speed_multiplier)} % vitesse`
      : null,
    modifiers.carrier_capacity_multiplier > 1 && roles.includes(TroopRole.CARRIER)
      ? `+${percent(modifiers.carrier_capacity_multiplier)} % capacité des transporteurs`
      : null,
  ].filter((bonus): bonus is string => bonus !== null)
}

/** `duration` is in seconds: the arrival is `now + duration × 1000`. */
export const estimatedArrival = (now: number, duration_seconds: number): number => now + Math.ceil(duration_seconds) * 1000

interface Props {
  orderLine: string
  action: SendableAction
  troops: Troops
  cargo: MovementSendCargo
  strategy: CombatStrategy
  distance: number
  estimate: Estimate | undefined
  espionageLevel: number
  warnings: React.ComponentProps<typeof MovementCreateWarning>
  limitReached: boolean
  sending: boolean
  onSend: () => void
}

const Line: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <li className="flex justify-between gap-3">
    <span className="text-amber-dim">{label}</span>
    <span className="text-right font-mono tabular-nums text-amber">{children}</span>
  </li>
)

/** Step 3 (slice 045): what will leave, when it arrives, and the warnings before « Envoyer ». */
export const MovementSendStepSummary: React.FC<Props> = ({
  orderLine,
  action,
  troops,
  cargo,
  strategy,
  distance,
  estimate,
  espionageLevel,
  warnings,
  limitReached,
  sending,
  onSend,
}) => {
  const now = useNow()
  const bonuses = estimate ? appliedBonuses(estimate.modifiers, troops) : []
  const arrival = estimate ? estimatedArrival(now, estimate.duration) : null

  return (
    <div className="space-y-4">
      <p className="m-0 text-heading text-amber">{orderLine}</p>

      <section className="space-y-1" aria-label="Troupes envoyées">
        <h3 className="m-0 field-label">Troupes · {formatUnitCount(totalUnits(troops))}</h3>
        <ul className="m-0 list-none space-y-1 p-0">
          {troops.map(troop => (
            <li key={troop.code} className="flex items-center gap-2 text-body">
              <EntityThumb src={troopImageSrc(troop.code)} alt="" size="sm" />
              <span className="flex-1 text-amber-dim">{TroopTranslations[troop.code].name}</span>
              <span className="font-mono tabular-nums text-amber">{troop.count}</span>
            </li>
          ))}
        </ul>
      </section>

      {action === MovementAction.TRANSPORT && (
        <p className="m-0 text-body text-amber-dim">Cargaison : <CargoIcons resources={cargo} /></p>
      )}
      {action === MovementAction.ATTACK && (
        <p className="m-0 text-body text-amber-dim">Stratégie : <span className="text-amber">{CombatStrategyLabels[strategy]}</span></p>
      )}

      <section className="space-y-2 rounded-sm border border-amber/30 p-3" aria-label="Estimation">
        <h3 className="m-0 field-label">Estimation</h3>
        {estimate && arrival !== null ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-body">
            <Line label="Distance">{formatCellDistance(distance)}</Line>
            <Line label="Vitesse">{formatSpeed(estimate.speed)}</Line>
            <Line label="Durée">{formatTime(Math.ceil(estimate.duration))}</Line>
            <Line label="Arrivée prévue">
              <time dateTime={new Date(arrival).toISOString()} data-testid="estimated-arrival">
                {formatArrivalClock(arrival, now)}
              </time>
            </Line>
            <Line label="Capacité de transport">{estimate.transport_capacity}</Line>
            {bonuses.length > 0 && <Line label="Bonus appliqués">{bonuses.join(' · ')}</Line>}
          </ul>
        ) : (
          <p className="m-0 text-body text-label">Calcul de l&apos;estimation…</p>
        )}
      </section>

      {action === MovementAction.SPY && (
        <MovementSendSpyPreview espionageLevel={espionageLevel} scoutCount={totalUnits(troops)} />
      )}

      <MovementCreateWarning {...warnings} />

      <Button onClick={onSend} disabled={limitReached || sending} className="w-full">
        Envoyer
      </Button>
    </div>
  )
}
