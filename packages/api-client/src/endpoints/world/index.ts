import { Fetcher } from '../../fetcher'
import { WorldGetCellsRequest, WorldGetCellsResponse } from './get-cells'

export class WorldEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  public async getCells(token: string, bounds: WorldGetCellsRequest): Promise<WorldGetCellsResponse> {
    const params = new URLSearchParams({
      min_x: String(bounds.min_x),
      max_x: String(bounds.max_x),
      min_y: String(bounds.min_y),
      max_y: String(bounds.max_y)
    })
    return this.fetcher.get(`/world/cells?${params.toString()}`, { token })
  }
}
