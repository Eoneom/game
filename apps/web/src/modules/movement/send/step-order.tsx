import React from 'react'
import classNames from 'classnames'
import { CombatStrategy, MovementAction, TroopCode, TroopRole, troop_role } from '@eoneom/api-client'

import { EntityThumb } from '#ui/entity-thumb'
import { TroopTranslations } from '#troop/translations'
import { troopImageSrc } from '#troop/image'
import { ActionChoice, DestinationKind, NO_ACTION_ON_FRIENDLY, troopRestriction } from '#movement/send/actions'
import { MovementSendCargo, SendableAction, TroopSelection } from '#movement/send/search'
import { MovementSendTroopInput } from '#movement/send/troops/input'
import { MovementSendResources } from '#movement/send/resources'
import { MovementCreateCombatStrategy } from '#movement/send/strategy'

const TroopRoleLabels: Record<TroopRole, string> = {
  [TroopRole.COMBAT]: 'Combat',
  [TroopRole.SCOUT]: 'Éclaireur',
  [TroopRole.CARRIER]: 'Transporteur',
  [TroopRole.FOUNDER]: 'Fondateur',
  [TroopRole.CULTIVATOR]: 'Cultivateur',
  [TroopRole.SALVAGER]: 'Récupérateur',
}

interface Props {
  kind: DestinationKind | undefined
  choices: ActionChoice[]
  action: SendableAction | undefined
  onAction: (action: SendableAction) => void
  /** Available counts at the origin (`count − exchange_reserved`). */
  troops: { code: TroopCode; count: number }[]
  selection: TroopSelection
  onSelectionChange: (selection: TroopSelection) => void
  /** « Les troupes non autorisées pour cet ordre ont été retirées. » after an action change. */
  notice: string | null
  cargo: MovementSendCargo
  cargoMax: MovementSendCargo
  showWater: boolean
  transportCapacity: number
  cargoLoad: number
  onCargoChange: (cargo: MovementSendCargo) => void
  strategy: CombatStrategy
  onStrategyChange: (strategy: CombatStrategy) => void
  blockers: string[]
}

/** Step 2 (slice 045): the action first (what the destination allows), then the troops it accepts. */
export const MovementSendStepOrder: React.FC<Props> = ({
  kind,
  choices,
  action,
  onAction,
  troops,
  selection,
  onSelectionChange,
  notice,
  cargo,
  cargoMax,
  showWater,
  transportCapacity,
  cargoLoad,
  onCargoChange,
  strategy,
  onStrategyChange,
  blockers,
}) => {
  if (kind === 'friendly') {
    return <p className="m-0 text-body text-danger">{NO_ACTION_ON_FRIENDLY}</p>
  }

  const selectable = troops.filter(troop => !troopRestriction(action, troop.code))

  return (
    <div className="space-y-5">
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 px-0 field-label">Ordre</legend>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Ordre">
          {choices.map(choice => {
            const selected = choice.action === action
            const disabled = Boolean(choice.disabled_reason)
            return (
              <label
                key={choice.action}
                title={choice.disabled_reason}
                className={classNames(
                  'flex flex-col gap-1 rounded-sm border px-3 py-2 transition',
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  selected
                    ? 'border-amber bg-chrome text-amber'
                    : 'border-rust/50 text-amber-dim hover:border-rust hover:text-amber'
                )}
              >
                <span className="flex items-center gap-2 text-body">
                  <input
                    type="radio"
                    name="movement_send_action"
                    value={choice.action}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onAction(choice.action)}
                  />
                  {choice.label}
                </span>
                {(choice.disabled_reason ?? choice.hint) && (
                  <span className={classNames('text-caption', disabled ? 'text-danger' : 'text-label')}>
                    {choice.disabled_reason ?? choice.hint}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      </fieldset>

      {action && (
        <section className="space-y-2" aria-label="Troupes">
          <div className="flex items-center justify-between gap-2">
            <h3 className="m-0 field-label">Troupes</h3>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded-sm border border-rust/50 px-2 py-1 text-caption uppercase tracking-wide text-amber-dim hover:border-rust hover:text-amber"
                onClick={() => onSelectionChange(Object.fromEntries(selectable.map(troop => [ troop.code, troop.count ])))}
              >
                Tout
              </button>
              <button
                type="button"
                className="rounded-sm border border-rust/50 px-2 py-1 text-caption uppercase tracking-wide text-amber-dim hover:border-rust hover:text-amber"
                onClick={() => onSelectionChange({})}
              >
                Aucun
              </button>
            </div>
          </div>
          {notice && <p className="m-0 text-meta text-amber" role="status">{notice}</p>}
          {troops.length === 0 ? (
            <p className="m-0 text-body text-amber-dim">Aucune troupe disponible ici.</p>
          ) : (
            <table className="w-full border-collapse text-meta">
              <thead>
                <tr className="text-left text-caption uppercase tracking-wider text-label">
                  <th scope="col" className="px-2 py-1 font-normal"><span className="sr-only">Image</span></th>
                  <th scope="col" className="px-2 py-1 font-normal">Unité</th>
                  <th scope="col" className="px-2 py-1 font-normal">Rôle</th>
                  <th scope="col" className="px-2 py-1 text-right font-normal">Envoyer</th>
                </tr>
              </thead>
              <tbody>
                {troops.map(troop => {
                  const restriction = troopRestriction(action, troop.code)
                  const { name } = TroopTranslations[troop.code]
                  const count = restriction ? 0 : selection[troop.code] ?? 0
                  return (
                    <tr
                      key={troop.code}
                      title={restriction ?? undefined}
                      className={classNames('border-t border-rust/30', restriction ? 'opacity-50' : count > 0 ? 'text-amber' : 'text-amber-dim')}
                    >
                      <td className="px-2 py-1"><EntityThumb src={troopImageSrc(troop.code)} alt="" size="sm" /></td>
                      <td className="px-2 py-1 text-body">{name}</td>
                      <td className="px-2 py-1">{TroopRoleLabels[troop_role[troop.code]]}</td>
                      <td className="px-2 py-1">
                        <span className="flex items-center justify-end gap-2">
                          <MovementSendTroopInput
                            label={name}
                            max={troop.count}
                            value={count}
                            disabled={Boolean(restriction)}
                            onChange={value => onSelectionChange({ ...selection, [troop.code]: value })}
                          />
                          <span className="w-12 text-right font-mono tabular-nums text-label">/ {troop.count}</span>
                          <button
                            type="button"
                            disabled={Boolean(restriction)}
                            aria-label={`${name} : maximum`}
                            className="rounded-sm border border-rust/50 px-2 py-1 text-caption uppercase tracking-wide text-amber-dim hover:border-rust hover:text-amber disabled:cursor-not-allowed"
                            onClick={() => onSelectionChange({ ...selection, [troop.code]: troop.count })}
                          >
                            Max
                          </button>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {action === MovementAction.TRANSPORT && (
        <MovementSendResources
          cargo={cargo}
          max={cargoMax}
          showWater={showWater}
          capacity={transportCapacity}
          usedCapacity={cargoLoad}
          onChange={onCargoChange}
        />
      )}

      {action === MovementAction.ATTACK && (
        <MovementCreateCombatStrategy strategy={strategy} onChange={onStrategyChange} />
      )}

      {blockers.length > 0 && (
        <p className="m-0 text-meta text-label">{blockers[0]}</p>
      )}
    </div>
  )
}
