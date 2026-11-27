import { GenericQuery } from '#query/generic'
import { CityEntity } from '#core/city/entity'
import { CityService } from '#core/city/service'
import { CellEntity } from '#core/world/cell/entity'

export interface CityListQueryRequest {
  player_id: string
}

export interface CityListQueryResponse {
  cities: CityEntity[]
  /** Cell of each city, same order as `cities` (coordinates on `GET /city`, slice 045). */
  cells: CellEntity[]
  count_limit: number
}

export class CityListQuery extends GenericQuery<CityListQueryRequest, CityListQueryResponse> {
  constructor() {
    super({ name: 'building:list' })
  }

  protected async get({ player_id }: CityListQueryRequest): Promise<CityListQueryResponse> {
    const cities = await this.repository.city.list({ player_id })
    const cells = await Promise.all(cities.map(city => this.repository.cell.getById(city.cell_id)))

    return {
      cities,
      cells,
      count_limit: CityService.getCountLimit()
    }
  }
}
