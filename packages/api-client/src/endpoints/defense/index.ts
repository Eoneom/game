import { Fetcher } from '../../fetcher'
import {
  DefenseBuildRequest,
  DefenseBuildResponse
} from './build'
import {
  DefenseCancelRequest,
  DefenseCancelResponse
} from './cancel'
import {
  DefenseCancelQueuedRequest,
  DefenseCancelQueuedResponse
} from './cancel-queued'
import {
  DefenseListRequest,
  DefenseListResponse
} from './list'

export class DefenseEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  public async list(token: string, { city_id }: DefenseListRequest): Promise<DefenseListResponse> {
    return this.fetcher.get(`/city/${city_id}/defense`, { token })
  }

  public async build(token: string, body: DefenseBuildRequest): Promise<DefenseBuildResponse> {
    return this.fetcher.put('/defense/build', {
      body,
      token
    })
  }

  public async cancel(token: string, body: DefenseCancelRequest): Promise<DefenseCancelResponse> {
    return this.fetcher.put('/defense/cancel', {
      body,
      token
    })
  }

  public async cancelQueued(token: string, body: DefenseCancelQueuedRequest): Promise<DefenseCancelQueuedResponse> {
    return this.fetcher.put('/defense/queue/cancel', {
      body,
      token
    })
  }
}
