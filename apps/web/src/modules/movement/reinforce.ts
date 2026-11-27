import {
  AllianceMineDataResponse,
  Coordinates,
  TroopCode,
  TroopRole,
  troop_role,
} from '@eoneom/api-client'

/** A reinforcement carries `combat`-role troops only, at least one (slice 033). */
export const isCombatOnlySelection = (troops: { code: TroopCode; count: number }[]): boolean => {
  const sent = troops.filter(troop => troop.count > 0)
  return sent.length > 0 && sent.every(troop => troop_role[troop.code] === TroopRole.COMBAT)
}

/** Whether the destination is a city of another member of the player's alliance. */
const isAlliedCityDestination = ({
  destination,
  myAlliance,
}: {
  destination: Coordinates
  myAlliance: AllianceMineDataResponse | undefined
}): boolean => {
  const alliance = myAlliance?.alliance
  if (!alliance) return false
  return alliance.members
    .filter(member => member.player_id !== myAlliance.viewer_player_id)
    .some(member => member.cities.some(city =>
      city.coordinates.x === destination.x && city.coordinates.y === destination.y
    ))
}

/** "Renforcer" is offered for combat-only selections aimed at an allied city. */
export const isReinforceActionAvailable = ({
  troops,
  destination,
  myAlliance,
}: {
  troops: { code: TroopCode; count: number }[]
  destination: Coordinates
  myAlliance: AllianceMineDataResponse | undefined
}): boolean => isCombatOnlySelection(troops) && isAlliedCityDestination({ destination, myAlliance })
