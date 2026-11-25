import { Fetcher } from '../../fetcher'
import {
  CityGetRequest,
  CityGetResponse
} from './get'
import { CityListResponse } from './list'
import {
  CitySetCombatStrategyRequest,
  CitySetCombatStrategyResponse
} from './set-combat-strategy'
import {
  CitySettleRequest,
  CitySettleResponse
} from './settle'

export class CityEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  get(token: string, { city_id }: CityGetRequest): Promise<CityGetResponse> {
    return this.fetcher.get(`/city/${city_id}`, { token })
  }

  list(token: string): Promise<CityListResponse> {
    return this.fetcher.get('/city', { token })
  }

  setCombatStrategy(
    token: string,
    { city_id, combat_strategy }: CitySetCombatStrategyRequest
  ): Promise<CitySetCombatStrategyResponse> {
    return this.fetcher.put(`/city/${city_id}/combat-strategy`, {
      token,
      body: { combat_strategy }
    })
  }

  settle(token: string, body: CitySettleRequest): Promise<CitySettleResponse> {
    return this.fetcher.post('/city', {
      token,
      body
    })
  }
}
