import { Fetcher } from '../../fetcher'
import {
  OutpostGetRequest,
  OutpostGetResponse
} from './get'
import { OutpostListResponse } from './list'
import {
  OutpostSetCombatStrategyRequest,
  OutpostSetCombatStrategyResponse
} from './set-combat-strategy'
import {
  OutpostSetPermanentRequest,
  OutpostSetPermanentResponse
} from './set-permanent'

export class OutpostEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  get(token: string, body: OutpostGetRequest): Promise<OutpostGetResponse> {
    return this.fetcher.get(`/outpost/${body.outpost_id}`, { token })
  }

  list(token: string): Promise<OutpostListResponse> {
    return this.fetcher.get('/outpost', { token })
  }

  setCombatStrategy(
    token: string,
    { outpost_id, combat_strategy }: OutpostSetCombatStrategyRequest
  ): Promise<OutpostSetCombatStrategyResponse> {
    return this.fetcher.put(`/outpost/${outpost_id}/combat-strategy`, {
      token,
      body: { combat_strategy }
    })
  }

  setPermanent(token: string, body: OutpostSetPermanentRequest): Promise<OutpostSetPermanentResponse> {
    return this.fetcher.put('/outpost/permanent', {
      token,
      body
    })
  }
}
