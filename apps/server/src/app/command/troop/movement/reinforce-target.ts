import { Factory } from '#adapter/factory'
import { AllianceError } from '#core/alliance/error'
import { Coordinates } from '#core/world/value/coordinates'

type ResolvedReinforceTarget = {
  host_player_id: string
  city_id: string
  destination_cell_id: string
}

/**
 * Reinforcement targets (slice 033): a city owned by another member of the player's alliance.
 * Outposts, own cities, cities of non-members and system players (never members) are rejected.
 */
export async function resolveReinforceTarget({
  player_id,
  destination,
}: {
  player_id: string
  destination: Coordinates
}): Promise<ResolvedReinforceTarget> {
  const repository = Factory.getRepository()
  const destination_cell = await repository.cell.getCell({ coordinates: destination })
  const city = await repository.city.searchByCell({ cell_id: destination_cell.id })
  if (!city || city.isOwnedBy(player_id)) {
    throw new Error(AllianceError.INVALID_REINFORCE_TARGET)
  }

  const [
    membership,
    host_membership
  ] = await Promise.all([
    repository.alliance.findMembership(player_id),
    repository.alliance.findMembership(city.player_id),
  ])
  if (!membership || !host_membership || membership.alliance_id !== host_membership.alliance_id) {
    throw new Error(AllianceError.INVALID_REINFORCE_TARGET)
  }

  return {
    host_player_id: city.player_id,
    city_id: city.id,
    destination_cell_id: destination_cell.id,
  }
}
