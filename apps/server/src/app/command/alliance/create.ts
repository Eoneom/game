import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import {
  addAllianceMember,
  emitAllianceJoined
} from '#app/command/alliance/shared'
import { AllianceRole } from '#core/alliance/constant/role'
import { AllianceEntity } from '#core/alliance/entity'
import { AllianceError } from '#core/alliance/error'
import { AllianceService } from '#core/alliance/service'
import { id } from '#shared/identification'
import { now } from '#shared/time'

interface CreateAllianceParams {
  player_id: string
  name: unknown
  tag: unknown
  description?: unknown
}

/** Free for a human player without an alliance and out of cooldown; the creator becomes chef. */
export async function createAlliance({
  player_id,
  name,
  tag,
  description,
}: CreateAllianceParams): Promise<{ alliance_id: string }> {
  const alliance = await runCommand('alliance:create', async () => {
    const repository = Factory.getRepository()
    const created_at = now()

    const normalized_name = AllianceService.normalizeName(name)
    const normalized_tag = AllianceService.normalizeTag(tag)
    const normalized_description = AllianceService.normalizeDescription(description)

    const [
      player,
      membership
    ] = await Promise.all([
      repository.player.get(player_id),
      repository.alliance.findMembership(player_id),
    ])
    AllianceService.assertCanCreate({
      player,
      membership,
      now: created_at
    })

    const [
      name_taken,
      tag_taken
    ] = await Promise.all([
      repository.alliance.existsName(AllianceService.nameKey(normalized_name)),
      repository.alliance.existsTag(normalized_tag),
    ])
    if (name_taken) {
      throw new Error(AllianceError.NAME_TAKEN)
    }
    if (tag_taken) {
      throw new Error(AllianceError.TAG_TAKEN)
    }

    const entity = AllianceEntity.create({
      id: id(),
      name: normalized_name,
      tag: normalized_tag,
      description: normalized_description,
      faction_code: player.faction_code,
      created_at,
    })
    await repository.alliance.create(entity)
    await addAllianceMember({
      alliance: entity,
      player_id,
      role: AllianceRole.CHEF,
      now: created_at,
    })
    return entity
  })

  emitAllianceJoined({
    alliance_id: alliance.id,
    player_id,
    member_ids: [ player_id ],
  })

  return { alliance_id: alliance.id }
}
