import { Fetcher } from '../../fetcher'
import { WorldGetCellsRequest, WorldGetCellsResponse } from './get-cells'
import { WorldTerrainResponse } from './terrain'
import { WorldExplorationResponse } from './exploration'
import { WorldMarkersRequest, WorldMarkersResponse } from './markers'
import { WorldTargetsResponse } from './targets'
import { WorldIntelResponse } from './intel'

const boundsParams = (bounds: WorldMarkersRequest): URLSearchParams => new URLSearchParams({
  min_x: String(bounds.min_x),
  max_x: String(bounds.max_x),
  min_y: String(bounds.min_y),
  max_y: String(bounds.max_y)
})

export class WorldEndpoint {
  private fetcher: Fetcher

  constructor({ fetcher }: { fetcher: Fetcher }) {
    this.fetcher = fetcher
  }

  public async getCells(token: string, bounds: WorldGetCellsRequest): Promise<WorldGetCellsResponse> {
    const params = boundsParams(bounds)
    if (bounds.detail) {
      params.set('detail', bounds.detail)
    }
    return this.fetcher.get(`/world/cells?${params.toString()}`, { token })
  }

  public async getTerrain(token: string): Promise<WorldTerrainResponse> {
    return this.fetcher.get('/world/terrain', { token })
  }

  public async getExploration(token: string): Promise<WorldExplorationResponse> {
    return this.fetcher.get('/world/exploration', { token })
  }

  public async getMarkers(token: string, bounds: WorldMarkersRequest): Promise<WorldMarkersResponse> {
    return this.fetcher.get(`/world/markers?${boundsParams(bounds).toString()}`, { token })
  }

  public async getTargets(token: string): Promise<WorldTargetsResponse> {
    return this.fetcher.get('/world/targets', { token })
  }

  public async getIntel(token: string, coordinates: { x: number, y: number }): Promise<WorldIntelResponse> {
    return this.fetcher.get(`/world/intel?x=${coordinates.x}&y=${coordinates.y}`, { token })
  }
}
