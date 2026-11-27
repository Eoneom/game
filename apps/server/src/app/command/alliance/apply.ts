import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceError } from '#core/alliance/error'
import { AllianceService } from '#core/alliance/service'
import { AppEvent } from '#core/events'
import { id } from '#shared/identification'
import { now } from '#shared/time'

/**
 * A player applies to an alliance of their faction with an optional message (≤ 500 characters).
 * Applying twice to the same alliance returns the pending application unchanged.
 */
export async function applyToAlliance({
  player_id,
  alliance_id,
  message,
}: {
  player_id: string
  alliance_id: string
  message?: unknown
}): Promise<{ application_id: string }> {
  const result = await runCommand('alliance:apply', async () => {
    const repository = Factory.getRepository()
    const normalized_message = AllianceService.normalizeApplicationMessage(message)

    const [
      alliance,
      player,
      membership
    ] = await Promise.all([
      repository.alliance.get(alliance_id),
      repository.player.get(player_id),
      repository.alliance.findMembership(player_id),
    ])
    if (player.system_controlled) {
      throw new Error(AllianceError.SYSTEM_PLAYER)
    }
    if (player.faction_code !== alliance.faction_code) {
      throw new Error(AllianceError.FACTION_MISMATCH)
    }
    if (membership) {
      throw new Error(AllianceError.ALREADY_MEMBER)
    }

    const existing = await repository.alliance.findApplicationByPlayer({
      alliance_id: alliance.id,
      player_id,
    })
    if (existing) {
      return {
        application_id: existing.id,
        recipients: null
      }
    }

    const application = {
      id: id(),
      alliance_id: alliance.id,
      player_id,
      message: normalized_message,
      created_at: now(),
    }
    await repository.alliance.createApplication(application)

    const members = await repository.alliance.listMembers(alliance.id)
    return {
      application_id: application.id,
      recipients: members
        .filter(member => member.role === AllianceRole.CHEF || member.role === AllianceRole.OFFICIER)
        .map(member => member.player_id),
    }
  })

  if (result.recipients) {
    Factory.getEventBus().emit(AppEvent.AllianceApplicationReceived, {
      player_ids: result.recipients,
      application_id: result.application_id,
      alliance_id,
    })
  }

  return { application_id: result.application_id }
}

/** The applicant withdraws their own application. */
export async function withdrawAllianceApplication({
  player_id,
  application_id,
}: {
  player_id: string
  application_id: string
}): Promise<void> {
  await runCommand('alliance:application:withdraw', async () => {
    const repository = Factory.getRepository()
    const application = await repository.alliance.findApplication(application_id)
    if (!application || application.player_id !== player_id) {
      throw new Error(AllianceError.APPLICATION_NOT_FOUND)
    }
    await repository.alliance.deleteApplication(application.id)
  })
}
