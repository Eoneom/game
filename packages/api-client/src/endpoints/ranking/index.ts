import { Fetcher } from '../../fetcher'
import {
  RankingListRequest,
  RankingListResponse
} from './list'
import { RankingMeResponse } from './me'

/** Rankings (slice 034). */
export class RankingEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  list(token: string, { category, kind, page }: RankingListRequest): Promise<RankingListResponse> {
    return this.fetcher.get('/ranking', {
      token,
      searchParams: {
        category,
        kind,
        ...(page ? { page } : {})
      }
    })
  }

  me(token: string): Promise<RankingMeResponse> {
    return this.fetcher.get('/ranking/me', { token })
  }
}
