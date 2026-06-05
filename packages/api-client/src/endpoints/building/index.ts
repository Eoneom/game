import { Fetcher } from '../../fetcher'
import {
  BuildingCancelRequest,
  BuildingCancelResponse
} from './cancel'
import {
  BuildingCancelQueuedRequest,
  BuildingCancelQueuedResponse
} from './cancel-queued'
import {
  BuildingGetRequest,
  BuildingGetResponse
} from './get'
import {
  BuildingListRequest,
  BuildingListResponse
} from './list'
import {
  BuildingUpgradeRequest,
  BuildingUpgradeResponse
} from './upgrade'

export class BuildingEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  public async get(token: string, {
    city_id,
    building_code
  }: BuildingGetRequest): Promise<BuildingGetResponse> {
    return this.fetcher.get(`/city/${city_id}/building/${building_code}`, { token })
  }

  public async upgrade(token: string, body: BuildingUpgradeRequest): Promise<BuildingUpgradeResponse> {
    return this.fetcher.put('/building/upgrade', {
      body,
      token
    })
  }

  public async list(token: string, { city_id }: BuildingListRequest): Promise<BuildingListResponse> {
    return this.fetcher.get(`/city/${city_id}/building`, { token })
  }

  public async cancel(token: string, body: BuildingCancelRequest): Promise<BuildingCancelResponse> {
    return this.fetcher.put('/building/cancel', {
      body,
      token
    })
  }

  public async cancelQueued(
    token: string,
    body: BuildingCancelQueuedRequest
  ): Promise<BuildingCancelQueuedResponse> {
    return this.fetcher.put('/building/queue/cancel', {
      body,
      token
    })
  }
}
