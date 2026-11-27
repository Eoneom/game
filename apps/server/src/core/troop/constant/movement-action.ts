export enum MovementAction {
  EXPLORE = 'explore',
  BASE = 'base',
  TRANSPORT = 'transport',
  ATTACK = 'attack',
  SPY = 'spy',
  /** Station combat troops in an allied city (slice 033). */
  REINFORCE = 'reinforce',
  /** Faction exchange convoy, created by the system on each fill (slice 035); never counts toward the cap. */
  EXCHANGE = 'exchange',
}
