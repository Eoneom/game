import { Factory } from '#adapter/factory'
import { AdminAccessService } from '#core/admin/service'
import { PlayerEntity } from '#core/player/entity'

export async function isObservabilityAdmin({ player_id }: { player_id: string }): Promise<boolean> {
  const allowlist = Factory.getAdminPlayerNames()
  if (allowlist.length === 0) {
    return false
  }

  const player = await Factory.getRepository().player.get(player_id)
  return AdminAccessService.isAllowlistedPlayerName({
    player_name: player.name,
    allowlist,
  })
}

export async function listSystemControlledPlayersForObservability(): Promise<Pick<PlayerEntity, 'id' | 'name'>[]> {
  const players = await Factory.getRepository().player.listSystemControlled()
  return players.map(player => ({
    id: player.id,
    name: player.name,
  }))
}
