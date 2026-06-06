import { Fetcher } from '../../fetcher'
import { LocationActivityResponse } from './activity'

export class LocationEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  cityActivity(token: string, city_id: string): Promise<LocationActivityResponse> {
    return this.fetcher.get(`/city/${city_id}/activity`, { token })
  }

  outpostActivity(token: string, outpost_id: string): Promise<LocationActivityResponse> {
    return this.fetcher.get(`/outpost/${outpost_id}/activity`, { token })
  }
}
