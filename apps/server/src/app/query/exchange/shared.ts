import { Factory } from '#adapter/factory'
import { ExchangeError } from '#core/exchange/error'
import {
  ExchangeResource,
  isExchangeResource
} from '#core/exchange/value/resource'
import { FactionCode } from '#core/faction/constant/code'

/** Books are faction-scoped: the caller's faction and a known resource. */
export async function resolveExchangeBook({
  player_id,
  resource
}: {
  player_id: string
  resource: unknown
}): Promise<{ faction_code: FactionCode, resource: ExchangeResource }> {
  if (!isExchangeResource(resource)) {
    throw new Error(ExchangeError.RESOURCE_INVALID)
  }
  const player = await Factory.getRepository().player.get(player_id)
  return {
    faction_code: player.faction_code,
    resource
  }
}
