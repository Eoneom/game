import { MovementAction } from '@eoneom/api-client'

export const MovementActionLabels: Record<MovementAction, string> = {
  [MovementAction.EXPLORE]: 'Explorer',
  [MovementAction.BASE]: 'Baser',
  [MovementAction.TRANSPORT]: 'Transporter',
}
