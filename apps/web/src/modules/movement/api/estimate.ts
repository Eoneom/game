import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { Coordinates, Resource, TroopCode, TroopMovementEstimateDataResponse } from '@eoneom/api-client'

export const estimateMovement = async ({
  token,
  origin,
  destination,
  troopCodes,
  troops,
  resources,
}: {
  token: string
  origin: Coordinates
  destination: Coordinates
  troopCodes: TroopCode[]
  troops?: { code: TroopCode; count: number }[]
  resources?: Resource
}): Promise<TroopMovementEstimateDataResponse | null> => {
  const res = await client.troop.estimateMovement(token, {
    origin,
    destination,
    troop_codes: troopCodes,
    troops,
    resources,
  })
  if (isError(res)) {
    return null
  }

  return res.data ?? null
}
