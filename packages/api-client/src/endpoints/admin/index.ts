import { Fetcher } from '../../fetcher'
import { AdminSystemPlayerObservabilityResponse } from './system-player-observability'

export class AdminEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  getSystemPlayerObservability(token: string): Promise<AdminSystemPlayerObservabilityResponse> {
    return this.fetcher.get('/admin/system-player-observability', { token })
  }
}
