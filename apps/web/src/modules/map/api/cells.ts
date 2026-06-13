import { toast } from 'react-toastify'
import { WorldGetCellsDataResponse, WorldGetCellsRequest } from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { translateError } from '#helpers/error-translations'

export const getCells = async ({
  token,
  bounds,
}: {
  token: string
  bounds: WorldGetCellsRequest
}): Promise<WorldGetCellsDataResponse | null> => {
  const res = await client.world.getCells(token, bounds)
  if (isError(res)) {
    toast.error(translateError(res.error_code))
    return null
  }

  return res.data ?? null
}
