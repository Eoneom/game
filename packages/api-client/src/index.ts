import { BuildingEndpoint } from './endpoints/building'
import { CityEndpoint } from './endpoints/city'
import { CommunicationEndpoint } from './endpoints/communication'
import { LocationEndpoint } from './endpoints/location'
import { OutpostEndpoint } from './endpoints/outpost'
import { PlayerEndpoint } from './endpoints/player'
import { TechnologyEndpoint } from './endpoints/technology'
import { TroopEndpoint } from './endpoints/troop'
import { WorldEndpoint } from './endpoints/world'
import { Fetcher } from './fetcher'
export { TechnologyCode } from '@server-core/technology/constant/code'
export { BuildingCode } from '@server-core/building/constant/code'
export { BUILDING_UPGRADE_QUEUE_LIMIT } from '@server-core/building/constant/upgrade-queue'
export { CellType } from '@server-core/world/value/cell-type'
export { FactionCode } from '@server-core/faction/constant/code'
export { TroopCode } from '@server-core/troop/constant/code'
export { ReportType } from '@server-core/communication/value/report-type'
export { OutpostType } from '@server-core/outpost/constant/type'
export { MovementAction } from '@server-core/troop/constant/movement-action'
export { resource_transport_weight } from '@server-core/troop/constant/transport-weight'
export { AuthError } from '@server-core/auth/error'
export { BuildingError } from '@server-core/building/error'
export { CityError } from '@server-core/city/error'
export { CommunicationError } from '@server-core/communication/error'
export { FactionError } from '@server-core/faction/error'
export { OutpostError } from '@server-core/outpost/error'
export { PlayerError } from '@server-core/player/error'
export { RequirementError } from '@server-core/requirement/error'
export { ResourceStockError } from '@server-core/resources/resource-stock/error'
export { TechnologyError } from '@server-core/technology/error'
export { TroopError } from '@server-core/troop/error'
export { WorldError } from '@server-core/world/error'
export { RequestError } from './error/request'

export * from './endpoints/shared/coordinates'
export * from './endpoints/shared/resource'
export * from './endpoints'
export * from './events'
export * from './response'

export class Client {
  private fetcher: Fetcher
  public city: CityEndpoint
  public communication: CommunicationEndpoint
  public location: LocationEndpoint
  public outpost: OutpostEndpoint
  public player: PlayerEndpoint
  public building: BuildingEndpoint
  public technology: TechnologyEndpoint
  public troop: TroopEndpoint
  public world: WorldEndpoint

  constructor({ base_url }: { base_url: string }) {
    this.fetcher = new Fetcher({ base_url })

    this.city = new CityEndpoint({ fetcher: this.fetcher })
    this.communication = new CommunicationEndpoint({ fetcher: this.fetcher })
    this.location = new LocationEndpoint({ fetcher: this.fetcher })
    this.outpost = new OutpostEndpoint({ fetcher: this.fetcher })
    this.player = new PlayerEndpoint({ fetcher: this.fetcher })
    this.building = new BuildingEndpoint({ fetcher: this.fetcher })
    this.technology = new TechnologyEndpoint({ fetcher: this.fetcher })
    this.troop = new TroopEndpoint({ fetcher: this.fetcher })
    this.world = new WorldEndpoint({ fetcher: this.fetcher })
  }
}
