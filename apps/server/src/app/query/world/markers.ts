import { GenericQuery } from '#query/generic'
import {
  assertWorldBounds,
  WorldBounds
} from '#app/query/world/bounds'
import {
  DescribedSettlements,
  describeSettlements
} from '#app/query/world/settlements'
import { MAX_MARKER_VIEWPORT_SIDE } from '#core/world/constant/size'

type WorldMarkersQueryRequest = WorldBounds & {
  player_id: string
}

/** Cities and outposts in bounds with the viewer's relation to each and the city size hint (slice 044). */
export class WorldMarkersQuery extends GenericQuery<WorldMarkersQueryRequest, DescribedSettlements> {
  constructor() {
    super({ name: 'world:markers:get' })
  }

  protected async get({
    player_id,
    ...bounds
  }: WorldMarkersQueryRequest): Promise<DescribedSettlements> {
    assertWorldBounds(bounds, MAX_MARKER_VIEWPORT_SIDE)

    const [
      cities,
      outposts
    ] = await Promise.all([
      this.repository.city.listInBounds(bounds),
      this.repository.outpost.listInBounds(bounds)
    ])

    return describeSettlements({
      repository: this.repository,
      viewer_id: player_id,
      cities,
      outposts
    })
  }
}
