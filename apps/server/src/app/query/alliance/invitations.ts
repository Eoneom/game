import { GenericQuery } from '#query/generic'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceInvitation } from '#core/alliance/type'
import { now } from '#shared/time'

interface AllianceInvitationListQueryRequest {
  player_id: string
}

type AllianceInvitationItem = {
  invitation: AllianceInvitation
  alliance: AllianceEntity
  invited_by_name: string
}

/** The caller's pending (not expired) invitations, newest first. */
export class AllianceInvitationListQuery extends GenericQuery<AllianceInvitationListQueryRequest, AllianceInvitationItem[]> {
  constructor() {
    super({ name: 'alliance:invitation:list' })
  }

  protected async get({ player_id }: AllianceInvitationListQueryRequest): Promise<AllianceInvitationItem[]> {
    const invitations = await this.repository.alliance.listPendingInvitationsForPlayer({
      player_id,
      now: now(),
    })
    const [
      alliances,
      inviters
    ] = await Promise.all([
      Promise.all(invitations.map(invitation => this.repository.alliance.findById(invitation.alliance_id))),
      this.repository.player.listByIds(invitations.map(invitation => invitation.invited_by)),
    ])
    const inviter_name = new Map(inviters.map(inviter => [
      inviter.id,
      inviter.name
    ]))
    return invitations.flatMap((invitation, index): AllianceInvitationItem[] => {
      const alliance = alliances[index]
      return alliance
        ? [
          {
            invitation,
            alliance,
            invited_by_name: inviter_name.get(invitation.invited_by) ?? '',
          }
        ]
        : []
    })
  }
}
