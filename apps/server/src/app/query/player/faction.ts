import { Factory } from '#adapter/factory'
import { FactionCode } from '#core/faction/constant/code'

/** A Player's Faction never changes, so the WebSocket layer reads it once per connection (slice 032). */
export async function getPlayerFactionCode({ player_id }: { player_id: string }): Promise<FactionCode> {
  const player = await Factory.getRepository().player.get(player_id)
  return player.faction_code
}
