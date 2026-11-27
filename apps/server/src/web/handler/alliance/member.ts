import {
  NextFunction,
  Request,
  Response
} from 'express'
import { AllianceMemberActionResponse } from '@eoneom/api-client/src/endpoints/alliance/member'
import { AllianceLeaveResponse } from '@eoneom/api-client/src/endpoints/alliance/create'
import { getPlayerIdFromContext } from '#web/helpers'
import {
  setAllianceMemberRole,
  transferAllianceLeadership
} from '#app/command/alliance/roles'
import {
  kickAllianceMember,
  leaveAlliance
} from '#app/command/alliance/depart'

export const allianceSetRoleHandler = async (
  req: Request,
  res: Response<AllianceMemberActionResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await setAllianceMemberRole({
      player_id,
      target_player_id: String(req.params.player_id ?? ''),
      role: req.body?.role,
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export const allianceTransferLeadershipHandler = async (
  req: Request,
  res: Response<AllianceMemberActionResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await transferAllianceLeadership({
      player_id,
      target_player_id: req.body?.player_id,
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export const allianceKickHandler = async (
  req: Request,
  res: Response<AllianceMemberActionResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await kickAllianceMember({
      player_id,
      target_player_id: String(req.params.player_id ?? ''),
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export const allianceLeaveHandler = async (
  _req: Request,
  res: Response<AllianceLeaveResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await leaveAlliance({ player_id })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}
