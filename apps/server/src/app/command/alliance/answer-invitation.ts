import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  addAllianceMember,
  emitAllianceJoined,
  listMemberIds
} from '#app/command/alliance/shared'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceError } from '#core/alliance/error'
import { AllianceService } from '#core/alliance/service'
import { AllianceInvitation } from '#core/alliance/type'
import { now } from '#shared/time'

/** The invited player's pending (not expired) invitation, or `alliance:invitation-not-found`. */
async function getOwnPendingInvitation({
  player_id,
  invitation_id,
  at,
}: {
  player_id: string
  invitation_id: string
  at: number
}): Promise<AllianceInvitation> {
  const invitation = await Factory.getRepository().alliance.findInvitation(invitation_id)
  if (!invitation || invitation.player_id !== player_id || !AllianceService.isInvitationPending({
    invitation,
    now: at
  })) {
    throw new Error(AllianceError.INVITATION_NOT_FOUND)
  }
  return invitation
}

export async function acceptAllianceInvitation({
  player_id,
  invitation_id,
}: {
  player_id: string
  invitation_id: string
}): Promise<{ alliance_id: string }> {
  const {
    alliance_id, member_ids 
  } = await runCommand('alliance:invitation:accept', async () => {
    const repository = Factory.getRepository()
    const accepted_at = now()

    const invitation = await getOwnPendingInvitation({
      player_id,
      invitation_id,
      at: accepted_at,
    })
    const alliance = await repository.alliance.findById(invitation.alliance_id)
    if (!alliance) {
      throw new Error(AllianceError.INVITATION_NOT_FOUND)
    }
    const [
      player,
      membership
    ] = await Promise.all([
      repository.player.get(player_id),
      repository.alliance.findMembership(player_id),
    ])
    AllianceService.assertCanJoin({
      player,
      alliance,
      membership,
      now: accepted_at
    })

    await addAllianceMember({
      alliance,
      player_id,
      role: AllianceRole.MEMBRE,
      now: accepted_at,
    })

    return {
      alliance_id: alliance.id,
      member_ids: await listMemberIds(alliance.id),
    }
  })

  emitAllianceJoined({
    alliance_id,
    player_id,
    member_ids,
  })

  return { alliance_id }
}

export async function refuseAllianceInvitation({
  player_id,
  invitation_id,
}: {
  player_id: string
  invitation_id: string
}): Promise<void> {
  await runCommand('alliance:invitation:refuse', async () => {
    await getOwnPendingInvitation({
      player_id,
      invitation_id,
      at: now(),
    })
    await Factory.getRepository().alliance.deleteInvitation(invitation_id)
  })
}
