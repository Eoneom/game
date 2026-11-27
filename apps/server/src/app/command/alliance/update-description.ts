import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  emitAllianceUpdated,
  getMembershipOrThrow,
  listMemberIds
} from '#app/command/alliance/shared'
import {
  AllianceAction,
  AllianceService
} from '#core/alliance/service'

export async function updateAllianceDescription({
  player_id,
  description,
}: {
  player_id: string
  description: unknown
}): Promise<void> {
  const {
    alliance_id, member_ids 
  } = await runCommand('alliance:update-description', async () => {
    const membership = await getMembershipOrThrow(player_id)
    AllianceService.assertCan({
      role: membership.role,
      action: AllianceAction.EDIT_DESCRIPTION
    })
    const normalized = AllianceService.normalizeDescription(description)
    await Factory.getRepository().alliance.updateDescription({
      alliance_id: membership.alliance_id,
      description: normalized,
    })
    return {
      alliance_id: membership.alliance_id,
      member_ids: await listMemberIds(membership.alliance_id),
    }
  })

  emitAllianceUpdated({
    alliance_id,
    player_ids: member_ids,
  })
}
