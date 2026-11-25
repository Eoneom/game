export { AppEvent } from '@server-core/events'

export type BattleFinishedEventPayload = {
  player_id: string
  report_id: string
  perspective: 'attacker' | 'defender'
  winner: 'attacker' | 'defender' | 'draw'
}
