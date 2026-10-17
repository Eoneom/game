import { Fetcher } from '../../fetcher'
import { TechnologyCancelResponse } from './cancel'
import {
  TechnologyCancelQueuedRequest,
  TechnologyCancelQueuedResponse
} from './cancel-queued'
import {
  TechnologyGetRequest,
  TechnologyGetResponse
} from './get'
import { TechnologyListResponse } from './list'
import {
  TechnologyResearchRequest, TechnologyResearchResponse
} from './research'

export class TechnologyEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  public async research(token: string, body: TechnologyResearchRequest): Promise<TechnologyResearchResponse> {
    return this.fetcher.put('/technology/research', {
      body,
      token
    })
  }

  public async list(token: string): Promise<TechnologyListResponse> {
    return this.fetcher.get('/technology', { token })
  }

  public async get(token: string, body: TechnologyGetRequest): Promise<TechnologyGetResponse> {
    return this.fetcher.get(`/city/${body.city_id}/technology/${body.technology_code}`, { token })
  }

  public async cancel(token: string): Promise<TechnologyCancelResponse> {
    return this.fetcher.put('/technology/cancel', { token })
  }

  public async cancelQueued(
    token: string,
    body: TechnologyCancelQueuedRequest
  ): Promise<TechnologyCancelQueuedResponse> {
    return this.fetcher.put('/technology/queue/cancel', {
      body,
      token
    })
  }
}
