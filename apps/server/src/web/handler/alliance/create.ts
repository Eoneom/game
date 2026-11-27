import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  AllianceCreateResponse,
  AllianceDissolveResponse,
  AllianceUpdateDescriptionResponse
} from '@eoneom/api-client/src/endpoints/alliance/create'
import { getPlayerIdFromContext } from '#web/helpers'
import { createAlliance } from '#app/command/alliance/create'
import { updateAllianceDescription } from '#app/command/alliance/update-description'
import { dissolveAlliance } from '#app/command/alliance/depart'

export const allianceCreateHandler = async (
  req: Request,
  res: Response<AllianceCreateResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const { alliance_id } = await createAlliance({
      player_id,
      name: req.body?.name,
      tag: req.body?.tag,
      description: req.body?.description,
    })

    return res.json({
      status: 'ok',
      data: { alliance_id }
    })
  } catch (err) {
    next(err)
  }
}

export const allianceUpdateDescriptionHandler = async (
  req: Request,
  res: Response<AllianceUpdateDescriptionResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await updateAllianceDescription({
      player_id,
      description: req.body?.description,
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export const allianceDissolveHandler = async (
  _req: Request,
  res: Response<AllianceDissolveResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await dissolveAlliance({ player_id })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}
