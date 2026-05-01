import { Fetcher } from '../../fetcher'
import {
  TroopCancelRequest,
  TroopCancelResponse
} from './cancel'
import { TroopListCityRequest } from './list/city'
import { TroopListMovementResponse } from './movement/list'
import {
  TroopProgressRecruitRequest,
  TroopProgressRecruitResponse
} from './progress-recruit'
import {
  TroopRecruitRequest,
  TroopRecruitResponse
} from './recruit'
import { TroopListOutpostRequest } from './list/outpost'
import { TroopListResponse } from './list/shared'
import {
  TroopGetMovementRequest,
  TroopGetMovementResponse
} from './movement/get'
import {
  TroopMovementEstimateRequest,
  TroopMovementEstimateResponse
} from './movement/estimate'
import {
  TroopMovementCreateResponse,
  TroopMovementCreateRequest
} from './movement/create'
import {
  TroopGetRequest,
  TroopGetResponse
} from './get'

export class TroopEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  public async recruit(token: string, body: TroopRecruitRequest): Promise<TroopRecruitResponse> {
    return this.fetcher.put('/troop/recruit', {
      body,
      token
    })
  }

  public async progressRecruit(token: string, body: TroopProgressRecruitRequest): Promise<TroopProgressRecruitResponse> {
    return this.fetcher.put('/troop/recruit/progress', {
      body,
      token
    })
  }

  public async listCity(token: string, { city_id }: TroopListCityRequest): Promise<TroopListResponse> {
    return this.fetcher.get(`/city/${city_id}/troop`, { token })
  }

  public async listOutpost(token: string, { outpost_id }: TroopListOutpostRequest): Promise<TroopListResponse> {
    return this.fetcher.get(`/outpost/${outpost_id}/troop`, { token })
  }

  public async get(token: string, { troop_id }: TroopGetRequest): Promise<TroopGetResponse> {
    return this.fetcher.get(`/troop/${troop_id}`, { token })
  }

  public async createMovement(token: string, body: TroopMovementCreateRequest): Promise<TroopMovementCreateResponse> {
    return this.fetcher.post('/troop/movement', {
      token,
      body
    })
  }

  public async listMovement(token: string): Promise<TroopListMovementResponse> {
    return this.fetcher.get('/troop/movement', { token })
  }

  public async getMovement(token: string, { movement_id }: TroopGetMovementRequest): Promise<TroopGetMovementResponse> {
    return this.fetcher.get(`/troop/movement/${movement_id}`, { token })
  }

  public async estimateMovement(token: string, body: TroopMovementEstimateRequest): Promise<TroopMovementEstimateResponse> {
    return this.fetcher.post('/troop/movement/estimate', {
      token,
      body
    })
  }

  public async cancel(token: string, body: TroopCancelRequest): Promise<TroopCancelResponse> {
    return this.fetcher.put('/troop/cancel', {
      body,
      token
    })
  }
}
