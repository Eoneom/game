import { GenericQuery } from '#query/generic'
import {
  PLAYER_SEARCH_MAX_RESULTS,
  PLAYER_SEARCH_MIN_LENGTH
} from '#core/communication/constant/limits'
import { PlayerEntity } from '#core/player/entity'

interface PlayerSearchQueryRequest {
  q: string
}

/** Human players whose name starts with `q` (≥ 2 characters, at most 10), for recipient autocomplete. */
export class PlayerSearchQuery extends GenericQuery<PlayerSearchQueryRequest, PlayerEntity[]> {
  constructor() {
    super({ name: 'player:search' })
  }

  protected async get({ q }: PlayerSearchQueryRequest): Promise<PlayerEntity[]> {
    const prefix = q.trim()
    if (prefix.length < PLAYER_SEARCH_MIN_LENGTH) {
      return []
    }

    return this.repository.player.searchHumansByNamePrefix({
      prefix,
      limit: PLAYER_SEARCH_MAX_RESULTS
    })
  }
}
