import { MovementAction, TroopCode, TroopRole, troop_role } from '@eoneom/api-client'

import { MovementActionLabels } from '#movement/translations'
import { isScoutOnlySelection } from '#movement/spy'
import { isCombatOnlySelection } from '#movement/reinforce'
import { SendableAction, TroopSelection, selectedTroopList } from '#movement/send/search'

/**
 * Destination × action matrix and troop rules of the send wizard (slice 045). They mirror the server checks of
 * `createTroopMovement` so the wizard hides or disables what the server would refuse; the server stays the authority.
 */
export type DestinationKind =
  | 'unexplored'
  | 'own_city'
  | 'own_outpost'
  | 'allied_city'
  | 'friendly'
  | 'enemy_city'
  | 'enemy_outpost'
  | 'empty'

const DESTINATION_ACTIONS: Record<DestinationKind, readonly SendableAction[]> = {
  unexplored: [ MovementAction.EXPLORE ],
  // Temporary outpost; attack and spy reach a field stack (stacks are not on the map).
  empty: [ MovementAction.BASE, MovementAction.ATTACK, MovementAction.SPY ],
  own_city: [ MovementAction.BASE, MovementAction.TRANSPORT ],
  own_outpost: [ MovementAction.BASE, MovementAction.TRANSPORT ],
  allied_city: [ MovementAction.REINFORCE ],
  friendly: [],
  enemy_city: [ MovementAction.ATTACK, MovementAction.SPY ],
  enemy_outpost: [ MovementAction.ATTACK, MovementAction.SPY ],
}

export const actionsForDestination = (kind: DestinationKind): readonly SendableAction[] => DESTINATION_ACTIONS[kind]

/** « Baser » takes the labels of the 044 cell menu; list rows keep `MovementActionLabels`. */
export const actionLabel = (action: SendableAction, kind?: DestinationKind): string => {
  if (action === MovementAction.BASE && kind === 'empty') return 'Établir un avant-poste'
  if (action === MovementAction.BASE && (kind === 'own_city' || kind === 'own_outpost')) return 'Stationner'
  return MovementActionLabels[action]
}

export const NO_ACTION_ON_FRIENDLY = 'Aucune action possible : cette case appartient à votre faction.'
export const ESPIONAGE_REQUIRED = 'Recherchez l\'Espionnage pour envoyer des espions.'
const FIELD_STACK_ONLY = 'Seulement si des troupes ennemies s\'y trouvent'

export interface ActionChoice {
  action: SendableAction
  label: string
  /** Shown but not selectable. */
  disabled_reason?: string
  hint?: string
}

export const actionChoices = ({
  kind,
  espionage_level,
}: {
  kind: DestinationKind
  espionage_level: number
}): ActionChoice[] => actionsForDestination(kind).map(action => ({
  action,
  label: actionLabel(action, kind),
  disabled_reason: action === MovementAction.SPY && espionage_level < 1 ? ESPIONAGE_REQUIRED : undefined,
  hint: kind === 'empty' && (action === MovementAction.ATTACK || action === MovementAction.SPY)
    ? FIELD_STACK_ONLY
    : undefined,
}))

/** The action the wizard uses: the requested one when the destination allows it, else the only choice, if any. */
export const resolveAction = ({
  requested,
  kind,
  espionage_level,
}: {
  requested: SendableAction | undefined
  kind: DestinationKind | undefined
  espionage_level: number
}): SendableAction | undefined => {
  if (!kind) return undefined
  const enabled = actionChoices({ kind, espionage_level }).filter(choice => !choice.disabled_reason)
  if (requested && enabled.some(choice => choice.action === requested)) return requested
  return enabled.length === 1 ? enabled[0].action : undefined
}

/** Why a troop cannot join this order (`null` when it can). */
export const troopRestriction = (action: SendableAction | undefined, code: TroopCode): string | null => {
  const role = troop_role[code]
  if (action === MovementAction.ATTACK && role === TroopRole.SCOUT) {
    return 'Les éclaireurs ne peuvent pas attaquer.'
  }
  if (action === MovementAction.SPY && role !== TroopRole.SCOUT) {
    return 'Seuls les éclaireurs peuvent espionner.'
  }
  if (action === MovementAction.REINFORCE && role !== TroopRole.COMBAT) {
    return 'Seules les unités de combat peuvent renforcer.'
  }
  return null
}

/** Keeps the counts of the troops the action allows and zeroes the others. */
export const restrictSelection = (
  selection: TroopSelection,
  action: SendableAction | undefined
): { selection: TroopSelection; removed: boolean } => {
  let removed = false
  const next: TroopSelection = {}
  for (const { code, count } of selectedTroopList(selection)) {
    if (troopRestriction(action, code)) {
      removed = true
    } else {
      next[code] = count
    }
  }
  return { selection: next, removed }
}

/** What still prevents « Suivant » for this order, in the server's check order; empty when it can go. */
export const orderBlockers = ({
  action,
  selection,
  cargo_load,
  transport_capacity,
}: {
  action: SendableAction | undefined
  selection: TroopSelection
  /** Weighted cargo (`resource_transport_weight`). */
  cargo_load: number
  transport_capacity: number
}): string[] => {
  if (!action) return [ 'Choisissez un ordre.' ]
  const troops = selectedTroopList(selection)
  if (troops.length === 0) return [ 'Sélectionnez au moins une unité.' ]
  if (action === MovementAction.ATTACK && !troops.some(troop => troop_role[troop.code] === TroopRole.COMBAT)) {
    return [ 'Une attaque doit compter au moins une unité de combat.' ]
  }
  if (action === MovementAction.SPY && !isScoutOnlySelection(troops)) {
    return [ 'Seuls les éclaireurs peuvent espionner.' ]
  }
  if (action === MovementAction.REINFORCE && !isCombatOnlySelection(troops)) {
    return [ 'Seules les unités de combat peuvent renforcer.' ]
  }
  if (action === MovementAction.TRANSPORT) {
    if (cargo_load <= 0) return [ 'Choisissez des ressources à transporter.' ]
    if (cargo_load > transport_capacity) return [ 'La cargaison dépasse la capacité de transport.' ]
  }
  return []
}
