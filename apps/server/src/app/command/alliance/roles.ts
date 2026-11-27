import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  emitAllianceUpdated,
  getMembershipOrThrow,
  listMemberIds
} from '#app/command/alliance/shared'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceError } from '#core/alliance/error'
import {
  AllianceAction,
  AllianceService
} from '#core/alliance/service'
import { AllianceMember } from '#core/alliance/type'

/** Another member of the actor's alliance. */
async function getFellowMember({
  actor,
  target_player_id,
}: {
  actor: AllianceMember
  target_player_id: string
}): Promise<AllianceMember> {
  const target = await Factory.getRepository().alliance.findMembership(target_player_id)
  if (!target || target.alliance_id !== actor.alliance_id) {
    throw new Error(AllianceError.NOT_MEMBER)
  }
  if (target.player_id === actor.player_id) {
    throw new Error(AllianceError.FORBIDDEN)
  }
  return target
}

/** The chef promotes a member to officer or demotes an officer to member. */
export async function setAllianceMemberRole({
  player_id,
  target_player_id,
  role,
}: {
  player_id: string
  target_player_id: string
  role: unknown
}): Promise<void> {
  const {
    alliance_id, member_ids 
  } = await runCommand('alliance:member:role', async () => {
    const actor = await getMembershipOrThrow(player_id)
    AllianceService.assertCan({
      role: actor.role,
      action: AllianceAction.SET_ROLE
    })
    const assigned = AllianceService.normalizeAssignableRole(role)
    const target = await getFellowMember({
      actor,
      target_player_id
    })
    await Factory.getRepository().alliance.updateMemberRole({
      player_id: target.player_id,
      role: assigned,
    })
    return {
      alliance_id: actor.alliance_id,
      member_ids: await listMemberIds(actor.alliance_id),
    }
  })

  emitAllianceUpdated({
    alliance_id,
    player_ids: member_ids,
  })
}

/** The chef hands leadership to another member and becomes an officer: exactly one chef at all times. */
export async function transferAllianceLeadership({
  player_id,
  target_player_id,
}: {
  player_id: string
  target_player_id: unknown
}): Promise<void> {
  const {
    alliance_id, member_ids 
  } = await runCommand('alliance:leader:transfer', async () => {
    const repository = Factory.getRepository()
    const actor = await getMembershipOrThrow(player_id)
    AllianceService.assertCan({
      role: actor.role,
      action: AllianceAction.TRANSFER_LEADERSHIP
    })
    const target = await getFellowMember({
      actor,
      target_player_id: typeof target_player_id === 'string' ? target_player_id : ''
    })
    await repository.alliance.updateMemberRole({
      player_id: actor.player_id,
      role: AllianceRole.OFFICIER,
    })
    await repository.alliance.updateMemberRole({
      player_id: target.player_id,
      role: AllianceRole.CHEF,
    })
    return {
      alliance_id: actor.alliance_id,
      member_ids: await listMemberIds(actor.alliance_id),
    }
  })

  emitAllianceUpdated({
    alliance_id,
    player_ids: member_ids,
  })
}
