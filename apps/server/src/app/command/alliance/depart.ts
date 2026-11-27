import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import type { AllianceLeftReason } from '#app/event-bus'
import {
  emitAllianceUpdated,
  getMembershipOrThrow,
  listMemberIds
} from '#app/command/alliance/shared'
import {
  emitReinforcementsRecalled,
  returnReinforcementsAmong,
  returnReinforcementsBetween,
  ReturnedReinforcement
} from '#app/command/troop/reinforcement/return-home'
import { AllianceError } from '#core/alliance/error'
import {
  AllianceAction,
  AllianceService
} from '#core/alliance/service'
import { allianceChatChannelKey } from '#core/communication/chat/channel'
import { AppEvent } from '#core/events'
import { now } from '#shared/time'

type Departure = {
  alliance_id: string
  departed_ids: string[]
  remaining_ids: string[]
  reason: AllianceLeftReason
  returned: ReturnedReinforcement[]
}

function emitDeparture({
  alliance_id,
  departed_ids,
  remaining_ids,
  reason,
  returned,
}: Departure): void {
  const event_bus = Factory.getEventBus()
  for (const player_id of departed_ids) {
    event_bus.emit(AppEvent.AllianceLeft, {
      player_id,
      alliance_id,
      reason,
    })
  }
  emitAllianceUpdated({
    alliance_id,
    player_ids: remaining_ids,
  })
  emitReinforcementsRecalled(returned)
}

/** Removes the member and sends reinforcements between them and the remaining members home. */
async function removeMember({
  player_id,
  alliance_id,
  at,
}: {
  player_id: string
  alliance_id: string
  at: number
}): Promise<{ remaining_ids: string[], returned: ReturnedReinforcement[] }> {
  await Factory.getRepository().alliance.removeMember(player_id)
  const remaining_ids = await listMemberIds(alliance_id)
  const returned = await returnReinforcementsBetween({
    player_id,
    other_player_ids: remaining_ids,
    at,
  })
  return {
    remaining_ids,
    returned
  }
}

/** Voluntary departure: starts the 24 h cooldown. The chef must transfer leadership (or dissolve) first. */
export async function leaveAlliance({ player_id }: { player_id: string }): Promise<void> {
  const departure = await runCommand('alliance:leave', async (): Promise<Departure> => {
    const left_at = now()
    const membership = await getMembershipOrThrow(player_id)
    AllianceService.assertCanLeave({ member: membership })

    const {
      remaining_ids, returned
    } = await removeMember({
      player_id,
      alliance_id: membership.alliance_id,
      at: left_at,
    })
    await Factory.getRepository().player.setAllianceLeftAt({
      player_id,
      left_at,
    })

    return {
      alliance_id: membership.alliance_id,
      departed_ids: [ player_id ],
      remaining_ids,
      reason: 'leave',
      returned,
    }
  })

  emitDeparture(departure)
}

/** No cooldown for a kicked member. */
export async function kickAllianceMember({
  player_id,
  target_player_id,
}: {
  player_id: string
  target_player_id: string
}): Promise<void> {
  const departure = await runCommand('alliance:kick', async (): Promise<Departure> => {
    const actor = await getMembershipOrThrow(player_id)
    const target = await Factory.getRepository().alliance.findMembership(target_player_id)
    if (!target || target.alliance_id !== actor.alliance_id) {
      throw new Error(AllianceError.NOT_MEMBER)
    }
    AllianceService.assertCanKick({
      actor,
      target
    })

    const {
      remaining_ids, returned
    } = await removeMember({
      player_id: target.player_id,
      alliance_id: actor.alliance_id,
      at: now(),
    })

    return {
      alliance_id: actor.alliance_id,
      departed_ids: [ target.player_id ],
      remaining_ids,
      reason: 'kick',
      returned,
    }
  })

  emitDeparture(departure)
}

/**
 * The chef dissolves the alliance: every member leaves without cooldown, reinforcements between members
 * go home, and pending invitations, applications and the alliance chat history are deleted.
 */
export async function dissolveAlliance({ player_id }: { player_id: string }): Promise<void> {
  const departure = await runCommand('alliance:dissolve', async (): Promise<Departure> => {
    const repository = Factory.getRepository()
    const membership = await getMembershipOrThrow(player_id)
    AllianceService.assertCan({
      role: membership.role,
      action: AllianceAction.DISSOLVE
    })

    const member_ids = await listMemberIds(membership.alliance_id)
    const returned = await returnReinforcementsAmong({
      player_ids: member_ids,
      at: now(),
    })
    await repository.chat_message.deleteByChannel(allianceChatChannelKey(membership.alliance_id))
    // Cascades to members, invitations and applications.
    await repository.alliance.delete(membership.alliance_id)

    return {
      alliance_id: membership.alliance_id,
      departed_ids: member_ids,
      remaining_ids: [],
      reason: 'dissolve',
      returned,
    }
  })

  emitDeparture(departure)
}
