export { AppEvent } from '@server-core/events'

export type BattleFinishedEventPayload = {
  player_id: string
  report_id: string
  perspective: 'attacker' | 'defender'
  winner: 'attacker' | 'defender' | 'draw'
}

/** Sent to the defender when an attack is launched at them and their `detection` ≥ 1 (slice 030). */
export type MovementIncomingEventPayload = {
  player_id: string
  movement_id: string
  arrive_at: number
}
