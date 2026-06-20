import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { bootstrapPlayer } from '#command/player/bootstrap'
import {
  SYSTEM_FIRST_CITY_NAME,
  SYSTEM_PLAYER_FACTION_CODE,
  SYSTEM_PLAYER_NAME
} from '#core/player/constant/system'

export interface EnsureSystemPlayerResult {
  player_id: string
  created: boolean
}

export async function ensureSystemPlayer(): Promise<EnsureSystemPlayerResult> {
  return runCommand('player:ensure-system', async () => {
    const repository = Factory.getRepository()
    const existing = await repository.player.listSystemControlled()
    if (existing.length > 0) {
      return {
        player_id: existing[0].id,
        created: false
      }
    }

    const result = await bootstrapPlayer({
      player_name: SYSTEM_PLAYER_NAME,
      city_name: SYSTEM_FIRST_CITY_NAME,
      faction_code: SYSTEM_PLAYER_FACTION_CODE,
      system_controlled: true
    })

    return {
      player_id: result.player_id,
      created: true
    }
  })
}
