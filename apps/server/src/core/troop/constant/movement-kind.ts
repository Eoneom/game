/** Movements page tab of an own movement (slice 045), derived from `exchange_trade_id` and `is_return`. */
export enum MovementKind {
  OUTGOING = 'outgoing',
  RETURN = 'return',
  /** Faction exchange convoy or its carriers' trip home (slice 035). */
  CONVOY = 'convoy',
}
