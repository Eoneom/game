import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { Coordinates, TroopCode, TroopMovementEstimateDataResponse } from '@eoneom/api-client'

export const estimateMovement = async ({
  token,
  origin,
  destination,
  troopCodes,
  troops,
}: {
  token: string
  origin: Coordinates
  destination: Coordinates
  troopCodes: TroopCode[]
  troops?: { code: TroopCode; count: number }[]
}): Promise<TroopMovementEstimateDataResponse | null> => {
  const res = await client.troop.estimateMovement(token, {
    origin,
    destination,
    troop_codes: troopCodes,
    troops,
  })
  if (isError(res)) {
    return null
  }

  return res.data ?? null
}
