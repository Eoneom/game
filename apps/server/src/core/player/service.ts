import { FactionService } from '#core/faction/service'
import { PlayerEntity } from '#core/player/entity'
import { PlayerError } from '#core/player/error'

export class PlayerService {
  static init({
    name,
    faction_code,
    does_player_exist
  }: {
    name: string
    faction_code: string
    does_player_exist: boolean
  }): PlayerEntity {
    if (does_player_exist) {
      throw new Error(PlayerError.ALREADY_EXISTS)
    }

    FactionService.assertKnown(faction_code)

    return PlayerEntity.initPlayer({
      name,
      faction_code
    })
  }
}
