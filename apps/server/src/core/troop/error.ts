export enum TroopError {
  NOT_FOUND = 'troop:not-found',
  ALREADY_IN_PROGRESS = 'troop:already-in-progress',
  NOT_IN_PROGRESS = 'troop:not-in-progress',
  NOT_ENOUGH_TROOPS = 'troop:not-enough-troops',
  NOT_OWNER = 'troop:not-owner',
  MOVEMENT_NOT_OWNER = 'troop:movement:not-owner',
  MOVEMENT_NOT_FOUND = 'troop:movement:not-found',
  MOVEMENT_NOT_ARRIVED = 'troop:movement:not-arrived',
  MOVEMENT_ACTION_NOT_IMPLEMENTED = 'troop:movement:action-not-implemented'
}
