import { Factory } from '#adapter/factory'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceError } from '#core/alliance/error'
import { AllianceMember } from '#core/alliance/type'
import { AppEvent } from '#core/events'

export async function getMembershipOrThrow(player_id: string): Promise<AllianceMember> {
  const membership = await Factory.getRepository().alliance.findMembership(player_id)
  if (!membership) {
    throw new Error(AllianceError.NOT_MEMBER)
  }
  return membership
}

export async function listMemberIds(alliance_id: string): Promise<string[]> {
  const members = await Factory.getRepository().alliance.listMembers(alliance_id)
  return members.map(member => member.player_id)
}

/** Adds the member and cancels the player's other pending invitations and applications. */
export async function addAllianceMember({
  alliance,
  player_id,
  role,
  now,
}: {
  alliance: AllianceEntity
  player_id: string
  role: AllianceRole
  now: number
}): Promise<void> {
  const repository = Factory.getRepository()
  await repository.alliance.addMember({
    alliance_id: alliance.id,
    player_id,
    role,
    joined_at: now,
  })
  await Promise.all([
    repository.alliance.deleteInvitationsForPlayer(player_id),
    repository.alliance.deleteApplicationsForPlayer(player_id),
  ])
}

export function emitAllianceUpdated({
  alliance_id,
  player_ids,
}: {
  alliance_id: string
  player_ids: string[]
}): void {
  if (player_ids.length === 0) {
    return
  }
  Factory.getEventBus().emit(AppEvent.AllianceUpdated, {
    alliance_id,
    player_ids,
  })
}

/** `alliance:joined` to the new member and `alliance:updated` to every member. */
export function emitAllianceJoined({
  alliance_id,
  player_id,
  member_ids,
}: {
  alliance_id: string
  player_id: string
  member_ids: string[]
}): void {
  Factory.getEventBus().emit(AppEvent.AllianceJoined, {
    player_id,
    alliance_id,
  })
  emitAllianceUpdated({
    alliance_id,
    player_ids: member_ids,
  })
}
