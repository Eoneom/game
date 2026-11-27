import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  AllianceApplicationActionResponse,
  AllianceApplicationListResponse,
  AllianceApplyResponse
} from '@eoneom/api-client/src/endpoints/alliance/application'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  applyToAlliance,
  withdrawAllianceApplication
} from '#app/command/alliance/apply'
import {
  acceptAllianceApplication,
  refuseAllianceApplication
} from '#app/command/alliance/answer-application'
import { AllianceApplicationListQuery } from '#query/alliance/applications'

export const allianceApplyHandler = async (
  req: Request,
  res: Response<AllianceApplyResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const { application_id } = await applyToAlliance({
      player_id,
      alliance_id: String(req.params.alliance_id ?? ''),
      message: req.body?.message,
    })

    return res.json({
      status: 'ok',
      data: { application_id }
    })
  } catch (err) {
    next(err)
  }
}

export const allianceListApplicationHandler = async (
  _req: Request,
  res: Response<AllianceApplicationListResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const {
      received, sent
    } = await new AllianceApplicationListQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: {
        received: received.map(({
          application, player_name
        }) => ({
          id: application.id,
          player: {
            id: application.player_id,
            name: player_name,
          },
          message: application.message,
          created_at: application.created_at,
        })),
        sent: sent.map(({
          application, alliance
        }) => ({
          id: application.id,
          alliance: {
            id: alliance.id,
            name: alliance.name,
            tag: alliance.tag,
          },
          message: application.message,
          created_at: application.created_at,
        })),
      }
    })
  } catch (err) {
    next(err)
  }
}

export const allianceAcceptApplicationHandler = async (
  req: Request,
  res: Response<AllianceApplicationActionResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await acceptAllianceApplication({
      player_id,
      application_id: String(req.params.application_id ?? ''),
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export const allianceRefuseApplicationHandler = async (
  req: Request,
  res: Response<AllianceApplicationActionResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await refuseAllianceApplication({
      player_id,
      application_id: String(req.params.application_id ?? ''),
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export const allianceWithdrawApplicationHandler = async (
  req: Request,
  res: Response<AllianceApplicationActionResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await withdrawAllianceApplication({
      player_id,
      application_id: String(req.params.application_id ?? ''),
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}
