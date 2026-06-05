import {
  BuildingGetDataResponse,
  BuildingListDataResponse,
  CityGetDataResponse,
  CityListDataResponse,
  CommunicationGetReportDataResponse,
  CommunicationListReportDataResponse,
  OutpostGetDataResponse,
  OutpostListDataResponse,
  TechnologyGetDataResponse,
  TechnologyListDataResponse,
  TroopGetDataResponse,
  TroopGetMovementDataResponse,
  TroopListDataResponse,
  TroopListMovementDataResponse,
  TroopMovementEstimateDataResponse,
  WorldGetSectorDataResponse,
} from '@eoneom/api-client'

export type City = CityGetDataResponse
export type CityItem = CityListDataResponse['cities'][number]

export type Building = BuildingGetDataResponse
export type BuildingItem = BuildingListDataResponse['buildings'][number]
export type BuildingUpgradeQueueItem = BuildingListDataResponse['upgrade_queue'][number]

export type Technology = TechnologyGetDataResponse
export type TechnologyItem = TechnologyListDataResponse['technologies'][number]

export type Sector = WorldGetSectorDataResponse & { id: number }

export type Troop = TroopGetDataResponse
export type TroopItem = TroopListDataResponse['troops'][number]

export type Movement = TroopGetMovementDataResponse
export type MovementItem = TroopListMovementDataResponse['movements'][number]
export type MovementEstimation = TroopMovementEstimateDataResponse

export type Report = CommunicationGetReportDataResponse
export type ReportItem = CommunicationListReportDataResponse['reports'][number]

export type Outpost = OutpostGetDataResponse
export type OutpostItem = OutpostListDataResponse['outposts'][number]
