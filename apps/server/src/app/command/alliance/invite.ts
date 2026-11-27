import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { getMembershipOrThrow } from '#app/command/alliance/shared'
import { AllianceError } from '#core/alliance/error'
import {
  AllianceAction,
  AllianceService
} from '#core/alliance/service'
import { AppEvent } from '#core/events'
import { PlayerError } from '#core/player/error'
import { id } from '#shared/identification'
import { now } from '#shared/time'

/**
 * An officer or the chef invites a player by name; the invitation expires after 7 days.
 * Inviting a player who already has a pending invitation from the alliance returns it unchanged.
 * Faction, human and membership are checked again when the player accepts.
 */
export async function inviteToAlliance({
  player_id,
  player_name,
}: {
  player_id: string
  player_name: unknown
}): Promise<{ invitation_id: string }> {
  const result = await runCommand('alliance:invite', async () => {
    const repository = Factory.getRepository()
    const created_at = now()

    const membership = await getMembershipOrThrow(player_id)
    AllianceService.assertCan({
      role: membership.role,
      action: AllianceAction.INVITE
    })

    const name = typeof player_name === 'string' ? player_name.trim() : ''
    if (!name) {
      throw new Error(PlayerError.NOT_FOUND)
    }
    const [
      alliance,
      target
    ] = await Promise.all([
      repository.alliance.get(membership.alliance_id),
      repository.player.getByName(name),
    ])
    if (target.system_controlled) {
      throw new Error(AllianceError.SYSTEM_PLAYER)
    }
    if (target.faction_code !== alliance.faction_code) {
      throw new Error(AllianceError.FACTION_MISMATCH)
    }
    if (await repository.alliance.findMembership(target.id)) {
      throw new Error(AllianceError.ALREADY_MEMBER)
    }

    const existing = await repository.alliance.findPendingInvitation({
      alliance_id: alliance.id,
      player_id: target.id,
      now: created_at,
    })
    if (existing) {
      return {
        invitation_id: existing.id,
        created: null
      }
    }

    const invitation = {
      id: id(),
      alliance_id: alliance.id,
      player_id: target.id,
      invited_by: player_id,
      created_at,
      expires_at: AllianceService.invitationExpiresAt(created_at),
    }
    await repository.alliance.createInvitation(invitation)
    return {
      invitation_id: invitation.id,
      created: invitation
    }
  })

  if (result.created) {
    Factory.getEventBus().emit(AppEvent.AllianceInvitationReceived, {
      player_id: result.created.player_id,
      invitation_id: result.created.id,
      alliance_id: result.created.alliance_id,
    })
  }

  return { invitation_id: result.invitation_id }
}
