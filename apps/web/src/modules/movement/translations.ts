import { CombatStrategy, MovementAction } from '@eoneom/api-client'

export const MovementActionLabels: Record<MovementAction, string> = {
  [MovementAction.EXPLORE]: 'Explorer',
  [MovementAction.BASE]: 'Baser',
  [MovementAction.TRANSPORT]: 'Transporter',
  [MovementAction.ATTACK]: 'Attaquer',
}

export const CombatStrategyLabels: Record<CombatStrategy, string> = {
  [CombatStrategy.BALANCED]: 'Équilibrée',
  [CombatStrategy.OPENING_STRIKE]: 'Frappe d\'ouverture',
  [CombatStrategy.HOLD_THE_LINE]: 'Tenir la ligne',
}
