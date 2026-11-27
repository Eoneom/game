import { RequestError } from '@eoneom/api-client'
import { Response } from 'express'
import { Resource } from '#shared/resource'

export const getPlayerIdFromContext = (res: Response): string => {
  const player_id = res.locals.player_id
  if (!player_id) {
    throw new Error(RequestError.PLAYER_ID_NOT_IN_CONTEXT)
  }

  return player_id
}

/** Movement cargo from a request body; an omitted resource (e.g. `water` from an older client) counts as 0. */
export const getResourcesFromBody = (resources: Partial<Resource> | undefined): Resource | undefined => {
  if (!resources) {
    return undefined
  }

  return {
    plastic: resources.plastic ?? 0,
    mushroom: resources.mushroom ?? 0,
    plasma: resources.plasma ?? 0,
    water: resources.water ?? 0,
  }
}
