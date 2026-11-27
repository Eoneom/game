import {
  NextFunction,
  Request,
  Response
} from 'express'
import {
  AllianceAnswerInvitationResponse,
  AllianceInvitationListResponse,
  AllianceInviteResponse
} from '@eoneom/api-client/src/endpoints/alliance/invitation'
import { getPlayerIdFromContext } from '#web/helpers'
import { inviteToAlliance } from '#app/command/alliance/invite'
import {
  acceptAllianceInvitation,
  refuseAllianceInvitation
} from '#app/command/alliance/answer-invitation'
import { AllianceInvitationListQuery } from '#query/alliance/invitations'

export const allianceInviteHandler = async (
  req: Request,
  res: Response<AllianceInviteResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const { invitation_id } = await inviteToAlliance({
      player_id,
      player_name: req.body?.player_name,
    })

    return res.json({
      status: 'ok',
      data: { invitation_id }
    })
  } catch (err) {
    next(err)
  }
}

export const allianceListInvitationHandler = async (
  _req: Request,
  res: Response<AllianceInvitationListResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    const items = await new AllianceInvitationListQuery().run({ player_id })

    return res.json({
      status: 'ok',
      data: {
        invitations: items.map(({
          invitation, alliance, invited_by_name
        }) => ({
          id: invitation.id,
          alliance: {
            id: alliance.id,
            name: alliance.name,
            tag: alliance.tag,
          },
          invited_by: {
            id: invitation.invited_by,
            name: invited_by_name,
          },
          created_at: invitation.created_at,
          expires_at: invitation.expires_at,
        }))
      }
    })
  } catch (err) {
    next(err)
  }
}

export const allianceAcceptInvitationHandler = async (
  req: Request,
  res: Response<AllianceAnswerInvitationResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await acceptAllianceInvitation({
      player_id,
      invitation_id: String(req.params.invitation_id ?? ''),
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}

export const allianceRefuseInvitationHandler = async (
  req: Request,
  res: Response<AllianceAnswerInvitationResponse>,
  next: NextFunction
) => {
  try {
    const player_id = getPlayerIdFromContext(res)
    await refuseAllianceInvitation({
      player_id,
      invitation_id: String(req.params.invitation_id ?? ''),
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    next(err)
  }
}
