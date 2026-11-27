import { GenericQuery } from '#query/generic'
import {
  TargetIntel,
  toTargetIntel
} from '#app/query/world/target-intel'
import { WORLD_SIZE } from '#core/world/constant/size'
import { WorldError } from '#core/world/error'

interface WorldIntelQueryRequest {
  player_id: string
  x: number
  y: number
}

interface WorldIntelQueryResponse {
  intel: TargetIntel | null
}

const isCoordinate = (value: number): boolean => Number.isInteger(value) && value >= 1 && value <= WORLD_SIZE

/** The viewer's latest successful spy report on one cell (map drawer, slice 044); never another player's reports. */
export class WorldIntelQuery extends GenericQuery<WorldIntelQueryRequest, WorldIntelQueryResponse> {
  constructor() {
    super({ name: 'world:intel:get' })
  }

  protected async get({
    player_id, x, y
  }: WorldIntelQueryRequest): Promise<WorldIntelQueryResponse> {
    if (!isCoordinate(x) || !isCoordinate(y)) {
      throw new Error(WorldError.INVALID_BOUNDS)
    }
    const [ entry ] = await this.repository.report.listLatestSpyIntel({
      player_id,
      coordinates: [
        {
          x,
          y
        }
      ]
    })
    return { intel: entry ? toTargetIntel(entry) : null }
  }
}
