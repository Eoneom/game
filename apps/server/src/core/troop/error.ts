export enum TroopError {
  NOT_FOUND = 'troop:not-found',
  ALREADY_IN_PROGRESS = 'troop:already-in-progress',
  NOT_IN_PROGRESS = 'troop:not-in-progress',
  NOT_ENOUGH_TROOPS = 'troop:not-enough-troops',
  NOT_OWNER = 'troop:not-owner',
  MOVEMENT_NOT_OWNER = 'troop:movement:not-owner',
  MOVEMENT_NOT_FOUND = 'troop:movement:not-found',
  MOVEMENT_ACTION_NOT_IMPLEMENTED = 'troop:movement:action-not-implemented',
  TRANSPORT_CAPACITY_EXCEEDED = 'troop:movement:transport-capacity-exceeded',
  TRANSPORT_RESOURCES_REQUIRED = 'troop:movement:transport-resources-required',
  TRANSPORT_RESOURCES_NOT_ALLOWED = 'troop:movement:transport-resources-not-allowed',
  NOT_IN_FACTION_ROSTER = 'troop:not-in-faction-roster',
  MOVEMENT_LIMIT_REACHED = 'troop:movement:limit-reached',
  /** Only a `base` recall to an own city or outpost can start from another player's city (slice 033). */
  MOVEMENT_FOREIGN_ORIGIN = 'troop:movement:foreign-origin',
  QUEUE_FULL = 'troop:queue-full',
  QUEUE_ITEM_NOT_FOUND = 'troop:queue-item-not-found'
}
